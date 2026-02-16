'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail,
  Copy,
  Check,
  RefreshCw,
  Send,
  Save,
  ChevronLeft,
  Loader2,
  User,
  Building2,
} from 'lucide-react';
import type { GHLCompany, Contact } from '../OutreachWizard';

// Dynamic import for modal (only loaded when opened)
const SendConfirmationModal = dynamic(
  () => import('../SendConfirmationModal').then(mod => mod.SendConfirmationModal),
  { ssr: false }
);

interface EmailEditorStepProps {
  company: GHLCompany | null;
  contact: Contact | null;
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onRegenerate: () => void;
  onSend: () => void;
  saving: boolean;
  sending: boolean;
  generating: boolean;
  hasChanges: boolean;
}

export function EmailEditorStep({
  company,
  contact,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onBack,
  onSaveDraft,
  onRegenerate,
  onSend,
  saving,
  sending,
  generating,
  hasChanges,
}: EmailEditorStepProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const copyToClipboard = async () => {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendClick = () => {
    if (!contact?.email) return;
    setShowConfirmModal(true);
  };

  const handleConfirmedSend = () => {
    setShowConfirmModal(false);
    onSend();
  };

  const canSend = !!(subject?.trim() && body?.trim() && contact?.email);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{company?.companyName || 'Unknown Company'}</p>
            <p className="text-sm text-slate-500">{company?.industry || ''}</p>
          </div>
        </div>
        {contact && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{contact.name}</p>
              <p className="text-sm text-slate-500">{contact.email || 'No email'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Email Editor Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Email Editor</h3>
              <p className="text-sm text-slate-500">
                {hasChanges && <span className="text-amber-500">Unsaved changes</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              disabled={generating}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="Regenerate"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {generating ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-slate-500">Regenerating email...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subject Editor */}
            <div>
              <label
                htmlFor="email-subject"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider block"
              >
                Subject
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                className={`input mt-1 ${!subject?.trim() ? 'border-amber-300 focus:ring-amber-500' : ''}`}
                placeholder="Email subject..."
                aria-required="true"
                aria-invalid={!subject?.trim()}
                aria-describedby={!subject?.trim() ? 'subject-error' : undefined}
              />
              {!subject?.trim() && (
                <p id="subject-error" className="text-xs text-amber-600 mt-1" role="alert">
                  Subject is required
                </p>
              )}
            </div>

            {/* Body Editor */}
            <div>
              <label
                htmlFor="email-body"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider block"
              >
                Body
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                rows={14}
                className={`input mt-1 resize-none font-mono text-sm ${!body?.trim() ? 'border-amber-300 focus:ring-amber-500' : ''}`}
                placeholder="Email body..."
                aria-required="true"
                aria-invalid={!body?.trim()}
                aria-describedby={!body?.trim() ? 'body-error' : undefined}
              />
              {!body?.trim() && (
                <p id="body-error" className="text-xs text-amber-600 mt-1" role="alert">
                  Body is required
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          disabled={generating || sending}
          className="flex items-center justify-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1" />
        <button
          onClick={onSaveDraft}
          disabled={saving || !subject?.trim() || !body?.trim()}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Draft
        </button>
        <button
          onClick={handleSendClick}
          disabled={sending || !canSend}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          title={!canSend && contact && !contact.email ? 'Contact has no email address' : undefined}
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send via GHL
            </>
          )}
        </button>
      </div>

      {/* Warning Messages */}
      {!contact && (
        <p className="text-center text-amber-600 text-sm">
          No contact selected. Please go back and select a contact to send the email.
        </p>
      )}
      {contact && !contact.email && (
        <p className="text-center text-amber-600 text-sm">
          The selected contact has no email address. Please select a different contact.
        </p>
      )}
      {canSend && (
        <p className="text-center text-emerald-600 text-sm">
          Ready to send to {contact?.name}
        </p>
      )}

      {/* Send Confirmation Modal */}
      <SendConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSend}
        sending={sending}
        recipientName={contact?.name || 'Unknown'}
        recipientEmail={contact?.email || ''}
        subject={subject}
        body={body}
      />
    </div>
  );
}
