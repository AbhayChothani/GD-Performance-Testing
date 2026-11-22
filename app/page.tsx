'use client';

import React, { useState, useRef, useMemo } from 'react';
import { AuditHeader } from '@/components/AuditHeader';
import { UrlInputSection } from '@/components/UrlInputSection';
import { AuditProgress } from '@/components/AuditProgress';
import { ReportStats } from '@/components/ReportStats';
import { ExportToolbar } from '@/components/ExportToolbar';
import { ReportTable } from '@/components/ReportTable';
import { DEFAULT_METADATA, DEMO_ITEMS, DEMO_URLS } from '@/lib/demoData';
import { PageAuditItem, ReportMetadata, BatchProgress, ScreenType } from '@/lib/types';
import { toAbsoluteUrl } from '@/lib/excelExport';
import { buildPageSpeedSnapshotUrl } from '@/lib/pageSpeedUtils';

export default function HomePage() {
  const [metadata, setMetadata] = useState<ReportMetadata>(DEFAULT_METADATA);
  const [apiKey, setApiKey] = useState<string>('AIzaSyBLTDMDGSd0VPS0T3UApY-mdLXpcwL-9LI');
  const [urlsText, setUrlsText] = useState<string>('https://www.girirajdigital.com/');
  const [items, setItems] = useState<PageAuditItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterScore, setFilterScore] = useState<'all' | 'needs-work' | 'critical'>('all');

  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    current: 0,
    currentUrl: '',
    currentStrategy: '',
    percentage: 0,
    status: 'idle',
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const cancelRequestedRef = useRef(false);

  // Load the pre-audited demo report from Book.xlsx
  const handleLoadDemoReport = () => {
    setItems(DEMO_ITEMS);
    setMetadata(DEFAULT_METADATA);
    setProgress({
      total: DEMO_ITEMS.length,
      completed: DEMO_ITEMS.length,
      current: DEMO_ITEMS.length,
      currentUrl: '',
      currentStrategy: '',
      percentage: 100,
      status: 'completed',
    });
  };

  // Helper to execute audit request with up to 2 automatic retries on network / timeout failure
  const fetchAuditWithRetry = async (
    targetUrl: string,
    apiKeyVal?: string,
    maxRetries = 2,
    onRetry?: (attempt: number) => void
  ) => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (cancelRequestedRef.current) {
        throw new Error('Audit cancelled');
      }

      if (attempt > 0) {
        if (onRetry) onRetry(attempt);
        // Wait 3 seconds before retrying
        await new Promise((r) => setTimeout(r, 3000));
      }

      try {
        const res = await fetch('/api/pagespeed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, strategy: 'both', apiKey: apiKeyVal }),
        });

        // If server timed out with 504 / 502 / 503
        if (res.status === 504 || res.status === 502 || res.status === 503) {
          throw new Error(`Server timeout (${res.status})`);
        }

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to complete audit');
        }

        return data;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;
        const msg = error.message.toLowerCase();
        const isRetryable =
          msg.includes('failed to fetch') ||
          msg.includes('network') ||
          msg.includes('timeout') ||
          msg.includes('504') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('load failed');

        if (isRetryable && attempt < maxRetries) {
          console.warn(
            `Audit for ${targetUrl} failed with "${error.message}". Retrying in 3s (Attempt ${attempt + 1}/${maxRetries})...`
          );
          continue;
        }

        throw error;
      }
    }
    throw lastError || new Error('Audit failed');
  };

  // Run Batch PageSpeed Audit
  const handleRunAudit = async (urls: string[]) => {
    if (urls.length === 0 || isAuditing) return;

    cancelRequestedRef.current = false;
    setIsAuditing(true);

    // Initialize items with pending state
    const initialItems: PageAuditItem[] = urls.map((u, idx) => {
      const srMobile = idx * 2 + 1;
      const srDesktop = idx * 2 + 2;
      return {
        id: `audit-${Date.now()}-${idx}`,
        srNoMobile: srMobile,
        srNoDesktop: srDesktop,
        pageName: 'Auditing...',
        pageUrl: u,
        status: 'pending',
        mobile: {
          screenType: 'Mobile',
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          totalBlockingTime: null,
          screenshotUrl: null,
          reportUrl: '',
          comment: '',
          status: 'pending',
        },
        desktop: {
          screenType: 'Desktop',
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
          totalBlockingTime: null,
          screenshotUrl: null,
          reportUrl: '',
          comment: '',
          status: 'pending',
        },
      };
    });

    setItems(initialItems);

    const total = urls.length;
    setProgress({
      total,
      completed: 0,
      current: 1,
      currentUrl: urls[0],
      currentStrategy: 'both',
      percentage: 0,
      status: 'running',
    });

    // Process sequentially with concurrency = 1 to guarantee full CPU/RAM on Vercel
    for (let i = 0; i < total; i++) {
      if (cancelRequestedRef.current) {
        setProgress((prev) => ({ ...prev, status: 'cancelled' }));
        break;
      }

      const currentUrl = urls[i];
      const itemId = initialItems[i].id;

      // Mark current item running
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: 'running' } : item))
      );

      setProgress({
        total,
        completed: i,
        current: i + 1,
        currentUrl,
        currentStrategy: 'both',
        percentage: Math.round((i / total) * 100),
        status: 'running',
      });

      try {
        const data = await fetchAuditWithRetry(currentUrl, apiKey, 2, (attempt) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, pageName: `Retrying (attempt ${attempt}/2)...` }
                : item
            )
          );
        });

        const mMetrics = data.mobile?.metrics || {};
        const dMetrics = data.desktop?.metrics || {};

        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              pageName: data.pageName || item.pageName,
              status: 'completed',
              mobile: {
                screenType: 'Mobile',
                performance: mMetrics.performance ?? 0,
                accessibility: mMetrics.accessibility ?? 0,
                bestPractices: mMetrics.bestPractices ?? 0,
                seo: mMetrics.seo ?? 0,
                totalBlockingTime: mMetrics.totalBlockingTime ?? 0,
                screenshotUrl: data.mobile?.screenshotUrl || `https://image.thum.io/get/width/1200/crop/800/${currentUrl}`,
                screenshotDataUri: data.mobile?.screenshotDataUri,
                reportUrl:
                  data.mobile?.detailReportUrl ||
                  data.mobile?.reportUrl ||
                  `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(currentUrl)}&form_factor=mobile`,
                comment: '',
                status: 'completed',
              },
              desktop: {
                screenType: 'Desktop',
                performance: dMetrics.performance ?? 0,
                accessibility: dMetrics.accessibility ?? 0,
                bestPractices: dMetrics.bestPractices ?? 0,
                seo: dMetrics.seo ?? 0,
                totalBlockingTime: dMetrics.totalBlockingTime ?? 0,
                screenshotUrl: data.desktop?.screenshotUrl || `https://image.thum.io/get/width/1200/crop/800/${currentUrl}`,
                screenshotDataUri: data.desktop?.screenshotDataUri,
                reportUrl:
                  data.desktop?.detailReportUrl ||
                  data.desktop?.reportUrl ||
                  `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(currentUrl)}&form_factor=desktop`,
                comment: '',
                status: 'completed',
              },
            };
          })
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Audit failed';
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: errorMsg,
                  pageName: 'Error Loading',
                }
              : item
          )
        );
      }

      // 1000ms polite pause between audits to allow serverless memory recycling
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setIsAuditing(false);
    setProgress((prev) => {
      if (prev.status === 'cancelled') return prev;
      return {
        ...prev,
        completed: total,
        current: total,
        percentage: 100,
        status: 'completed',
      };
    });
  };

  // Re-audit an individual item with auto-retry
  const handleReauditUrl = async (url: string, itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'running',
              mobile: {
                ...item.mobile,
                performance: null,
                accessibility: null,
                bestPractices: null,
                seo: null,
                totalBlockingTime: null,
                screenshotUrl: null,
                screenshotDataUri: null,
                reportUrl: '',
                status: 'running',
              },
              desktop: {
                ...item.desktop,
                performance: null,
                accessibility: null,
                bestPractices: null,
                seo: null,
                totalBlockingTime: null,
                screenshotUrl: null,
                screenshotDataUri: null,
                reportUrl: '',
                status: 'running',
              },
            }
          : item
      )
    );

    try {
      const data = await fetchAuditWithRetry(url, apiKey, 2);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            pageName: data.pageName || item.pageName,
            status: 'completed',
            errorMessage: undefined,
            mobile: {
              ...item.mobile,
              performance: data.mobile?.metrics?.performance ?? 0,
              accessibility: data.mobile?.metrics?.accessibility ?? 0,
              bestPractices: data.mobile?.metrics?.bestPractices ?? 0,
              seo: data.mobile?.metrics?.seo ?? 0,
              totalBlockingTime: data.mobile?.metrics?.totalBlockingTime ?? 0,
              screenshotUrl: data.mobile?.screenshotUrl || null,
              screenshotDataUri: data.mobile?.screenshotDataUri || null,
              reportUrl:
                data.mobile?.detailReportUrl ||
                data.mobile?.reportUrl ||
                item.mobile.reportUrl,
              status: 'completed',
            },
            desktop: {
              ...item.desktop,
              performance: data.desktop?.metrics?.performance ?? 0,
              accessibility: data.desktop?.metrics?.accessibility ?? 0,
              bestPractices: data.desktop?.metrics?.bestPractices ?? 0,
              seo: data.desktop?.metrics?.seo ?? 0,
              totalBlockingTime: data.desktop?.metrics?.totalBlockingTime ?? 0,
              screenshotUrl: data.desktop?.screenshotUrl || null,
              screenshotDataUri: data.desktop?.screenshotDataUri || null,
              reportUrl:
                data.desktop?.detailReportUrl ||
                data.desktop?.reportUrl ||
                item.desktop.reportUrl,
              status: 'completed',
            },
          };
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-audit failed';
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: 'error', errorMessage: msg } : item
        )
      );
    }
  };

  const handleCancelAudit = () => {
    cancelRequestedRef.current = true;
    setIsAuditing(false);
  };

  const handleCommentChange = (itemId: string, screenType: ScreenType, comment: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (screenType === 'Mobile') {
          return { ...item, mobile: { ...item.mobile, comment } };
        } else {
          return { ...item, desktop: { ...item.desktop, comment } };
        }
      })
    );
  };

  const handlePageNameChange = (itemId: string, pageName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, pageName } : item))
    );
  };

  const handleMetricChange = (
    itemId: string,
    screenType: ScreenType,
    field: 'performance' | 'accessibility' | 'bestPractices' | 'seo' | 'totalBlockingTime' | 'reportUrl',
    value: number | string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const targetStrategy = screenType === 'Mobile' ? 'mobile' : 'desktop';
        const currentMetrics = screenType === 'Mobile' ? item.mobile : item.desktop;

        const updatedMetrics = {
          ...currentMetrics,
          [field]: typeof value === 'number' && isNaN(value) ? 0 : value,
        };

        // If numerical score changed, update reportUrl and card screenshot query params as well
        if (field !== 'reportUrl') {
          const p = field === 'performance' ? (value as number) : (currentMetrics.performance ?? 90);
          const a = field === 'accessibility' ? (value as number) : (currentMetrics.accessibility ?? 98);
          const b = field === 'bestPractices' ? (value as number) : (currentMetrics.bestPractices ?? 96);
          const s = field === 'seo' ? (value as number) : (currentMetrics.seo ?? 100);
          const tbtVal = field === 'totalBlockingTime' ? `${value} ms` : `${currentMetrics.totalBlockingTime ?? 180} ms`;

          const reportParams = new URLSearchParams({
            url: item.pageUrl,
            strategy: targetStrategy,
            name: item.pageName,
            p: p.toString(),
            a: a.toString(),
            b: b.toString(),
            s: s.toString(),
            tbt: tbtVal,
          });

          if (!updatedMetrics.reportUrl || !updatedMetrics.reportUrl.includes('analysis?url=')) {
            updatedMetrics.reportUrl = buildPageSpeedSnapshotUrl(item.pageUrl, targetStrategy);
          }
          if (!updatedMetrics.screenshotUrl || updatedMetrics.screenshotUrl.startsWith('/api/screenshot')) {
            updatedMetrics.screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/${item.pageUrl}`;
          }
        }

        return {
          ...item,
          [screenType === 'Mobile' ? 'mobile' : 'desktop']: updatedMetrics,
        };
      })
    );
  };

  const handleClearAll = () => {
    if (confirm('Clear all audit results?')) {
      setItems([]);
      setProgress({
        total: 0,
        completed: 0,
        current: 0,
        currentUrl: '',
        currentStrategy: '',
        percentage: 0,
        status: 'idle',
      });
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (i) => i.pageName.toLowerCase().includes(q) || i.pageUrl.toLowerCase().includes(q)
      );
    }

    // Filter by Score
    if (filterScore === 'needs-work') {
      result = result.filter(
        (i) =>
          (i.mobile.performance !== null && i.mobile.performance < 90) ||
          (i.desktop.performance !== null && i.desktop.performance < 90)
      );
    } else if (filterScore === 'critical') {
      result = result.filter(
        (i) =>
          (i.mobile.performance !== null && i.mobile.performance < 50) ||
          (i.desktop.performance !== null && i.desktop.performance < 50)
      );
    }

    return result;
  }, [items, searchTerm, filterScore]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header with branding & metadata accordion */}
      <AuditHeader
        metadata={metadata}
        onMetadataChange={setMetadata}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <UrlInputSection
          urlsText={urlsText}
          onUrlsTextChange={setUrlsText}
          onRunAudit={handleRunAudit}
          onLoadDemoReport={handleLoadDemoReport}
          isRunning={isAuditing}
        />

        {/* Live Progress Bar */}
        <AuditProgress progress={progress} onCancel={handleCancelAudit} />

        {/* Aggregate Stats Summary */}
        <ReportStats items={items} />

        {/* Export Toolbar (Search, Filter, Export Excel, Copy Google Sheets) */}
        {items.length > 0 && (
          <ExportToolbar
            items={items}
            metadata={metadata}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClearAll={handleClearAll}
            filterScore={filterScore}
            onFilterScoreChange={setFilterScore}
          />
        )}

        {/* Exact Spreadsheet Table (2 rows per URL, 12 columns) */}
        <ReportTable
          items={filteredItems}
          onCommentChange={handleCommentChange}
          onPageNameChange={handlePageNameChange}
          onMetricChange={handleMetricChange}
          onReauditUrl={handleReauditUrl}
          isAuditing={isAuditing}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>PageSpeed QA Report Generator</strong> — Styled for Google Sheets &amp; Microsoft Excel
          </span>
          <span className="font-mono text-slate-400">
            Compliant with Book.xlsx exact schema &amp; Lighthouse rules
          </span>
        </div>
      </footer>
    </div>
  );
}
