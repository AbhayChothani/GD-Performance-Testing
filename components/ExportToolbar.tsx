'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, Search, FileSpreadsheet, Trash2 } from 'lucide-react';
import { PageAuditItem, ReportMetadata } from '@/lib/types';
import { exportToExcelFile } from '@/lib/excelExport';
import { copyForGoogleSheets } from '@/lib/clipboardCopy';

interface ExportToolbarProps {
  items: PageAuditItem[];
  metadata: ReportMetadata;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onClearAll: () => void;
  filterScore: 'all' | 'needs-work' | 'critical';
  onFilterScoreChange: (val: 'all' | 'needs-work' | 'critical') => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  items,
  metadata,
  searchTerm,
  onSearchChange,
  onClearAll,
  filterScore,
  onFilterScoreChange,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportExcel = async () => {
    if (items.length === 0) return;
    setIsExporting(true);
    try {
      await exportToExcelFile(items, metadata);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyGoogleSheets = async () => {
    if (items.length === 0) return;
    const ok = await copyForGoogleSheets(items, metadata);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Failed to copy to clipboard.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left: Search & Filter */}
      <div className="flex items-center gap-3 w-full md:w-auto flex-1">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by Page Name or URL..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>

        {/* Filter Score */}
        <select
          value={filterScore}
          onChange={(e) => onFilterScoreChange(e.target.value as 'all' | 'needs-work' | 'critical')}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Scores</option>
          <option value="needs-work">Needs Work (Perf &lt; 90)</option>
          <option value="critical">Critical (Perf &lt; 50)</option>
        </select>
      </div>

      {/* Right: Export & Copy Actions */}
      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        {/* Copy for Google Sheets */}
        <button
          type="button"
          onClick={handleCopyGoogleSheets}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition disabled:opacity-50"
          title="Copy formatted table to paste directly into Google Sheets (Ctrl+V)"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Copied for Sheets!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-300" />
              <span>Copy for Google Sheets</span>
            </>
          )}
        </button>

        {/* Export Excel (.xlsx) */}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting || items.length === 0}
          className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] transition disabled:opacity-50"
          title="Download styled .xlsx file matching Book.xlsx"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isExporting ? 'Generating Excel...' : 'Export Styled Excel (.xlsx)'}</span>
        </button>

        {/* Clear All */}
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Clear all results"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
