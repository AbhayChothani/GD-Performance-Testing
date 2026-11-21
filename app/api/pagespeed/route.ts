import { NextRequest, NextResponse } from 'next/server';
import { runPlaywrightLiveAudit } from '@/lib/liveAuditor';
import { runPageSpeedAudit, derivePageName, fetchHtmlTitle, findKnownAudit } from '@/lib/pagespeed';

export const maxDuration = 120; // Allow sufficient time for full live browser audit

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, strategy = 'both', apiKey, useCachedReference = false } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    let parsedUrl = url.trim();
    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
      parsedUrl = 'https://' + parsedUrl;
    }

    // If caller explicitly requested cached reference from Book.xlsx
    if (useCachedReference) {
      const known = findKnownAudit(parsedUrl);
      if (known) {
        return NextResponse.json({
          url: known.pageUrl,
          pageName: known.pageName,
          mobile: {
            url: known.pageUrl,
            strategy: 'mobile',
            pageName: known.pageName,
            metrics: {
              performance: known.mobile.performance,
              accessibility: known.mobile.accessibility,
              bestPractices: known.mobile.bestPractices,
              seo: known.mobile.seo,
              totalBlockingTime: known.mobile.totalBlockingTime,
            },
            screenshotUrl: known.mobile.screenshotUrl,
            reportUrl: known.mobile.reportUrl,
          },
          desktop: {
            url: known.pageUrl,
            strategy: 'desktop',
            pageName: known.pageName,
            metrics: {
              performance: known.desktop.performance,
              accessibility: known.desktop.accessibility,
              bestPractices: known.desktop.bestPractices,
              seo: known.desktop.seo,
              totalBlockingTime: known.desktop.totalBlockingTime,
            },
            screenshotUrl: known.desktop.screenshotUrl,
            reportUrl: known.desktop.reportUrl,
          },
        });
      }
    }

    const effectiveApiKey = (apiKey || process.env.PAGESPEED_API_KEY || '').trim();

    // 1. If an API key is provided (or set in PAGESPEED_API_KEY env), try the official Google Cloud PageSpeed API first
    if (effectiveApiKey) {
      try {
        const mRes = await runPageSpeedAudit(parsedUrl, 'mobile', effectiveApiKey);
        const dRes = await runPageSpeedAudit(parsedUrl, 'desktop', effectiveApiKey);

        if (!mRes.error && !dRes.error) {
          return NextResponse.json({
            url: parsedUrl,
            pageName: mRes.pageName || dRes.pageName || derivePageName(parsedUrl),
            mobile: mRes,
            desktop: dRes,
          });
        }
      } catch (apiErr) {
        console.warn('Google Cloud API Key attempt failed:', apiErr);
      }
    }

    // 2. If running locally (not in a serverless environment like Vercel), run headless Chrome / Puppeteer
    const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
    if (!isVercel) {
      try {
        const liveResult = await runPlaywrightLiveAudit(parsedUrl);
        if (liveResult.success) {
          return NextResponse.json({
            url: parsedUrl,
            pageName: liveResult.pageName || derivePageName(parsedUrl),
            mobile: {
              url: parsedUrl,
              strategy: 'mobile',
              pageName: liveResult.pageName,
              metrics: {
                performance: liveResult.mobile.performance,
                accessibility: liveResult.mobile.accessibility,
                bestPractices: liveResult.mobile.bestPractices,
                seo: liveResult.mobile.seo,
                totalBlockingTime: liveResult.mobile.totalBlockingTime,
              },
              screenshotUrl: liveResult.mobile.screenshotUrl,
              screenshotDataUri: liveResult.mobile.screenshotDataUri,
              reportUrl: liveResult.mobile.reportUrl,
            },
            desktop: {
              url: parsedUrl,
              strategy: 'desktop',
              pageName: liveResult.pageName,
              metrics: {
                performance: liveResult.desktop.performance,
                accessibility: liveResult.desktop.accessibility,
                bestPractices: liveResult.desktop.bestPractices,
                seo: liveResult.desktop.seo,
                totalBlockingTime: liveResult.desktop.totalBlockingTime,
              },
              screenshotUrl: liveResult.desktop.screenshotUrl,
              screenshotDataUri: liveResult.desktop.screenshotDataUri,
              reportUrl: liveResult.desktop.reportUrl,
            },
          });
        }
      } catch (liveErr) {
        console.error('Puppeteer live audit error:', liveErr);
      }
    }

    // 3. Fallback: Try Google PageSpeed REST API without key (in case public quota is available)
    try {
      const mRes = await runPageSpeedAudit(parsedUrl, 'mobile');
      const dRes = await runPageSpeedAudit(parsedUrl, 'desktop');
      if (!mRes.error && !dRes.error) {
        return NextResponse.json({
          url: parsedUrl,
          pageName: mRes.pageName || dRes.pageName || derivePageName(parsedUrl),
          mobile: mRes,
          desktop: dRes,
        });
      }
    } catch (apiFallbackErr) {
      console.warn('PageSpeed REST API fallback failed:', apiFallbackErr);
    }

    // 4. Graceful Fallback: If this URL is in Book.xlsx, return Book.xlsx reference data so audit does not crash
    const known = findKnownAudit(parsedUrl);
    if (known) {
      return NextResponse.json({
        url: known.pageUrl,
        pageName: known.pageName,
        isReferenceFallback: true,
        notice: 'Reference data from Book.xlsx (Add a Google PageSpeed API Key in settings for fresh live audits on Vercel).',
        mobile: {
          url: known.pageUrl,
          strategy: 'mobile',
          pageName: known.pageName,
          metrics: {
            performance: known.mobile.performance,
            accessibility: known.mobile.accessibility,
            bestPractices: known.mobile.bestPractices,
            seo: known.mobile.seo,
            totalBlockingTime: known.mobile.totalBlockingTime,
          },
          screenshotUrl: known.mobile.screenshotUrl,
          reportUrl: known.mobile.reportUrl,
          comment: 'Reference audit data (Book.xlsx)',
        },
        desktop: {
          url: known.pageUrl,
          strategy: 'desktop',
          pageName: known.pageName,
          metrics: {
            performance: known.desktop.performance,
            accessibility: known.desktop.accessibility,
            bestPractices: known.desktop.bestPractices,
            seo: known.desktop.seo,
            totalBlockingTime: known.desktop.totalBlockingTime,
          },
          screenshotUrl: known.desktop.screenshotUrl,
          reportUrl: known.desktop.reportUrl,
          comment: 'Reference audit data (Book.xlsx)',
        },
      });
    }

    // 5. If not in Book.xlsx and no key provided on Vercel
    return NextResponse.json(
      {
        error:
          'Live PageSpeed audits on Vercel require a free Google PageSpeed API Key (Google restricts unauthenticated requests from cloud servers). Please get a free API Key at https://developers.google.com/speed/docs/insights/v5/get-started and enter it in "Report Header & API Key" or set PAGESPEED_API_KEY in Vercel Settings.',
        isApiKeyRequired: true,
        apiKeyUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
      },
      { status: 500 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
