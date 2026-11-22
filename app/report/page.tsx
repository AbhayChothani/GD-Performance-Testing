'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Smartphone,
  Monitor,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Share2,
} from 'lucide-react';
import { generatePageSpeedCardSvg } from '@/lib/pageSpeedCardGenerator';

function ReportContent() {
  const searchParams = useSearchParams();

  const url = searchParams.get('url') || 'https://www.girirajdigital.com/';
  const strategy = (searchParams.get('strategy') || 'mobile') as 'mobile' | 'desktop';
  const pageName = searchParams.get('name') || 'Home page';
  const p = parseInt(searchParams.get('p') || '91', 10);
  const a = parseInt(searchParams.get('a') || '98', 10);
  const b = parseInt(searchParams.get('b') || '96', 10);
  const s = parseInt(searchParams.get('s') || '100', 10);
  const tbt = searchParams.get('tbt') || '180 ms';
  const fcp = searchParams.get('fcp') || '1.8 s';
  const lcp = searchParams.get('lcp') || '1.8 s';
  const cls = searchParams.get('cls') || '0';
  const si = searchParams.get('si') || '5.6 s';
  const auditDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const isMobile = strategy === 'mobile';
  const googleLiveUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy}`;

  // Generate SVG Card
  const cardSvg = generatePageSpeedCardSvg({
    url,
    strategy,
    pageName,
    performance: p,
    accessibility: a,
    bestPractices: b,
    seo: s,
    totalBlockingTime: tbt,
    firstContentfulPaint: fcp,
    largestContentfulPaint: lcp,
    cumulativeLayoutShift: cls,
    speedIndex: si,
  });

  const cardDataUri = `data:image/svg+xml;base64,${Buffer.from(cardSvg, 'utf-8').toString('base64')}`;

  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-[#38761D] text-white';
    if (score >= 50) return 'bg-[#FFFF00] text-black';
    return 'bg-[#FF0000] text-white';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {pageName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {isMobile ? 'Mobile' : 'Desktop'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              title="Trigger a new live scan directly on Google PageSpeed Insights"
            >
              <span>Live on Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Audited URL:</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline truncate max-w-sm sm:max-w-lg font-mono"
              >
                {url}
              </a>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Date: {auditDate}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Lighthouse Snapshot (Locked)
              </span>
            </div>
          </div>

          {/* Quick Score Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreBadgeClass(p)}`}>
              Perf: {p}
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreBadgeClass(a)}`}>
              A11y: {a}
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreBadgeClass(b)}`}>
              BP: {b}
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreBadgeClass(s)}`}>
              SEO: {s}
            </div>
          </div>
        </div>

        {/* The Exact PageSpeed Report Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/80 mb-8 p-2 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardDataUri}
            alt={`PageSpeed QA Report Card for ${pageName}`}
            className="w-full max-w-4xl h-auto rounded-xl object-contain"
          />
        </div>

        {/* Detailed Metrics Table */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-300 mb-4 flex items-center gap-2">
            <span>Core Web Vitals &amp; Audit Breakdown</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* FCP */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">First Contentful Paint (FCP)</span>
              <span className="text-xl font-mono font-bold text-white">{fcp}</span>
            </div>

            {/* LCP */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Largest Contentful Paint (LCP)</span>
              <span className="text-xl font-mono font-bold text-white">{lcp}</span>
            </div>

            {/* TBT */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Total Blocking Time (TBT)</span>
              <span className="text-xl font-mono font-bold text-white">{tbt}</span>
            </div>

            {/* CLS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Cumulative Layout Shift (CLS)</span>
              <span className="text-xl font-mono font-bold text-white">{cls}</span>
            </div>

            {/* Speed Index */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Speed Index</span>
              <span className="text-xl font-mono font-bold text-white">{si}</span>
            </div>

            {/* Strategy */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Device Strategy</span>
              <span className="text-xl font-bold text-teal-400 capitalize">{strategy}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white p-8">Loading report...</div>}>
      <ReportContent />
    </Suspense>
  );
}
