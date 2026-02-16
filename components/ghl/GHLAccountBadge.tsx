'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Compact badge showing active GHL account name.
 * Designed for mobile nav bars where space is limited.
 * Links to settings for full account management.
 */
export function GHLAccountBadge() {
  const [accountName, setAccountName] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch('/api/ghl/accounts');
      if (!res.ok) return;
      const data = await res.json();
      const accounts = data.accounts || [];
      if (!accounts.length) return;

      const selected = data.selected_account_id
        ? accounts.find((a: { id: string }) => a.id === data.selected_account_id)
        : null;
      const primary = accounts.find((a: { is_primary: boolean }) => a.is_primary);
      const active = selected || primary || accounts[0];
      setAccountName(active?.account_name || null);
    } catch {
      // Silent fail - badge is informational only
    }
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  if (!accountName) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-full max-w-[160px]">
      <Building2 className="w-3 h-3 text-teal-600 flex-shrink-0" />
      <span className="text-xs font-medium text-teal-700 truncate">
        {accountName}
      </span>
    </div>
  );
}
