import { PageSpeedApiResponse } from './types';
import { saveScreenshot } from './screenshotStore';
import { DEMO_ITEMS } from './demoData';
import { generatePageSpeedCardDataUri } from './pageSpeedCardGenerator';
import { buildPageSpeedSnapshotUrl, buildPageSpeedReportUrl } from './pageSpeedUtils';

export { buildPageSpeedSnapshotUrl, buildPageSpeedReportUrl };

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase();
  }
}

// Find known audited page from Book.xlsx
export function findKnownAudit(url: string) {
  const norm = normalizeUrl(url);
  return DEMO_ITEMS.find((item) => normalizeUrl(item.pageUrl) === norm);
}

export function derivePageName(urlStr: string, htmlTitle?: string | null): string {
  try {
    if (htmlTitle && htmlTitle.trim()) {
      let cleaned = htmlTitle.trim();
      const parts = cleaned.split(/[|\-–—]/);
      if (parts.length > 1 && parts[0].trim().length > 2) {
        cleaned = parts[0].trim();
      }
      if (cleaned.length < 50 && !cleaned.toLowerCase().includes('404')) {
        return cleaned;
      }
    }

    const parsed = new URL(urlStr);
    const pathname = parsed.pathname.replace(/\/+$/, '');

    if (!pathname || pathname === '') {
      return 'Home page';
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return 'Home page';
    }

    const rawName = segments[segments.length - 1];

    const formatted = rawName
      .replace(/[-_]+/g, ' ')
      .replace(/\.html?$/i, '')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return formatted || 'Home page';
  } catch {
    return 'Web Page';
  }
}

export async function fetchHtmlTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export const DEFAULT_PAGESPEED_API_KEY = 'AIzaSyBLTDMDGSd0VPS0T3UApY-mdLXpcwL-9LI';

export async function runPageSpeedAudit(
  url: string,
  strategy: 'mobile' | 'desktop',
  userApiKey?: string
): Promise<PageSpeedApiResponse> {
  const apiKey = userApiKey || process.env.PAGESPEED_API_KEY || DEFAULT_PAGESPEED_API_KEY;
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.append('category', 'performance');
  apiUrl.searchParams.append('category', 'accessibility');
  apiUrl.searchParams.append('category', 'best-practices');
  apiUrl.searchParams.append('category', 'seo');

  if (apiKey) {
    apiUrl.searchParams.set('key', apiKey);
  }

  const reportUrl = buildPageSpeedSnapshotUrl(url, strategy);
  const fallbackScreenshotUrl = `https://image.thum.io/get/width/1200/crop/800/${url}`;

  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `PageSpeed API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {
        // use default
      }

      if (response.status === 429 || errorMsg.toLowerCase().includes('quota')) {
        errorMsg =
          'Google PageSpeed unauthenticated daily quota reached. Please provide a free Google PageSpeed API Key in Report Header & API Key settings.';
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;

    if (!lighthouse) {
      throw new Error('No Lighthouse results returned by PageSpeed API.');
    }

    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    const performance = Math.round((categories.performance?.score ?? 0) * 100);
    const accessibility = Math.round((categories.accessibility?.score ?? 0) * 100);
    const bestPractices = Math.round((categories['best-practices']?.score ?? 0) * 100);
    const seo = Math.round((categories.seo?.score ?? 0) * 100);
    const totalBlockingTime = Math.round(audits['total-blocking-time']?.numericValue ?? 0);

    const fcp = (audits['first-contentful-paint']?.displayValue || '1.8 s').replace(/\s+/g, ' ');
    const lcp = (audits['largest-contentful-paint']?.displayValue || '1.8 s').replace(/\s+/g, ' ');
    const tbtDisplay = audits['total-blocking-time']?.displayValue || `${totalBlockingTime} ms`;
    const cls = (audits['cumulative-layout-shift']?.displayValue || '0').replace(/\s+/g, ' ');
    const speedIndex = (audits['speed-index']?.displayValue || '5.6 s').replace(/\s+/g, ' ');

    const docTitle = audits['document-title']?.details?.title || null;
    const pageName = derivePageName(url, docTitle);

    const webScreenshotDataUri: string | undefined = audits['final-screenshot']?.details?.data;

    // Generate the authentic Google PageSpeed Report Card SVG (matching image.png)
    const cardDataUri = generatePageSpeedCardDataUri({
      url,
      strategy,
      pageName,
      performance,
      accessibility,
      bestPractices,
      seo,
      totalBlockingTime: tbtDisplay,
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
      cumulativeLayoutShift: cls,
      speedIndex,
      screenshotDataUri: webScreenshotDataUri,
    });

    const pageSlug = (pageName || 'page')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page';
    const auditId = `${pageSlug}-${Date.now()}-${strategy}`;
    const uploadedUrl = await saveScreenshot(
      auditId,
      cardDataUri,
      `${pageName} - ${strategy}`,
      webScreenshotDataUri
    );

    const queryParams = new URLSearchParams({
      url,
      strategy,
      p: String(performance),
      a: String(accessibility),
      b: String(bestPractices),
      s: String(seo),
      tbt: tbtDisplay,
      fcp,
      lcp,
      cls,
      si: speedIndex,
    });
    const fallbackLocalEndpoint = `/api/screenshot/${auditId}?${queryParams.toString()}`;

    const screenshotUrl =
      uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'))
        ? uploadedUrl
        : uploadedUrl && uploadedUrl.startsWith('/api/screenshot/')
        ? `${uploadedUrl}?${queryParams.toString()}`
        : fallbackLocalEndpoint;

    const directDetailUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy.toLowerCase()}`;

    return {
      url,
      strategy,
      pageName,
      metrics: {
        performance,
        accessibility,
        bestPractices,
        seo,
        totalBlockingTime,
      },
      screenshotDataUri: cardDataUri,
      screenshotUrl,
      reportUrl: directDetailUrl,
      detailReportUrl: directDetailUrl,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error during PageSpeed audit';
    const directDetailUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy.toLowerCase()}`;
    return {
      url,
      strategy,
      pageName: derivePageName(url),
      metrics: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        totalBlockingTime: 0,
      },
      screenshotUrl: fallbackScreenshotUrl,
      reportUrl: directDetailUrl,
      detailReportUrl: directDetailUrl,
      error: errMessage,
    };
  }
}
