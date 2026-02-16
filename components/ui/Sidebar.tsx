'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Settings,
  Mail,
  LogOut,
  Zap,
  MoreHorizontal,
  X,
  Database,
  Globe,
} from 'lucide-react';
import { GHLAccountSelector, GHLAccountBadge } from '@/components/ghl';

interface SidebarProps {
  user?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
  subscription?: {
    plan_id?: string;
    credits_used?: number;
    credits_limit?: number;
  } | null;
}

// Shared navigation items - exported for use in other components
export const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Research', href: '/research', icon: Search },
  { name: 'Apollo', href: '/apollo', icon: Globe },
  { name: 'Bulk', href: '/bulk', icon: Database },
  { name: 'Outreach', href: '/email', icon: Mail },
  { name: 'Analytics', href: '/history', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Mobile bottom nav shows first 4 items + More menu
const mobileNavItems = navigation.slice(0, 4);
const moreItems = navigation.slice(4);

// Desktop Sidebar Component
export default function Sidebar({ user, subscription }: SidebarProps) {
  const pathname = usePathname();
  const creditsUsed = subscription?.credits_used || 0;
  const creditsLimit = subscription?.credits_limit || 10;
  const creditsRemaining = creditsLimit - creditsUsed;
  const creditsPercent = (creditsUsed / creditsLimit) * 100;
  const planLabel = subscription?.plan_id === 'free' ? 'Free Plan' :
                   subscription?.plan_id === 'starter' ? 'Starter Plan' :
                   subscription?.plan_id === 'pro' ? 'Pro Plan' : 'Enterprise';

  return (
    <aside
      className="hidden lg:flex w-64 min-h-screen bg-white border-r border-slate-200 flex-col"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 font-heading">Revify</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Primary">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus:outline-none ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* GHL Account Selector */}
      <div className="p-4 border-t border-slate-100">
        <GHLAccountSelector />
      </div>

      {/* Credits Widget */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Credits</span>
            <span className="text-xs font-semibold text-slate-900 font-data">
              {creditsRemaining} / {creditsLimit}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                creditsPercent > 80 ? 'bg-red-500' : creditsPercent > 50 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(creditsPercent, 100)}%` }}
            />
          </div>
          {creditsRemaining <= 2 && (
            <p className="text-xs text-amber-600 mt-2">Running low on credits</p>
          )}
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-slate-600">
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.full_name || user?.email || 'User'}
            </p>
            <p className="text-xs text-slate-500">{planLabel}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

// More Menu Component for overflow navigation items
function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const hasActiveItem = moreItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[64px] ${
          hasActiveItem ? 'text-teal-700' : 'text-slate-500'
        }`}
      >
        <MoreHorizontal className={`w-6 h-6 mb-1 ${hasActiveItem ? 'text-teal-700' : 'text-slate-400'}`} />
        <span className="text-xs font-medium">More</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 mb-1">
              <span className="text-xs font-medium text-slate-500">More options</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {moreItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[44px] ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Mobile Bottom Navigation Component
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-area-bottom">
      {/* Active GHL account indicator */}
      <div className="flex justify-center py-1 border-b border-slate-100">
        <GHLAccountBadge />
      </div>

      <div className="flex items-center justify-around px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 min-h-[56px] min-w-[64px] transition-colors ${
                isActive ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
        {/* More menu for overflow items */}
        <MoreMenu pathname={pathname} />
      </div>
    </nav>
  );
}
