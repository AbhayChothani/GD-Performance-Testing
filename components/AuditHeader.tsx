'use client';

import React, { useState } from 'react';
import { Settings, ShieldCheck, Globe, Calendar, User, Layers, ChevronDown, ChevronUp, Key } from 'lucide-react';
import { ReportMetadata } from '@/lib/types';

interface AuditHeaderProps {
  metadata: ReportMetadata;
  onMetadataChange: (newMeta: ReportMetadata) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({
  metadata,
  onMetadataChange,
  apiKey,
  onApiKeyChange,
}) => {
  const [isMetaExpanded, setIsMetaExpanded] = useState(false);

  const updateField = (field: keyof ReportMetadata, val: string) => {
    onMetadataChange({ ...metadata, [field]: val });
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top bar with branding */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  PageSpeed QA Report Generator
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Book.xlsx Schema
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Automated Google PageSpeed testing &amp; exact 12-column styled Excel report generator
              </p>
            </div>
          </div>

          {/* Quick Score Legend & Metadata Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Legend */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium mr-1">Lighthouse Scale:</span>
              <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-[#38761D] text-white">
                90–100
              </span>
              <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-[#FFFF00] text-black">
                50–89
              </span>
              <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-[#FF0000] text-white">
                0–49
              </span>
            </div>

            {/* Toggle Metadata button */}
            <button
              onClick={() => setIsMetaExpanded(!isMetaExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-teal-400" />
              <span>Report Header &amp; API Key</span>
              {isMetaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible / Expandable Metadata Inputs (Rows 1-5 of Excel + API Key) */}
        {isMetaExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Excel Spreadsheet Header Metadata (Rows 1–5 in Book.xlsx)
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                {/* Site Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" /> Site Name
                  </label>
                  <input
                    type="text"
                    value={metadata.siteName}
                    onChange={(e) => updateField('siteName', e.target.value)}
                    placeholder="e.g. Giriraj Digital"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Site URL */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Globe className="w-3.5 h-3.5 text-slate-500" /> Site URL
                  </label>
                  <input
                    type="text"
                    value={metadata.siteUrl}
                    onChange={(e) => updateField('siteUrl', e.target.value)}
                    placeholder="e.g. https://www.girirajdigital.com/"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Environment */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Environment
                  </label>
                  <input
                    type="text"
                    value={metadata.environment}
                    onChange={(e) => updateField('environment', e.target.value)}
                    placeholder="e.g. Live / Staging / UAT"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Created By */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Created By
                  </label>
                  <input
                    type="text"
                    value={metadata.createdBy}
                    onChange={(e) => updateField('createdBy', e.target.value)}
                    placeholder="e.g. Abhay Chothani"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Created Date */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Created Date
                  </label>
                  <input
                    type="date"
                    value={metadata.createdDate}
                    onChange={(e) => updateField('createdDate', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Optional PageSpeed API Key */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-md">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> Optional Google PageSpeed API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    placeholder="Optional: Enter Google API key for higher rate limits (works without key)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="text-[11px] text-slate-400 self-start sm:self-end">
                  🛡️ Without a key, requests use Google&apos;s public rate limit with smart fallback.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
