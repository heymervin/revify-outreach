'use client';

import { X, AlertTriangle, Clock } from 'lucide-react';

interface ReplaceResearchModalProps {
  companyName: string;
  lastSyncedAt: string | null;
  onKeepExisting: () => void;
  onReplace: () => void;
  onClose: () => void;
  isReplacing?: boolean;
}

export function ReplaceResearchModal({
  companyName,
  lastSyncedAt,
  onKeepExisting,
  onReplace,
  onClose,
  isReplacing = false,
}: ReplaceResearchModalProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Existing Research Found</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isReplacing}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-slate-700 mb-4">
            <span className="font-semibold text-slate-900">{companyName}</span> already has research synced to GHL.
          </p>

          {lastSyncedAt && (
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 bg-slate-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>Last synced: {formatDate(lastSyncedAt)}</span>
            </div>
          )}

          <p className="text-sm text-slate-600">
            Would you like to replace the existing research in GHL with your new research?
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onKeepExisting}
            disabled={isReplacing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Keep Existing
          </button>
          <button
            onClick={onReplace}
            disabled={isReplacing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isReplacing ? 'Replacing...' : 'Replace with New'}
          </button>
        </div>
      </div>
    </div>
  );
}
