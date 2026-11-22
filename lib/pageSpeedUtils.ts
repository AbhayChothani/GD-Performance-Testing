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
  _existingReportUrl?: string
): string {
  // Use Google's official query-parameter format:
  // https://pagespeed.web.dev/analysis?url=<encodedUrl>&form_factor=<mobile|desktop>
  // This automatically fills the URL and device strategy, runs the analysis live,
  // and completely eliminates the "A report does not exist for the ID <id>" error.
  return buildPageSpeedReportUrl(targetUrl, strategy);
}
