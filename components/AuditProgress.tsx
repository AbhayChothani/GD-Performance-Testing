'use client';

import React from 'react';
import { Loader2, StopCircle, CheckCircle2, Clock } from 'lucide-react';
import { BatchProgress } from '@/lib/types';

interface AuditProgressProps {
  progress: BatchProgress;
  onCancel: () => void;
}

export const AuditProgress: React.FC<AuditProgressProps> = ({ progress, onCancel }) => {
  if (progress.status === 'idle') return null;

  const isFinished = progress.status === 'completed';
  const isCancelled = progress.status === 'cancelled';

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 mb-8 shadow-xl animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          {progress.status === 'running' ? (
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          ) : isFinished ? (
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          )}

          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              {progress.status === 'running' && (
                <span>
                  Auditing URL {progress.current} of {progress.total} (Mobile & Desktop)...
                </span>
              )}
              {isFinished && <span>Audit Completed Successfully! ({progress.total} URLs)</span>}
              {isCancelled && <span>Audit Stopped by User</span>}
            </h3>
            {progress.status === 'running' && progress.currentUrl && (
              <p className="text-xs text-slate-400 font-mono truncate max-w-xl">
                Active: <span className="text-emerald-400">{progress.currentUrl}</span>
              </p>
            )}
          </div>
        </div>

        {progress.status === 'running' && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition self-start sm:self-auto"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop Audit</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isFinished
              ? 'bg-teal-400'
              : isCancelled
              ? 'bg-amber-400'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
        />
      </div>

      {/* Stats row below bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
        <span>Progress: {progress.percentage}%</span>
        <span>
          {progress.completed} of {progress.total} pages tested ({progress.completed * 2} device audits)
        </span>
      </div>
    </div>
  );
};
