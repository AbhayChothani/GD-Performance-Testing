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
