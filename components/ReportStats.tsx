'use client';

import React from 'react';
import { PageAuditItem } from '@/lib/types';
import { Smartphone, Monitor, CheckCircle, AlertTriangle, XCircle, Gauge } from 'lucide-react';

interface ReportStatsProps {
  items: PageAuditItem[];
}

export const ReportStats: React.FC<ReportStatsProps> = ({ items }) => {
  if (items.length === 0) return null;

  const completedItems = items.filter((i) => i.status === 'completed' || (i.mobile.performance !== null));
  if (completedItems.length === 0) return null;

  const calcAvg = (getter: (item: PageAuditItem) => number | null): number => {
    const vals = completedItems.map(getter).filter((v): v is number => v !== null && !isNaN(v));
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const avgMobilePerf = calcAvg((i) => i.mobile.performance);
  const avgDesktopPerf = calcAvg((i) => i.desktop.performance);
  const avgMobileAcc = calcAvg((i) => i.mobile.accessibility);
  const avgDesktopAcc = calcAvg((i) => i.desktop.accessibility);
  const avgMobileBP = calcAvg((i) => i.mobile.bestPractices);
  const avgDesktopBP = calcAvg((i) => i.desktop.bestPractices);
  const avgMobileSEO = calcAvg((i) => i.mobile.seo);
  const avgDesktopSEO = calcAvg((i) => i.desktop.seo);

  const avgMobileTBT = calcAvg((i) => i.mobile.totalBlockingTime);
  const avgDesktopTBT = calcAvg((i) => i.desktop.totalBlockingTime);

  // Score badge color helper
  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-[#38761D] text-white';
    if (score >= 50) return 'bg-[#FFFF00] text-black';
    return 'bg-[#FF0000] text-white';
  };

  // Counts of good/needs improvement/poor across all audits
  let goodCount = 0;
  let warnCount = 0;
  let poorCount = 0;

  completedItems.forEach((item) => {
    [item.mobile.performance, item.desktop.performance].forEach((s) => {
      if (s !== null) {
        if (s >= 90) goodCount++;
        else if (s >= 50) warnCount++;
        else poorCount++;
      }
    });
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* 1. Mobile Performance Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>Avg. Mobile Performance</span>
          </div>
          <span className={`text-base font-extrabold px-3 py-1 rounded-lg ${getScoreBadge(avgMobilePerf)}`}>
            {avgMobilePerf}/100
          </span>
        </div>
        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>Accessibility:</span> <strong className="text-slate-800">{avgMobileAcc}</strong>
          </div>
          <div className="flex justify-between">
            <span>Best Practices:</span> <strong className="text-slate-800">{avgMobileBP}</strong>
          </div>
          <div className="flex justify-between">
            <span>SEO:</span> <strong className="text-slate-800">{avgMobileSEO}</strong>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-100">
            <span>Avg. TBT:</span> <strong className="text-slate-800">{avgMobileTBT} ms</strong>
          </div>
        </div>
      </div>

      {/* 2. Desktop Performance Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Monitor className="w-4 h-4 text-purple-600" />
            <span>Avg. Desktop Performance</span>
          </div>
          <span className={`text-base font-extrabold px-3 py-1 rounded-lg ${getScoreBadge(avgDesktopPerf)}`}>
            {avgDesktopPerf}/100
          </span>
        </div>
        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>Accessibility:</span> <strong className="text-slate-800">{avgDesktopAcc}</strong>
          </div>
          <div className="flex justify-between">
            <span>Best Practices:</span> <strong className="text-slate-800">{avgDesktopBP}</strong>
          </div>
          <div className="flex justify-between">
            <span>SEO:</span> <strong className="text-slate-800">{avgDesktopSEO}</strong>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-100">
            <span>Avg. TBT:</span> <strong className="text-slate-800">{avgDesktopTBT} ms</strong>
          </div>
        </div>
      </div>

      {/* 3. Distribution Breakdown */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
          <Gauge className="w-4 h-4 text-emerald-600" />
          <span>Performance Distribution</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 text-emerald-800 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Good (90–100)
            </span>
            <span className="font-bold">{goodCount} audits</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-yellow-50 text-yellow-900 font-medium">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" /> Needs Improvement (50–89)
            </span>
            <span className="font-bold">{warnCount} audits</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-red-50 text-red-800 font-medium">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-600" /> Poor (0–49)
            </span>
            <span className="font-bold">{poorCount} audits</span>
          </div>
        </div>
      </div>

      {/* 4. Total Scope Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">QA Scope</span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {completedItems.length} <span className="text-sm font-normal text-slate-400">Pages</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">
            {completedItems.length * 2} Device Audits Generated
          </div>
        </div>
        <div className="text-[11px] text-slate-400 border-t border-slate-700/80 pt-2 mt-3 flex items-center justify-between">
          <span>Excel Export Ready</span>
          <span className="text-emerald-300 font-semibold">12 Exact Columns</span>
        </div>
      </div>
    </div>
  );
};
