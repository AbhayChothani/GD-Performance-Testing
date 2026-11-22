import { PageAuditItem, ReportMetadata } from './types';
import { toAbsoluteUrl } from './excelExport';
import { buildPageSpeedSnapshotUrl } from './pageSpeedUtils';

function getScoreInlineStyle(score: number | null): string {
  if (score === null || score === undefined) return '';
  if (score >= 90) return 'background-color: #38761D; color: #FFFFFF; font-weight: bold; text-align: center;';
  if (score >= 50) return 'background-color: #FFFF00; color: #000000; font-weight: bold; text-align: center;';
  return 'background-color: #FF0000; color: #FFFFFF; font-weight: bold; text-align: center;';
}

export async function copyForGoogleSheets(
  items: PageAuditItem[],
  metadata: ReportMetadata
): Promise<boolean> {
  const headerBg = 'background-color: #B7E1CD; font-weight: bold; border: 1px solid #000000; padding: 6px 10px;';
  const metaBg = 'background-color: #B7E1CD; border: 1px solid #000000; padding: 4px 8px;';
  const cellBorder = 'border: 1px solid #000000; padding: 4px 8px;';

  // Build HTML table for rich clipboard copy
  let html = `<table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">`;

  // Metadata block
  html += `
    <tr><td style="${headerBg}">Site Name</td><td style="${metaBg}">${metadata.siteName || ''}</td></tr>
    <tr><td style="${headerBg}">Site URL</td><td style="${metaBg}"><a href="${metadata.siteUrl}">${metadata.siteUrl || ''}</a></td></tr>
    <tr><td style="${headerBg}">Environment</td><td style="${metaBg}">${metadata.environment || 'Live'}</td></tr>
    <tr><td style="${headerBg}">Created By</td><td style="${metaBg}">${metadata.createdBy || ''}</td></tr>
    <tr><td style="${headerBg}">Created Date</td><td style="${metaBg}">${metadata.createdDate || ''}</td></tr>
    <tr><td colspan="12" style="height: 18px;"></td></tr>
  `;

  // Headers
  html += `
    <tr>
      <th style="${headerBg}">Sr. No.</th>
      <th style="${headerBg}">Page Name</th>
      <th style="${headerBg}">Page URL</th>
      <th style="${headerBg}">Screen Type</th>
      <th style="${headerBg}">Performance</th>
      <th style="${headerBg}">Accessibility</th>
      <th style="${headerBg}">Best Practices</th>
      <th style="${headerBg}">SEO</th>
      <th style="${headerBg}">Total Blocking Time (ms)</th>
      <th style="${headerBg}">Links</th>
      <th style="${headerBg}">Link for Detail Description</th>
      <th style="${headerBg}">Comment</th>
    </tr>
  `;

  // Data rows
  items.forEach((item) => {
    const pageLabel = item.pageName?.trim() || 'Home page';
    const mScreenshot = toAbsoluteUrl(item.mobile.screenshotUrl);
    const mReport =
      item.mobile.reportUrl ||
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(item.pageUrl)}&form_factor=mobile`;
    const dScreenshot = toAbsoluteUrl(item.desktop.screenshotUrl);
    const dReport =
      item.desktop.reportUrl ||
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(item.pageUrl)}&form_factor=desktop`;

    const mLabel = `${pageLabel} - Mobile`;
    const dLabel = `${pageLabel} - Desktop`;

    // Mobile row
    html += `
      <tr>
        <td style="${cellBorder} text-align: center;">${item.srNoMobile}</td>
        <td rowspan="2" style="${cellBorder} vertical-align: middle;">${item.pageName}</td>
        <td rowspan="2" style="${cellBorder} vertical-align: middle;"><a href="${item.pageUrl}">${item.pageUrl}</a></td>
        <td style="${cellBorder} text-align: center;">Mobile</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.mobile.performance)}">${item.mobile.performance ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.mobile.accessibility)}">${item.mobile.accessibility ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.mobile.bestPractices)}">${item.mobile.bestPractices ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.mobile.seo)}">${item.mobile.seo ?? ''}</td>
        <td style="${cellBorder} text-align: right;">${item.mobile.totalBlockingTime ?? ''}</td>
        <td style="${cellBorder}">${mScreenshot ? `<a href="${mScreenshot}">${mLabel}</a>` : ''}</td>
        <td style="${cellBorder}">${mReport ? `<a href="${mReport}">${mReport}</a>` : ''}</td>
        <td style="${cellBorder}">${item.mobile.comment || ''}</td>
      </tr>
      <tr>
        <td style="${cellBorder} text-align: center;">${item.srNoDesktop}</td>
        <td style="${cellBorder} text-align: center;">Desktop</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.desktop.performance)}">${item.desktop.performance ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.desktop.accessibility)}">${item.desktop.accessibility ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.desktop.bestPractices)}">${item.desktop.bestPractices ?? ''}</td>
        <td style="${cellBorder} ${getScoreInlineStyle(item.desktop.seo)}">${item.desktop.seo ?? ''}</td>
        <td style="${cellBorder} text-align: right;">${item.desktop.totalBlockingTime ?? ''}</td>
        <td style="${cellBorder}">${dScreenshot ? `<a href="${dScreenshot}">${dLabel}</a>` : ''}</td>
        <td style="${cellBorder}">${dReport ? `<a href="${dReport}">${dReport}</a>` : ''}</td>
        <td style="${cellBorder}">${item.desktop.comment || ''}</td>
      </tr>
    `;
  });

  html += `</table>`;

  // Build TSV plain text
  const tsvLines: string[] = [
    `Site Name\t${metadata.siteName || ''}`,
    `Site URL\t${metadata.siteUrl || ''}`,
    `Environment\t${metadata.environment || 'Live'}`,
    `Created By\t${metadata.createdBy || ''}`,
    `Created Date\t${metadata.createdDate || ''}`,
    '',
    [
      'Sr. No.',
      'Page Name',
      'Page URL',
      'Screen Type',
      'Performance',
      'Accessibility',
      'Best Practices',
      'SEO',
      'Total Blocking Time (ms)',
      'Links',
      'Link for Detail Description',
      'Comment',
    ].join('\t'),
  ];

  items.forEach((item) => {
    const pageLabel = item.pageName?.trim() || 'Home page';
    const mScreenshot = toAbsoluteUrl(item.mobile.screenshotUrl);
    const mReport =
      item.mobile.reportUrl ||
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(item.pageUrl)}&form_factor=mobile`;
    const dScreenshot = toAbsoluteUrl(item.desktop.screenshotUrl);
    const dReport =
      item.desktop.reportUrl ||
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(item.pageUrl)}&form_factor=desktop`;

    const mLabel = `${pageLabel} - Mobile`;
    const dLabel = `${pageLabel} - Desktop`;

    tsvLines.push(
      [
        item.srNoMobile,
        item.pageName,
        item.pageUrl,
        'Mobile',
        item.mobile.performance ?? '',
        item.mobile.accessibility ?? '',
        item.mobile.bestPractices ?? '',
        item.mobile.seo ?? '',
        item.mobile.totalBlockingTime ?? '',
        mScreenshot ? `=HYPERLINK("${mScreenshot}","${mLabel}")` : '',
        mReport ? `=HYPERLINK("${mReport}","${mReport}")` : '',
        item.mobile.comment ?? '',
      ].join('\t')
    );
    tsvLines.push(
      [
        item.srNoDesktop,
        '',
        '',
        'Desktop',
        item.desktop.performance ?? '',
        item.desktop.accessibility ?? '',
        item.desktop.bestPractices ?? '',
        item.desktop.seo ?? '',
        item.desktop.totalBlockingTime ?? '',
        dScreenshot ? `=HYPERLINK("${dScreenshot}","${dLabel}")` : '',
        dReport ? `=HYPERLINK("${dReport}","${dReport}")` : '',
        item.desktop.comment ?? '',
      ].join('\t')
    );
  });

  const tsv = tsvLines.join('\n');

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([tsv], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    } else {
      // Fallback
      await navigator.clipboard.writeText(tsv);
      return true;
    }
  } catch (err) {
    console.warn('ClipboardItem write failed, trying fallback writeText:', err);
    try {
      await navigator.clipboard.writeText(tsv);
      return true;
    } catch {
      return false;
    }
  }
}
