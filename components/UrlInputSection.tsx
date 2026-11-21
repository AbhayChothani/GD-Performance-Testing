'use client';

import React, { useState, useRef } from 'react';
import { Play, Upload, Globe, FileSpreadsheet, RotateCcw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEMO_URLS } from '@/lib/demoData';

interface UrlInputSectionProps {
  urlsText: string;
  onUrlsTextChange: (text: string) => void;
  onRunAudit: (urls: string[]) => void;
  onLoadDemoReport: () => void;
  isRunning: boolean;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  urlsText,
  onUrlsTextChange,
  onRunAudit,
  onLoadDemoReport,
  isRunning,
}) => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState(false);
  const [isFetchingSitemap, setIsFetchingSitemap] = useState(false);
  const [sitemapError, setSitemapError] = useState<string | null>(null);
  const [sitemapSuccess, setSitemapSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URLs from textarea
  const extractedUrls = urlsText
    .split(/[\r\n,]+/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && !u.startsWith('#'));

  // Handle File Upload (.csv or .xlsx)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        const foundUrls: string[] = [];

        // Search rows and columns for URLs
        jsonRows.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string') {
                const trimmed = cell.trim();
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.com') || trimmed.includes('.org') || trimmed.includes('.net')) {
                  foundUrls.push(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
                }
              }
            });
          }
        });

        const unique = Array.from(new Set(foundUrls));
        if (unique.length > 0) {
          onUrlsTextChange(unique.join('\n'));
          alert(`Successfully imported ${unique.length} URLs from ${file.name}!`);
        } else {
          alert(`No valid URLs found in ${file.name}. Please ensure URLs start with http:// or https://`);
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to parse file. Please upload a valid .csv or .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Sitemap Fetch
  const handleFetchSitemap = async () => {
    if (!sitemapUrl.trim()) return;

    setIsFetchingSitemap(true);
    setSitemapError(null);
    setSitemapSuccess(null);

    try {
      const res = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sitemapUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch sitemap');
      }

      if (data.urls && data.urls.length > 0) {
        onUrlsTextChange(data.urls.join('\n'));
        setSitemapSuccess(`Found ${data.urls.length} URLs from sitemap!`);
        setTimeout(() => {
          setIsSitemapModalOpen(false);
          setSitemapSuccess(null);
        }, 1500);
      } else {
        setSitemapError('No URLs found in this sitemap.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching sitemap';
      setSitemapError(msg);
    } finally {
      setIsFetchingSitemap(false);
    }
  };

  const handleLoadDemoUrls = () => {
    onUrlsTextChange(DEMO_URLS.slice(0, 10).join('\n'));
  };

  const handleLoadAllDemoUrls = () => {
    onUrlsTextChange(DEMO_URLS.join('\n'));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 mb-8 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>Input Target URLs</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
              {extractedUrls.length} {extractedUrls.length === 1 ? 'URL' : 'URLs'} Ready
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Paste website URLs below, upload a spreadsheet, or crawl a sitemap.
          </p>
        </div>

        {/* Quick presets & helpers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Load Sample Demo */}
          <button
            type="button"
            onClick={onLoadDemoReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/80 transition"
            title="Load full 41-page audited report from Book.xlsx"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Book.xlsx Report</span>
          </button>

          {/* Load Sample URLs */}
          <button
            type="button"
            onClick={handleLoadDemoUrls}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
            title="Load 10 sample URLs from Giriraj Digital"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Load 10 URLs</span>
          </button>

          {/* Upload File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload .xlsx / .csv</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />

          {/* Auto Sitemap */}
          <button
            type="button"
            onClick={() => setIsSitemapModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>Crawl Sitemap.xml</span>
          </button>

          {/* Clear */}
          {urlsText && (
            <button
              type="button"
              onClick={() => onUrlsTextChange('')}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              title="Clear all URLs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={urlsText}
          onChange={(e) => onUrlsTextChange(e.target.value)}
          placeholder={`Enter one or multiple URLs (one per line), for example:
https://www.girirajdigital.com/
https://www.girirajdigital.com/services/product-engineering/
https://www.girirajdigital.com/ecommerce-solution/`}
          rows={6}
          disabled={isRunning}
          className="w-full font-mono text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-y disabled:opacity-60"
        />

        <div className="absolute right-3 bottom-3 text-[11px] font-mono text-slate-400 bg-white/90 px-2 py-0.5 rounded border border-slate-200">
          Line count: {extractedUrls.length}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500">
          💡 For each URL, both <strong className="text-slate-700">Mobile</strong> and{' '}
          <strong className="text-slate-700">Desktop</strong> audits will run automatically (2 rows per URL).
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isRunning || extractedUrls.length === 0}
            onClick={() => onRunAudit(extractedUrls)}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? 'Auditing In Progress...' : `Run PageSpeed Audit (${extractedUrls.length})`}</span>
          </button>
        </div>
      </div>

      {/* Sitemap Modal */}
      {isSitemapModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setIsSitemapModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800">Crawl Sitemap.xml</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter your website domain or direct sitemap URL. We’ll automatically extract all page URLs.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Website or Sitemap URL
              </label>
              <input
                type="text"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="e.g. https://www.girirajdigital.com/sitemap.xml"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSitemapUrl('https://www.girirajdigital.com/sitemap.xml')}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  Use Giriraj Digital Sitemap
                </button>
              </div>
            </div>

            {sitemapError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sitemapError}</span>
              </div>
            )}

            {sitemapSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg mb-4 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{sitemapSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSitemapModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFetchingSitemap || !sitemapUrl.trim()}
                onClick={handleFetchSitemap}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isFetchingSitemap ? 'Crawling...' : 'Fetch URLs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
