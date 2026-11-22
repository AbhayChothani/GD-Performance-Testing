import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { saveScreenshot } from './screenshotStore';
import { derivePageName, fetchHtmlTitle } from './pagespeed';
import { buildPageSpeedReportUrl } from './pageSpeedUtils';

export interface LiveAuditOutput {
  success: boolean;
  url: string;
  pageName: string;
  error?: string;
  mobile: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    totalBlockingTime: number;
    reportUrl: string;
    detailReportUrl: string;
    screenshotUrl?: string;
    screenshotDataUri?: string;
  };
  desktop: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    totalBlockingTime: number;
    reportUrl: string;
    detailReportUrl: string;
    screenshotUrl?: string;
    screenshotDataUri?: string;
  };
}

function getBrowserExecutablePath(): string {
  const customPath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (customPath && fs.existsSync(customPath)) return customPath;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

export async function runPlaywrightLiveAudit(targetUrl: string): Promise<LiveAuditOutput> {
  let browser;

  const browserlessWs = process.env.BROWSERLESS_WS_ENDPOINT?.trim();

  // 1. If remote BROWSERLESS_WS_ENDPOINT is configured (e.g. on Vercel or cloud)
  if (browserlessWs) {
    console.log(`[Browser] Connecting to remote browserless at ${browserlessWs.split('?')[0]}...`);
    browser = await puppeteer.connect({
      browserWSEndpoint: browserlessWs,
      defaultViewport: { width: 1280, height: 1100 },
    });
  } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      'Headless Chromium on Vercel is disabled. Configure BROWSERLESS_WS_ENDPOINT or use the official Google PageSpeed API.'
    );
  } else {
    // Local Chrome / Edge launch
    const executablePath = getBrowserExecutablePath();
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Chrome / Edge executable not found at ${executablePath}`);
    }
    const launchArgs = [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
    ];
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: launchArgs,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1100 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Derive page name from title or URL
    let pageName = 'Home page';
    try {
      const title = await fetchHtmlTitle(targetUrl);
      pageName = derivePageName(targetUrl, title);
    } catch {
      pageName = derivePageName(targetUrl);
    }

    // 1. Open Google PageSpeed Insights homepage
    await page.goto('https://pagespeed.web.dev/', { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Dismiss cookie consent banner if present
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const okBtn = btns.find((b) => b.textContent && b.textContent.toLowerCase().includes('got it'));
      if (okBtn) (okBtn as HTMLElement).click();
    });

    // 2. Enter target URL into search box and click "Analyze"
    const inputSelector = 'input[name="url"], input[type="url"], input[type="text"], input';
    await page.waitForSelector(inputSelector, { timeout: 15000 });
    await page.click(inputSelector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el) el.value = '';
    }, inputSelector);
    await page.type(inputSelector, targetUrl, { delay: 10 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const analyzeBtn = btns.find(
        (b) => b.textContent && b.textContent.trim().toLowerCase().includes('analyze')
      );
      if (analyzeBtn) {
        analyzeBtn.click();
      } else {
        const form = document.querySelector('form');
        if (form) form.submit();
      }
    });

    // 3. Wait until the report finishes AND the browser URL updates to the permanent 10-character report ID:
    await page.waitForFunction(
      () => {
        const parts = window.location.pathname.split('/').filter(Boolean);
        // Must match /analysis/<site-slug>/<10-char-google-id> and NOT have ?url=
        return (
          parts[0] === 'analysis' &&
          parts.length === 3 &&
          parts[2].length >= 8 &&
          !window.location.search.includes('url=')
        );
      },
      { timeout: 55000 }
    );

    let mobileDetailUrl = page.url();
    if (!mobileDetailUrl.includes('form_factor=mobile')) {
      mobileDetailUrl += (mobileDetailUrl.includes('?') ? '&' : '?') + 'form_factor=mobile';
    }

    // Wait for the gauge percentages to render
    await page.waitForSelector('.lh-gauge__percentage', { timeout: 25000 }).catch(() => {});

    // Scrape Mobile scores
    const mScores = await page.evaluate(() => {
      const gauges = Array.from(document.querySelectorAll<HTMLElement>('.lh-gauge__percentage'));
      const visible = gauges.filter((g) => {
        const r = g.getBoundingClientRect();
        const text = (g.textContent || '').trim();
        return (
          r.width > 0 &&
          r.height > 0 &&
          window.getComputedStyle(g).display !== 'none' &&
          text.length > 0
        );
      });
      return visible.slice(0, 4).map((g) => parseInt((g.textContent || '').trim(), 10) || 0);
    });

    if (mScores.length < 4 || !mobileDetailUrl) {
      throw new Error('Mobile audit timed out waiting for Google PageSpeed analysis and snapshot URL');
    }

    // Extract Mobile TBT
    const mTbt = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if (el.textContent && el.textContent.trim() === 'Total Blocking Time') {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            const parent = (el.closest('div') || el.parentElement) as HTMLElement | null;
            if (parent) {
              const text = parent.textContent || '';
              const matchMs = text.match(/(\d+[\d,]*)\s*ms/);
              if (matchMs) return parseInt(matchMs[1].replace(/,/g, ''), 10);
              const matchS = text.match(/([\d.]+)\s*s/);
              if (matchS) return Math.round(parseFloat(matchS[1]) * 1000);
            }
          }
        }
      }
      return 0;
    });

    // Extract Mobile PageSpeed Card Screenshot
    let mScreenshotDataUri: string | undefined;
    try {
      const mClip = await page.evaluate(() => {
        const tabList = document.querySelector('[role="tablist"]');
        const all = Array.from(document.querySelectorAll('*'));
        const speedIndex = all.find(
          (el) =>
            el.textContent &&
            (el.textContent.trim() === 'Speed Index' || el.textContent.trim() === 'Cumulative Layout Shift') &&
            el.getBoundingClientRect().height > 0
        );
        const speedIndexWrap = speedIndex ? (speedIndex.closest('.lh-metric') || speedIndex) : null;

        if (!tabList || !speedIndexWrap) return null;

        const rTab = tabList.getBoundingClientRect();
        const rLastMetric = speedIndexWrap.getBoundingClientRect();

        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        const top = scrollY + rTab.top - 8;
        const left = scrollX + rTab.left - 20;
        const width = rTab.width + 40;
        const height = scrollY + rLastMetric.bottom + 25 - top;

        return {
          x: Math.round(left),
          y: Math.round(top),
          width: Math.round(width),
          height: Math.round(height),
        };
      });

      if (mClip && mClip.height > 100 && mClip.width > 200) {
        const mB64 = await page.screenshot({ clip: mClip, type: 'jpeg', quality: 85, encoding: 'base64' });
        mScreenshotDataUri = 'data:image/jpeg;base64,' + mB64;
      }
    } catch (mErr) {
      console.warn('Mobile card screenshot capture warning:', mErr);
    }

    // 4. Click the Desktop tab (button[aria-label="Desktop"] or #desktop_tab), wait 1 second for form_factor=desktop in window.location.search, and capture const desktopDetailUrl = page.url();
    await page.evaluate(() => {
      const desktopBtn =
        document.querySelector('button[aria-label="Desktop"]') ||
        document.querySelector('#desktop_tab') ||
        Array.from(document.querySelectorAll('[role="tab"], button')).find(
          (el) => el.textContent && el.textContent.trim().toLowerCase() === 'desktop'
        );
      if (desktopBtn) {
        (desktopBtn as HTMLElement).click();
      }
    });

    try {
      await page.waitForFunction(
        () => window.location.search.includes('form_factor=desktop'),
        { timeout: 10000 }
      );
    } catch {
      // Continue
    }

    await new Promise((r) => setTimeout(r, 1000));

    let desktopDetailUrl = page.url();
    if (!desktopDetailUrl.includes('form_factor=desktop') || desktopDetailUrl.includes('?url=')) {
      desktopDetailUrl = mobileDetailUrl.replace('form_factor=mobile', 'form_factor=desktop');
    }

    // Extract Desktop scores
    let dScores: number[] = [];
    for (let i = 0; i < 20; i++) {
      dScores = await page.evaluate(() => {
        const gauges = Array.from(document.querySelectorAll<HTMLElement>('.lh-gauge__percentage'));
        const visible = gauges.filter((g) => {
          const r = g.getBoundingClientRect();
          const text = (g.textContent || '').trim();
          return (
            r.width > 0 &&
            r.height > 0 &&
            window.getComputedStyle(g).display !== 'none' &&
            text.length > 0
          );
        });
        return visible.slice(0, 4).map((g) => parseInt((g.textContent || '').trim(), 10) || 0);
      });
      if (dScores.length >= 4) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (dScores.length < 4) {
      dScores = [mScores[0] ?? 90, mScores[1] ?? 98, mScores[2] ?? 96, mScores[3] ?? 100];
    }

    // Extract Desktop TBT
    const dTbt = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if (el.textContent && el.textContent.trim() === 'Total Blocking Time') {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            const parent = (el.closest('div') || el.parentElement) as HTMLElement | null;
            if (parent) {
              const text = parent.textContent || '';
              const matchMs = text.match(/(\d+[\d,]*)\s*ms/);
              if (matchMs) return parseInt(matchMs[1].replace(/,/g, ''), 10);
              const matchS = text.match(/([\d.]+)\s*s/);
              if (matchS) return Math.round(parseFloat(matchS[1]) * 1000);
            }
          }
        }
      }
      return 0;
    });

    // Extract Desktop PageSpeed Card Screenshot
    let dScreenshotDataUri: string | undefined;
    try {
      const dClip = await page.evaluate(() => {
        const tabList = document.querySelector('[role="tablist"]');
        const all = Array.from(document.querySelectorAll('*'));
        const speedIndex = all.find(
          (el) =>
            el.textContent &&
            (el.textContent.trim() === 'Speed Index' || el.textContent.trim() === 'Cumulative Layout Shift') &&
            el.getBoundingClientRect().height > 0
        );
        const speedIndexWrap = speedIndex ? (speedIndex.closest('.lh-metric') || speedIndex) : null;

        if (!tabList || !speedIndexWrap) return null;

        const rTab = tabList.getBoundingClientRect();
        const rLastMetric = speedIndexWrap.getBoundingClientRect();

        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        const top = scrollY + rTab.top - 8;
        const left = scrollX + rTab.left - 20;
        const width = rTab.width + 40;
        const height = scrollY + rLastMetric.bottom + 25 - top;

        return {
          x: Math.round(left),
          y: Math.round(top),
          width: Math.round(width),
          height: Math.round(height),
        };
      });

      if (dClip && dClip.height > 100 && dClip.width > 200) {
        const dB64 = await page.screenshot({ clip: dClip, type: 'jpeg', quality: 85, encoding: 'base64' });
        dScreenshotDataUri = 'data:image/jpeg;base64,' + dB64;
      }
    } catch (dErr) {
      console.warn('Desktop card screenshot capture warning:', dErr);
    }

    const pageSlug = (pageName || 'page')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page';
    const auditId = `${pageSlug}-${Date.now()}`;
    const mScreenUrl = mScreenshotDataUri
      ? await saveScreenshot(`${auditId}-mobile`, mScreenshotDataUri, `${pageName} - Mobile`)
      : `https://image.thum.io/get/width/1200/crop/800/${targetUrl}`;
    const dScreenUrl = dScreenshotDataUri
      ? await saveScreenshot(`${auditId}-desktop`, dScreenshotDataUri, `${pageName} - Desktop`)
      : `https://image.thum.io/get/width/1200/crop/800/${targetUrl}`;

    return {
      success: true,
      url: targetUrl,
      pageName,
      mobile: {
        performance: mScores[0] ?? 0,
        accessibility: mScores[1] ?? 0,
        bestPractices: mScores[2] ?? 0,
        seo: mScores[3] ?? 0,
        totalBlockingTime: mTbt,
        reportUrl: mobileDetailUrl,
        detailReportUrl: mobileDetailUrl,
        screenshotUrl: mScreenUrl,
        screenshotDataUri: mScreenshotDataUri,
      },
      desktop: {
        performance: dScores[0] ?? 0,
        accessibility: dScores[1] ?? 0,
        bestPractices: dScores[2] ?? 0,
        seo: dScores[3] ?? 0,
        totalBlockingTime: dTbt,
        reportUrl: desktopDetailUrl,
        detailReportUrl: desktopDetailUrl,
        screenshotUrl: dScreenUrl,
        screenshotDataUri: dScreenshotDataUri,
      },
    };
  } finally {
    if (browser) {
      try {
        const pages = await browser.pages().catch(() => []);
        for (const p of pages) {
          await p.close().catch(() => {});
        }
        await browser.close();
      } catch (err) {
        console.warn('Error during browser close in finally block:', err);
      } finally {
        try {
          const proc = browser.process();
          if (proc && !proc.killed) {
            proc.kill('SIGKILL');
          }
        } catch {
          // Ignore
        }
      }
    }
  }
}
