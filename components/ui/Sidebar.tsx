'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Search,
  Layers,
  Mail,
  Clock,
  Settings,
  LogOut,
  HelpCircle,
  Wallet,
} from 'lucide-react';

interface SidebarProps {
  user: {
    full_name?: string;
    email: string;
    avatar_url?: string;
  } | null;
  subscription: {
    plan_id: string;
    credits_used: number;
    credits_limit: number;
  } | null;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/research', label: 'Research', icon: Search },
  { href: '/bulk', label: 'Bulk Research', icon: Layers },
  { href: '/email', label: 'Email Outreach', icon: Mail },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ user, subscription }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const creditsRemaining = subscription
    ? subscription.credits_limit - subscription.credits_used
    : 0;
  const creditsPercentage = subscription
    ? (creditsRemaining / subscription.credits_limit) * 100
    : 0;

  const planLabels: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg tracking-tight">Revify</h1>
            <p className="text-xs text-slate-500 -mt-0.5">Outreach Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Credits Widget */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Credits</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {planLabels[subscription?.plan_id || 'free']}
            </span>
          </div>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-bold text-slate-900">{creditsRemaining}</span>
            <span className="text-slate-400 text-sm mb-1">/ {subscription?.credits_limit || 10}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditsPercentage > 20
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500'
              }`}
              style={{ width: `${creditsPercentage}%` }}
            />
          </div>
          {subscription?.plan_id === 'free' && (
            <Link
              href="/settings?tab=billing"
              className="block w-full mt-3 text-center text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              Upgrade Plan →
            </Link>
          )}
        </div>
      </div>

      {/* Help Link */}
      <div className="px-4 pb-2">
        <Link
          href="/help"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          Help & Support
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
