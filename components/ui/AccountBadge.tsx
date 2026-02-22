'use client';

import { Building2 } from 'lucide-react';

interface AccountBadgeProps {
  account_name: string;
  is_active: boolean;
}

/**
 * Badge showing which GHL account a research entry belongs to.
 * Uses teal styling if it matches the active account, gray otherwise.
 */
export function AccountBadge({ account_name, is_active }: AccountBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        is_active
          ? 'bg-teal-50 border border-teal-200 text-teal-700'
          : 'bg-slate-50 border border-slate-200 text-slate-600'
      }`}
    >
      <Building2 className={`w-3 h-3 ${is_active ? 'text-teal-600' : 'text-slate-400'}`} />
      <span className="truncate max-w-[120px]">{account_name}</span>
    </div>
  );
}
