'use client';

import React from 'react';
import { X, ExternalLink, Download, Smartphone, Monitor } from 'lucide-react';
import { ScreenType } from '@/lib/types';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
  pageUrl: string;
  screenType: ScreenType;
  screenshotUrl: string | null;
  screenshotDataUri?: string | null;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  pageName,
  pageUrl,
  screenType,
  screenshotUrl,
  screenshotDataUri,
}) => {
  if (!isOpen) return null;

  const imgSrc = screenshotDataUri || screenshotUrl || '';
  const isMobile = screenType === 'Mobile';
  const fileExt = imgSrc.startsWith('data:image/svg+xml') || imgSrc.includes('.svg') ? 'svg' : 'jpg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isMobile ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Smartphone className="w-3.5 h-3.5" /> Mobile Audit View
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Monitor className="w-3.5 h-3.5" /> Desktop Audit View
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-100">{pageName}</h3>
            </div>
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
            >
              {pageUrl} <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {imgSrc && (
              <a
                href={imgSrc}
                download={`${pageName.replace(/[^a-zA-Z0-9]/g, '_')}_${screenType}.${fileExt}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                title="Download report card image"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screenshot Content */}
        <div className="flex-1 overflow-auto py-4 flex items-center justify-center bg-slate-950/60 rounded-xl my-4 p-4 border border-slate-800/80">
          {imgSrc ? (
            <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={`${pageName} ${screenType} Screenshot`}
                className="w-full h-auto object-contain rounded-xl"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.currentTarget as HTMLImageElement).src = `https://image.thum.io/get/width/1200/crop/800/${pageUrl}`;
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p className="text-base font-medium">No screenshot available for this audit.</p>
              <p className="text-xs text-slate-500 mt-1">
                Run an audit to generate a live snapshot.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Captured via Google Lighthouse Engine</span>
          {screenshotUrl && (
            <span className="font-mono text-[11px] truncate max-w-sm text-slate-500">
              Link: {screenshotUrl}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
