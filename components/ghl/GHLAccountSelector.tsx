'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface GHLAccount {
  id: string;
  account_name: string;
  location_id: string;
  is_primary: boolean;
}

export function GHLAccountSelector() {
  const [accounts, setAccounts] = useState<GHLAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GHLAccount | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ghl/accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');

      const data = await res.json();
      const fetchedAccounts: GHLAccount[] = data.accounts || [];
      setAccounts(fetchedAccounts);

      // Use server-side selected account if available, otherwise fall back to primary
      const serverSelected = data.selected_account_id
        ? fetchedAccounts.find((a) => a.id === data.selected_account_id)
        : null;
      const primary = fetchedAccounts.find((a) => a.is_primary);
      setSelectedAccount(serverSelected || primary || fetchedAccounts[0] || null);
    } catch (err) {
      console.error('Failed to fetch GHL accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleSelectAccount(account: GHLAccount) {
    if (account.id === selectedAccount?.id) {
      setIsOpen(false);
      return;
    }

    // Only warn if there's ACTUAL unsaved research
    const hasUnsavedResearch = sessionStorage.getItem('research_results_pending');

    if (hasUnsavedResearch) {
      const confirmed = window.confirm(
        `⚠️ You have unpushed research results.\n\n` +
        `Switching to "${account.account_name}" will lose your current research.\n\n` +
        `Continue anyway?`
      );
      if (!confirmed) return;
    }

    setSwitching(true);
    setError(null);

    try {
      const res = await fetch('/api/ghl/accounts/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      });

      if (!res.ok) throw new Error('Failed to switch account');

      setSelectedAccount(account);
      setIsOpen(false);

      // Clear research pending flag
      sessionStorage.removeItem('research_results_pending');

      // Smooth transition: just reload without the scary delay
      window.location.reload();
    } catch (err) {
      setSwitching(false);
      setError('Could not switch accounts. Please try again.');
    }
  }

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg animate-pulse">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <a
        href="/settings?tab=ghl"
        className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <Building2 className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">Add GHL Account</span>
      </a>
    );
  }

  return (
    <div className="relative">
      {/* Error toast */}
      {error && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 z-30 shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      <button
        onClick={() => !switching && setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select GHL account"
      >
        {switching ? (
          <Loader2 className="w-4 h-4 text-teal-600 flex-shrink-0 animate-spin" />
        ) : (
          <Building2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-slate-700 flex-1 text-left truncate">
          {switching ? 'Switching...' : selectedAccount?.account_name || 'Select Account'}
        </span>
        {!switching && (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && !switching && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20"
            role="listbox"
            aria-label="GHL accounts"
          >
            <div className="p-1.5">
              {accounts.map((account) => {
                const isSelected = selectedAccount?.id === account.id;
                return (
                  <button
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isSelected ? 'bg-teal-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Check
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-teal-600' : 'text-transparent'
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-900 truncate flex-1">
                      {account.account_name}
                    </span>
                    {account.is_primary && (
                      <span
                        className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded flex-shrink-0"
                        title="Default account used when no other is selected"
                      >
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-1.5">
              <a
                href="/settings?tab=ghl"
                className="block w-full px-3 py-2 text-sm text-center text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
              >
                Manage Accounts
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
