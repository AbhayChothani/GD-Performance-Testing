'use client';

import React, { useState } from 'react';
import { PageAuditItem, ScreenType } from '@/lib/types';
import { ExternalLink, Image as ImageIcon, RotateCw, Edit3, Check } from 'lucide-react';
import { ScreenshotModal } from './ScreenshotModal';

interface ReportTableProps {
  items: PageAuditItem[];
  onCommentChange: (itemId: string, screenType: ScreenType, comment: string) => void;
  onPageNameChange: (itemId: string, pageName: string) => void;
  onMetricChange?: (
    itemId: string,
    screenType: ScreenType,
    field: 'performance' | 'accessibility' | 'bestPractices' | 'seo' | 'totalBlockingTime' | 'reportUrl',
    value: number | string
  ) => void;
  onReauditUrl?: (url: string, itemId: string) => void;
  isAuditing?: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  items,
  onCommentChange,
  onPageNameChange,
  onMetricChange,
  onReauditUrl,
  isAuditing,
}) => {
  // Screenshot modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    pageName: string;
    pageUrl: string;
    screenType: ScreenType;
    screenshotUrl: string | null;
    screenshotDataUri?: string | null;
  }>({
    isOpen: false,
    pageName: '',
    pageUrl: '',
    screenType: 'Mobile',
    screenshotUrl: null,
  });

  // Inline editing for page name
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');

  const openScreenshot = (
    item: PageAuditItem,
    screenType: ScreenType
  ) => {
    const metrics = screenType === 'Mobile' ? item.mobile : item.desktop;
    setModalState({
      isOpen: true,
      pageName: item.pageName,
      pageUrl: item.pageUrl,
      screenType,
      screenshotUrl: metrics.screenshotUrl,
      screenshotDataUri: metrics.screenshotDataUri,
    });
  };

  const getScoreCellStyle = (score: number | null | undefined, isLoading?: boolean) => {
    if (isLoading || score === null || score === undefined || typeof score !== 'number' || isNaN(score)) {
      return 'bg-slate-50 text-slate-400 font-medium';
    }
    if (score >= 90) {
      return 'bg-[#38761D] text-white font-bold';
    }
    if (score >= 50) {
      return 'bg-[#FFFF00] text-black font-bold';
    }
    return 'bg-[#FF0000] text-white font-bold';
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          📊
        </div>
        <h3 className="text-base font-bold text-slate-700">No Audits Run Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Paste URLs above and click &quot;Run PageSpeed Audit&quot; or click &quot;Load Book.xlsx Report&quot; to preview the exact spreadsheet report.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden mb-12">
      {/* Table Container with horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs select-text font-sans">
          {/* Exact Spreadsheet Header Row matching Book.xlsx Row 7 */}
          <thead>
            <tr className="bg-[#B7E1CD] text-black font-bold uppercase tracking-wider text-[11px] border-b border-black">
              <th className="border border-black px-3 py-2.5 text-center w-14 whitespace-nowrap">Sr. No.</th>
              <th className="border border-black px-4 py-2.5 text-left min-w-[200px] whitespace-nowrap">Page Name</th>
              <th className="border border-black px-4 py-2.5 text-left min-w-[280px] whitespace-nowrap">Page URL</th>
              <th className="border border-black px-3 py-2.5 text-center w-24 whitespace-nowrap">Screen Type</th>
              <th className="border border-black px-3 py-2.5 text-center w-24 whitespace-nowrap">Performance</th>
              <th className="border border-black px-3 py-2.5 text-center w-24 whitespace-nowrap">Accessibility</th>
              <th className="border border-black px-3 py-2.5 text-center w-24 whitespace-nowrap">Best Practices</th>
              <th className="border border-black px-3 py-2.5 text-center w-24 whitespace-nowrap">SEO</th>
              <th className="border border-black px-3 py-2.5 text-right w-36 whitespace-nowrap">Total Blocking Time (ms)</th>
              <th className="border border-black px-3 py-2.5 text-left min-w-[170px] whitespace-nowrap">Links</th>
              <th className="border border-black px-3 py-2.5 text-left min-w-[220px] whitespace-nowrap">Link for Detail Description</th>
              <th className="border border-black px-3 py-2.5 text-left min-w-[200px] whitespace-nowrap">Comment</th>
              {onReauditUrl && (
                <th className="border border-black px-2 py-2.5 text-center w-12 whitespace-nowrap">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((item, idx) => {
              const isNameEditing = editingNameId === item.id;
              const hasError = item.status === 'error';
              const isItemRunning =
                item.status === 'running' ||
                item.mobile.status === 'running' ||
                item.desktop.status === 'running';
              const isMobileRunning = isItemRunning || item.mobile.status === 'running';
              const isDesktopRunning = isItemRunning || item.desktop.status === 'running';

              return (
                <React.Fragment key={item.id || idx}>
                  {/* --- ROW 1: MOBILE --- */}
                  <tr className={`hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    {/* 1. Sr. No. Mobile */}
                    <td className="border border-black px-2 py-2 text-center font-mono font-medium text-slate-800 align-middle">
                      {item.srNoMobile}
                    </td>

                    {/* 2. Page Name (Rowspan = 2) */}
                    <td
                      rowSpan={2}
                      className="border border-black px-3 py-2 align-middle font-medium text-slate-900 group relative"
                    >
                      {isNameEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-emerald-500 rounded bg-white text-slate-900 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onPageNameChange(item.id, tempName);
                                setEditingNameId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onPageNameChange(item.id, tempName);
                              setEditingNameId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <span>{item.pageName || 'Home page'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNameId(item.id);
                              setTempName(item.pageName);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition"
                            title="Edit page name"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 3. Page URL (Rowspan = 2, Clickable Blue Link) */}
                    <td
                      rowSpan={2}
                      className="border border-black px-3 py-2 align-middle max-w-[280px]"
                    >
                      <a
                        href={item.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span className="truncate">{item.pageUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 inline" />
                      </a>
                    </td>

                    {/* 4. Screen Type (Mobile) */}
                    <td className="border border-black px-2 py-2 text-center font-semibold text-slate-800 align-middle">
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        Mobile
                      </span>
                    </td>

                    {/* 5. Performance */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.mobile.performance,
                        isMobileRunning
                      )}`}
                    >
                      {isMobileRunning ? '...' : (item.mobile.performance !== null ? item.mobile.performance : '-')}
                    </td>

                    {/* 6. Accessibility */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.mobile.accessibility,
                        isMobileRunning
                      )}`}
                    >
                      {isMobileRunning ? '...' : (item.mobile.accessibility !== null ? item.mobile.accessibility : '-')}
                    </td>

                    {/* 7. Best Practices */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.mobile.bestPractices,
                        isMobileRunning
                      )}`}
                    >
                      {isMobileRunning ? '...' : (item.mobile.bestPractices !== null ? item.mobile.bestPractices : '-')}
                    </td>

                    {/* 8. SEO */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.mobile.seo,
                        isMobileRunning
                      )}`}
                    >
                      {isMobileRunning ? '...' : (item.mobile.seo !== null ? item.mobile.seo : '-')}
                    </td>

                    {/* 9. Total Blocking Time (ms) */}
                    <td className="border border-black px-3 py-2 text-right font-mono font-semibold text-slate-800 align-middle select-none">
                      {isMobileRunning ? '...' : (item.mobile.totalBlockingTime !== null ? item.mobile.totalBlockingTime : '-')}
                    </td>

                    {/* 10. Links (Screenshot preview) */}
                    <td className="border border-black px-3 py-2 align-middle">
                      {isMobileRunning ? (
                        <span className="text-slate-400 italic text-[11px]">Generating...</span>
                      ) : item.mobile.screenshotUrl ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={item.mobile.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1.5 font-medium group text-xs"
                            title={item.mobile.screenshotUrl}
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition flex-shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {item.pageName || 'Home page'} - Mobile
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openScreenshot(item, 'Mobile')}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition ml-auto"
                            title="Quick preview in modal"
                          >
                            🔍
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* 11. Link for Detail Description */}
                    <td className="border border-black px-3 py-2 align-middle max-w-[240px]">
                      {isMobileRunning ? (
                        <span className="text-slate-400 italic text-[11px]">Generating...</span>
                      ) : item.mobile.reportUrl ? (
                        <a
                          href={item.mobile.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate block text-[11px] font-mono"
                          title={item.mobile.reportUrl}
                        >
                          {item.mobile.reportUrl}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* 12. Comment (Editable Input) */}
                    <td className="border border-black px-2 py-1 align-middle">
                      <input
                        type="text"
                        value={item.mobile.comment || ''}
                        onChange={(e) => onCommentChange(item.id, 'Mobile', e.target.value)}
                        placeholder="Add QA note..."
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent focus:bg-white text-slate-800 focus:outline-none transition"
                      />
                    </td>

                    {/* Action (Reaudit) (Rowspan=2) */}
                    {onReauditUrl && (
                      <td
                        rowSpan={2}
                        className="border border-black px-2 py-2 text-center align-middle"
                      >
                        <button
                          type="button"
                          disabled={isAuditing || isItemRunning}
                          onClick={() => onReauditUrl(item.pageUrl, item.id)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-40"
                          title={isItemRunning ? 'Auditing...' : 'Re-audit this URL'}
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isItemRunning ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* --- ROW 2: DESKTOP --- */}
                  <tr className={`hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    {/* 1. Sr. No. Desktop */}
                    <td className="border border-black px-2 py-2 text-center font-mono font-medium text-slate-800 align-middle">
                      {item.srNoDesktop}
                    </td>

                    {/* Columns 2 & 3 are vertically merged into Row 1 (rowSpan=2) */}

                    {/* 4. Screen Type (Desktop) */}
                    <td className="border border-black px-2 py-2 text-center font-semibold text-slate-800 align-middle">
                      <span className="inline-flex items-center gap-1 text-purple-700">
                        Desktop
                      </span>
                    </td>

                    {/* 5. Performance */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.desktop.performance,
                        isDesktopRunning
                      )}`}
                    >
                      {isDesktopRunning ? '...' : (item.desktop.performance !== null ? item.desktop.performance : '-')}
                    </td>

                    {/* 6. Accessibility */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.desktop.accessibility,
                        isDesktopRunning
                      )}`}
                    >
                      {isDesktopRunning ? '...' : (item.desktop.accessibility !== null ? item.desktop.accessibility : '-')}
                    </td>

                    {/* 7. Best Practices */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.desktop.bestPractices,
                        isDesktopRunning
                      )}`}
                    >
                      {isDesktopRunning ? '...' : (item.desktop.bestPractices !== null ? item.desktop.bestPractices : '-')}
                    </td>

                    {/* 8. SEO */}
                    <td
                      className={`border border-black px-2 py-2 text-center align-middle font-bold text-sm select-none ${getScoreCellStyle(
                        item.desktop.seo,
                        isDesktopRunning
                      )}`}
                    >
                      {isDesktopRunning ? '...' : (item.desktop.seo !== null ? item.desktop.seo : '-')}
                    </td>

                    {/* 9. Total Blocking Time (ms) */}
                    <td className="border border-black px-3 py-2 text-right font-mono font-semibold text-slate-800 align-middle select-none">
                      {isDesktopRunning ? '...' : (item.desktop.totalBlockingTime !== null ? item.desktop.totalBlockingTime : '-')}
                    </td>

                    {/* 10. Links (Screenshot preview) */}
                    <td className="border border-black px-3 py-2 align-middle">
                      {isDesktopRunning ? (
                        <span className="text-slate-400 italic text-[11px]">Generating...</span>
                      ) : item.desktop.screenshotUrl ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={item.desktop.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1.5 font-medium group text-xs"
                            title={item.desktop.screenshotUrl}
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition flex-shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {item.pageName || 'Home page'} - Desktop
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openScreenshot(item, 'Desktop')}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition ml-auto"
                            title="Quick preview in modal"
                          >
                            🔍
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* 11. Link for Detail Description */}
                    <td className="border border-black px-3 py-2 align-middle max-w-[240px]">
                      {isDesktopRunning ? (
                        <span className="text-slate-400 italic text-[11px]">Generating...</span>
                      ) : item.desktop.reportUrl ? (
                        <a
                          href={item.desktop.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate block text-[11px] font-mono"
                          title={item.desktop.reportUrl}
                        >
                          {item.desktop.reportUrl}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* 12. Comment (Editable Input) */}
                    <td className="border border-black px-2 py-1 align-middle">
                      <input
                        type="text"
                        value={item.desktop.comment || ''}
                        onChange={(e) => onCommentChange(item.id, 'Desktop', e.target.value)}
                        placeholder="Add QA note..."
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent focus:bg-white text-slate-800 focus:outline-none transition"
                      />
                    </td>
                  </tr>

                  {hasError && item.errorMessage && (
                    <tr>
                      <td colSpan={13} className="bg-red-50 text-red-700 text-xs px-4 py-2 border border-red-200">
                        ⚠️ Audit error for {item.pageUrl}: {item.errorMessage}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Screenshot Lightbox Modal */}
      <ScreenshotModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        pageName={modalState.pageName}
        pageUrl={modalState.pageUrl}
        screenType={modalState.screenType}
        screenshotUrl={modalState.screenshotUrl}
        screenshotDataUri={modalState.screenshotDataUri}
      />
    </div>
  );
};
