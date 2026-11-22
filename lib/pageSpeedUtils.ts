/**
 * Pure client/server-safe utility functions for PageSpeed URL formatting
 * No Node.js filesystem dependencies (fs/path) so it can be safely imported anywhere
 */

export function buildPageSpeedSnapshotUrl(
  targetUrl: string,
  strategy: 'mobile' | 'desktop',
  existingReportUrl?: string
): string {
  if (!targetUrl) return '';

  // If already a valid snapshot URL with /analysis/<slug>/<id>, preserve it with target form_factor
  if (existingReportUrl && existingReportUrl.includes('pagespeed.web.dev/analysis/')) {
    const match = existingReportUrl.match(/pagespeed\.web\.dev\/analysis\/([^/?#]+)\/([^/?#]+)/i);
    if (match) {
      const slug = match[1];
      const id = match[2];
      return `https://pagespeed.web.dev/analysis/${slug}/${id}?form_factor=${strategy.toLowerCase()}`;
    }
  }

  const slug = targetUrl
    .trim()
    .replace(/^https?:\/\//i, (p) => p.toLowerCase().replace('://', '-'))
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'site';

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let snapshotId = '';
  for (let i = 0; i < 10; i++) {
    snapshotId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `https://pagespeed.web.dev/analysis/${slug}/${snapshotId}?form_factor=${strategy.toLowerCase()}`;
}

export function buildPageSpeedReportUrl(targetUrl: string, strategy: 'mobile' | 'desktop'): string {
  return buildPageSpeedSnapshotUrl(targetUrl, strategy);
}
