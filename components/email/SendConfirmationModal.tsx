'use client';

import { X, Send, Loader2, Mail, User } from 'lucide-react';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sending: boolean;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

export function SendConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  sending,
  recipientName,
  recipientEmail,
  subject,
  body,
}: SendConfirmationModalProps) {
  if (!isOpen) return null;

  // Truncate body preview to 200 characters
  const bodyPreview =
    body.length > 200 ? body.substring(0, 200) + '...' : body;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={sending ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Confirm Send Email
          </h3>
          {!sending && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipient Info */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{recipientName}</p>
              <p className="text-sm text-slate-500 truncate">{recipientEmail}</p>
            </div>
          </div>

          {/* Subject Preview */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subject
            </label>
            <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-800">{subject}</p>
            </div>
          </div>

          {/* Body Preview */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Message Preview
            </label>
            <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {bodyPreview}
              </p>
            </div>
          </div>

          {/* Sending via GHL note */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail className="w-4 h-4" />
            <span>This email will be sent via GoHighLevel</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
