import ExcelJS from 'exceljs';
import { PageAuditItem, ReportMetadata } from './types';
import { buildPageSpeedSnapshotUrl } from './pageSpeedUtils';

export const HEADER_BG_COLOR = 'FFB7E1CD'; // Light mint/teal
export const GREEN_BG_COLOR = 'FF38761D';  // Google Lighthouse 90-100 green
export const YELLOW_BG_COLOR = 'FFFFFF00'; // Google Lighthouse 50-89 yellow
export const RED_BG_COLOR = 'FFFF0000';    // Google Lighthouse 0-49 red

export function getScoreStyle(score: number | null) {
  if (score === null || score === undefined) {
    return {
      fill: undefined,
      fontColor: 'FF000000',
    };
  }
  if (score >= 90) {
    return {
      fill: GREEN_BG_COLOR,
      fontColor: 'FFFFFFFF', // White text on dark green
    };
  }
  if (score >= 50) {
    return {
      fill: YELLOW_BG_COLOR,
      fontColor: 'FF000000', // Black text on yellow
    };
  }
  return {
    fill: RED_BG_COLOR,
    fontColor: 'FFFFFFFF', // White text on red
  };
}

export function toAbsoluteUrl(url?: string | null, origin?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('data:')) {
    return url;
  }
  let base = origin;
  if (!base && typeof window !== 'undefined' && window.location?.origin) {
    base = window.location.origin;
  }
  if (!base && process.env.NEXT_PUBLIC_APP_URL) {
    base = process.env.NEXT_PUBLIC_APP_URL;
  }
  if (!base && process.env.VERCEL_URL) {
    base = `https://${process.env.VERCEL_URL}`;
  }
  if (!base) {
    base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  }
  base = base.replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

