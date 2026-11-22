/**
 * Pure client/server-safe utility functions for PageSpeed URL formatting
 * No Node.js filesystem dependencies (fs/path) so it can be safely imported anywhere
 */

export interface StaticReportUrlParams {
  url: string;
  strategy: 'mobile' | 'desktop';
  pageName?: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  totalBlockingTime?: number | string;
  firstContentfulPaint?: string;
  largestContentfulPaint?: string;
  cumulativeLayoutShift?: string;
  speedIndex?: string;
  screenshotUrl?: string;
  origin?: string;
}

export function buildStaticReportUrl(params: StaticReportUrlParams): string {
  const q = new URLSearchParams();
  q.set('url', params.url);
  q.set('strategy', params.strategy.toLowerCase());
  if (params.pageName) q.set('name', params.pageName);
  q.set('p', String(params.performance ?? 0));
  q.set('a', String(params.accessibility ?? 0));
  q.set('b', String(params.bestPractices ?? 0));
  q.set('s', String(params.seo ?? 0));

  if (params.totalBlockingTime !== undefined) {
    const tbtStr = String(params.totalBlockingTime).includes('ms')
      ? String(params.totalBlockingTime)
      : `${params.totalBlockingTime} ms`;
    q.set('tbt', tbtStr);
  }
  if (params.firstContentfulPaint) q.set('fcp', params.firstContentfulPaint);
  if (params.largestContentfulPaint) q.set('lcp', params.largestContentfulPaint);
  if (params.cumulativeLayoutShift) q.set('cls', params.cumulativeLayoutShift);
  if (params.speedIndex) q.set('si', params.speedIndex);
  if (params.screenshotUrl && !params.screenshotUrl.startsWith('data:')) {
    q.set('img', params.screenshotUrl);
  }

  const path = `/report?${q.toString()}`;
  if (params.origin) {
    return `${params.origin.replace(/\/+$/, '')}${path}`;
  }
  return path;
}

export function buildPageSpeedReportUrl(
  targetUrl: string,
  strategy: 'mobile' | 'desktop'
): string {
  if (!targetUrl) return '';
  const cleanUrl = targetUrl.trim();
  const formFactor = strategy.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
  return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(cleanUrl)}&form_factor=${formFactor}`;
}

export function buildPageSpeedSnapshotUrl(
  targetUrl: string,
  strategy: 'mobile' | 'desktop',
  existingReportUrl?: string
): string {
  // If an exact static snapshot URL was captured by Puppeteer (/analysis/<slug>/<report-id>),
  // preserve it and ensure form_factor matches the target strategy!
  if (existingReportUrl && existingReportUrl.includes('pagespeed.web.dev/analysis/')) {
    const match = existingReportUrl.match(/pagespeed\.web\.dev\/analysis\/([^/?#]+)\/([^/?#]+)/i);
    if (match) {
      const slug = match[1];
      const id = match[2];
      return `https://pagespeed.web.dev/analysis/${slug}/${id}?form_factor=${strategy.toLowerCase()}`;
    }
    return existingReportUrl;
  }

  // If existingReportUrl is already in the official ?url= format, preserve it and update form_factor
  if (existingReportUrl && existingReportUrl.includes('pagespeed.web.dev/analysis?url=')) {
    const formFactor = strategy.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
    if (existingReportUrl.includes('form_factor=')) {
      return existingReportUrl.replace(/form_factor=(mobile|desktop)/i, `form_factor=${formFactor}`);
    }
    return `${existingReportUrl}&form_factor=${formFactor}`;
  }

  if (existingReportUrl && existingReportUrl.startsWith('https://pagespeed.web.dev/')) {
    return existingReportUrl;
  }

  // Do not generate a default URL before/during audit if no report URL has been created yet
  if (!existingReportUrl) {
    return '';
  }

  return buildPageSpeedReportUrl(targetUrl, strategy);
}
