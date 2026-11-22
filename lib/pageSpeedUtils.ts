/**
 * Pure client/server-safe utility functions for PageSpeed URL formatting
 * No Node.js filesystem dependencies (fs/path) so it can be safely imported anywhere
 */

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

  if (existingReportUrl && existingReportUrl.startsWith('https://pagespeed.web.dev/')) {
    return existingReportUrl;
  }

  // Fallback if no static snapshot URL has been captured yet
  return buildPageSpeedReportUrl(targetUrl, strategy);
}
