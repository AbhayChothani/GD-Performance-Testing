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
  // If existingReportUrl is already in the official ?url= format, preserve it and update form_factor
  if (existingReportUrl && existingReportUrl.includes('pagespeed.web.dev/analysis?url=')) {
    const formFactor = strategy.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
    if (existingReportUrl.includes('form_factor=')) {
      return existingReportUrl.replace(/form_factor=(mobile|desktop)/i, `form_factor=${formFactor}`);
    }
    return `${existingReportUrl}&form_factor=${formFactor}`;
  }

  // NOTE: Google PageSpeed temporary snapshot IDs (/analysis/<slug>/<report-id>) are ephemeral
  // and expire immediately, causing "A report does not exist for the ID <id>" errors when opened.
  // We ALWAYS generate the permanent official Google query parameter URL:
  return buildPageSpeedReportUrl(targetUrl, strategy);
}
