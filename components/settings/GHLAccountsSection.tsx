'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Star, StarOff, Edit2, Check, X, Loader2, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface GHLAccount {
  id: string;
  account_name: string;
  location_id: string;
  location_name: string | null;
  is_primary: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export function GHLAccountsSection() {
  const [accounts, setAccounts] = useState<GHLAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [accountName, setAccountName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ghl/accounts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAccounts(data.accounts || []);
      // Track which account is currently active (selected in sidebar)
      setActiveAccountId(data.selected_account_id || null);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleAddAccount() {
    if (!accountName.trim() || !locationId.trim() || !accessToken.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ghl/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName.trim(),
          location_id: locationId.trim(),
          access_token: accessToken.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create account');
      }

      setAccountName('');
      setLocationId('');
      setAccessToken('');
      setShowAccessToken(false);
      setShowAddForm(false);
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateName(id: string) {
    if (!editName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ghl/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: editName.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setEditingId(null);
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPrimary(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/ghl/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      });

      if (!res.ok) throw new Error('Failed to set as default');
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set as default');
    }
  }

  async function handleDelete(account: GHLAccount) {
    const confirmed = window.confirm(
      `Delete "${account.account_name}"?\n\nThis will permanently disconnect this GHL account. Any data synced from this account will remain, but no new syncs will occur.`
    );
    if (!confirmed) return;

    setError(null);
    try {
      const res = await fetch(`/api/ghl/accounts/${account.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  // Determine which account is "active" for display purposes
  function isActive(account: GHLAccount): boolean {
    if (activeAccountId) return account.id === activeAccountId;
    // Fallback: if no server selection, primary is active
    return account.is_primary;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Default account explanation */}
      {accounts.length > 1 && (
        <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            The <span className="font-semibold text-yellow-600">starred</span> account is your <strong>default</strong> &mdash;
            it&apos;s used automatically when you log in. The <span className="font-semibold text-teal-600">Active</span> badge
            shows which account is currently selected in the sidebar. You can switch accounts anytime from the sidebar dropdown.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">Connected Accounts</h4>
          <p className="text-sm text-slate-500 mt-0.5">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
          }}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Main Account, Client XYZ"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location ID
              </label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="abc123xyz789"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Find this in GHL Settings &rarr; Business Profile
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                API Key (Private Integration Token)
              </label>
              <div className="relative">
                <input
                  type={showAccessToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAccessToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Get this from GHL Settings &rarr; API Keys
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddAccount}
                disabled={saving || !accountName.trim() || !locationId.trim() || !accessToken.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save Account'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setAccountName('');
                  setLocationId('');
                  setAccessToken('');
                  setShowAccessToken(false);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">
            No GHL accounts connected yet. Add your first account to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => {
            const accountIsActive = isActive(account);
            return (
              <div
                key={account.id}
                className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                  accountIsActive ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
                }`}
              >
                {/* Primary Star */}
                <button
                  onClick={() => !account.is_primary && handleSetPrimary(account.id)}
                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                    account.is_primary
                      ? 'text-yellow-500 cursor-default'
                      : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                  title={
                    account.is_primary
                      ? 'Default account (used when you log in)'
                      : 'Click to set as default account'
                  }
                  disabled={account.is_primary}
                >
                  {account.is_primary ? (
                    <Star className="w-5 h-5 fill-current" />
                  ) : (
                    <StarOff className="w-5 h-5" />
                  )}
                </button>

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  {editingId === account.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateName(account.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="input flex-1 py-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateName(account.id)}
                        disabled={saving || !editName.trim()}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-900 truncate">
                          {account.account_name}
                        </h4>
                        {account.is_primary && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded flex-shrink-0">
                            Default
                          </span>
                        )}
                        {accountIsActive && (
                          <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        Location: {account.location_id}
                      </p>
                      {account.last_sync_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Last synced: {new Date(account.last_sync_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editingId !== account.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(account.id);
                        setEditName(account.account_name);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
                      disabled={accounts.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={accounts.length <= 1 ? 'Cannot delete last account' : `Delete ${account.account_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