export async function generateExcelWorkbook(
  items: PageAuditItem[],
  metadata: ReportMetadata,
  origin?: string
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = metadata.createdBy || 'PageSpeed QA Report Generator';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Sheet1', {
    views: [{ showGridLines: true }],
  });

  // Set Column Widths matching Book.xlsx
  worksheet.columns = [
    { key: 'srNo', width: 13 },
    { key: 'pageName', width: 30 },
    { key: 'pageUrl', width: 38 },
    { key: 'screenType', width: 14 },
    { key: 'performance', width: 14 },
    { key: 'accessibility', width: 14 },
    { key: 'bestPractices', width: 14 },
    { key: 'seo', width: 14 },
    { key: 'tbt', width: 16 },
    { key: 'links', width: 36 },
    { key: 'detailDesc', width: 95 },
    { key: 'comment', width: 22 },
  ];

  // 1. Metadata Block (Rows 1-5)
  const metaRows = [
    ['Site Name', metadata.siteName || 'Giriraj Digital'],
    ['Site URL', metadata.siteUrl || 'https://www.girirajdigital.com/'],
    ['Environment', metadata.environment || 'Live'],
    ['Created By', metadata.createdBy || 'Abhay Chothani'],
    ['Created Date', metadata.createdDate || new Date().toISOString().split('T')[0]],
  ];

  metaRows.forEach((rowVals, idx) => {
    const rowNum = idx + 1;
    const row = worksheet.getRow(rowNum);

    const cellA = row.getCell(1);
    cellA.value = rowVals[0];
    cellA.font = { name: 'Calibri', size: 10, bold: true };
    cellA.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG_COLOR },
    };
    cellA.border = thinBorder;

    const cellB = row.getCell(2);
    if (idx === 1 && rowVals[1]) {
      // URL hyperlink
      cellB.value = {
        text: rowVals[1],
        hyperlink: rowVals[1],
      };
      cellB.font = { name: 'Calibri', size: 10, underline: true, color: { argb: 'FF0000FF' } };
    } else {
      cellB.value = rowVals[1];
      cellB.font = { name: 'Calibri', size: 10 };
    }
    cellB.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG_COLOR },
    };
    cellB.border = thinBorder;
  });

  // Row 6: Blank row
  worksheet.getRow(6).values = [];

  // Row 7: Header row
  const headers = [
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
  ];

  const headerRow = worksheet.getRow(7);
  headerRow.values = headers;
  headerRow.height = 24;

  for (let c = 1; c <= 12; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG_COLOR },
    };
    cell.alignment = { vertical: 'middle', horizontal: c >= 5 && c <= 8 ? 'center' : 'left' };
    cell.border = thinBorder;
  }

  // Row 8 onwards: Data rows (2 rows per URL)
  let currentRow = 8;

  items.forEach((item) => {
    const mobileRow = currentRow;
    const desktopRow = currentRow + 1;

    // --- MOBILE ROW ---
    const mRow = worksheet.getRow(mobileRow);
    mRow.height = 20;

    mRow.getCell(1).value = item.srNoMobile;
    mRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    mRow.getCell(1).border = thinBorder;

    // Page Name (merged later)
    mRow.getCell(2).value = item.pageName;
    mRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    mRow.getCell(2).border = thinBorder;

    // Page URL (merged later)
    mRow.getCell(3).value = {
      text: item.pageUrl,
      hyperlink: item.pageUrl,
    };
    mRow.getCell(3).font = { underline: true, color: { argb: 'FF0000FF' } };
    mRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    mRow.getCell(3).border = thinBorder;

    // Screen Type
    mRow.getCell(4).value = 'Mobile';
    mRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    mRow.getCell(4).border = thinBorder;

    // Metrics for Mobile
    const metricsM = [
      { col: 5, val: item.mobile.performance },
      { col: 6, val: item.mobile.accessibility },
      { col: 7, val: item.mobile.bestPractices },
      { col: 8, val: item.mobile.seo },
    ];

    metricsM.forEach(({ col, val }) => {
      const cell = mRow.getCell(col);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      const style = getScoreStyle(val);
      if (style.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.fill },
        };
      }
      cell.font = { color: { argb: style.fontColor }, bold: true };
    });

    // TBT
    mRow.getCell(9).value = item.mobile.totalBlockingTime ?? '';
    mRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    mRow.getCell(9).border = thinBorder;

    // Links (Screenshot)
    const mobileScreenshot = toAbsoluteUrl(item.mobile.screenshotUrl, origin);
    if (mobileScreenshot) {
      const pageLabel = item.pageName?.trim() || 'Home page';
      mRow.getCell(10).value = {
        text: `${pageLabel} - Mobile`,
        hyperlink: mobileScreenshot,
      };
      mRow.getCell(10).font = { name: 'Calibri', size: 10, underline: true, color: { argb: 'FF0000FF' } };
    } else {
      mRow.getCell(10).value = '';
    }
    mRow.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' };
    mRow.getCell(10).border = thinBorder;

    // Link for Detail Description (Mobile)
    const mobileReport = item.mobile.reportUrl || buildPageSpeedSnapshotUrl(item.pageUrl, 'mobile', item.mobile.reportUrl);
    if (mobileReport) {
      mRow.getCell(11).value = {
        text: mobileReport,
        hyperlink: mobileReport,
      };
      mRow.getCell(11).font = { name: 'Calibri', size: 10, underline: true, color: { argb: 'FF0000FF' } };
    } else {
      mRow.getCell(11).value = '';
    }
    mRow.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };
    mRow.getCell(11).border = thinBorder;

    // Comment
    mRow.getCell(12).value = item.mobile.comment || '';
    mRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle' };
    mRow.getCell(12).border = thinBorder;

    // --- DESKTOP ROW ---
    const dRow = worksheet.getRow(desktopRow);
    dRow.height = 20;

    dRow.getCell(1).value = item.srNoDesktop;
    dRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dRow.getCell(1).border = thinBorder;

    dRow.getCell(2).border = thinBorder;
    dRow.getCell(3).border = thinBorder;

    // Screen Type
    dRow.getCell(4).value = 'Desktop';
    dRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    dRow.getCell(4).border = thinBorder;

    // Metrics for Desktop
    const metricsD = [
      { col: 5, val: item.desktop.performance },
      { col: 6, val: item.desktop.accessibility },
      { col: 7, val: item.desktop.bestPractices },
      { col: 8, val: item.desktop.seo },
    ];

    metricsD.forEach(({ col, val }) => {
      const cell = dRow.getCell(col);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      const style = getScoreStyle(val);
      if (style.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.fill },
        };
      }
      cell.font = { color: { argb: style.fontColor }, bold: true };
    });

    // TBT
    dRow.getCell(9).value = item.desktop.totalBlockingTime ?? '';
    dRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    dRow.getCell(9).border = thinBorder;

    // Links (Screenshot)
    const desktopScreenshot = toAbsoluteUrl(item.desktop.screenshotUrl, origin);
    if (desktopScreenshot) {
      const pageLabel = item.pageName?.trim() || 'Home page';
      dRow.getCell(10).value = {
        text: `${pageLabel} - Desktop`,
        hyperlink: desktopScreenshot,
      };
      dRow.getCell(10).font = { name: 'Calibri', size: 10, underline: true, color: { argb: 'FF0000FF' } };
    } else {
      dRow.getCell(10).value = '';
    }
    dRow.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' };
    dRow.getCell(10).border = thinBorder;

    // Link for Detail Description (Desktop)
    const desktopReport = item.desktop.reportUrl || buildPageSpeedSnapshotUrl(item.pageUrl, 'desktop', item.desktop.reportUrl);
    if (desktopReport) {
      dRow.getCell(11).value = {
        text: desktopReport,
        hyperlink: desktopReport,
      };
      dRow.getCell(11).font = { name: 'Calibri', size: 10, underline: true, color: { argb: 'FF0000FF' } };
    } else {
      dRow.getCell(11).value = '';
    }
    dRow.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };
    dRow.getCell(11).border = thinBorder;

    // Comment
    dRow.getCell(12).value = item.desktop.comment || '';
    dRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle' };
    dRow.getCell(12).border = thinBorder;

    // Vertically merge Col B (Page Name) and Col C (Page URL) across mobile and desktop
    worksheet.mergeCells(mobileRow, 2, desktopRow, 2);
    worksheet.mergeCells(mobileRow, 3, desktopRow, 3);

    currentRow += 2;
  });

  return workbook;
}

export async function exportToExcelFile(
  items: PageAuditItem[],
  metadata: ReportMetadata,
  filename?: string
): Promise<void> {
  let origin = '';
  if (typeof window !== 'undefined' && window.location?.origin) {
    origin = window.location.origin;
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    origin = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`;
  } else {
    origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  }
  origin = origin.replace(/\/+$/, '');

  const workbook = await generateExcelWorkbook(items, metadata, origin);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name =
    filename ||
    `PageSpeed_QA_Report_${(metadata.siteName || 'Audit').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
