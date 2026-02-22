'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Clock,
  Building2,
  Search,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Zap,
  Microscope,
  Send,
} from 'lucide-react';
import { AccountBadge } from '@/components/ui';

interface ResearchSession {
  id: string;
  company_name: string;
  company_website?: string;
  industry?: string;
  research_type: 'quick' | 'standard' | 'deep';
  confidence_score?: number;
  signals_found: number;
  pain_points_found: number;
  status: string;
  credits_used: number;
  duration_ms?: number;
  created_at: string;
  ghl_account_id?: string;
  ghl_accounts?: { account_name: string } | null;
}

export default function HistoryPage() {
  // Use ref to prevent re-creating Supabase client and duplicate fetches
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const hasFetched = useRef(false);

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // Fetch active account ID
  const fetchActiveAccount = useCallback(async () => {
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
      setActiveAccountId(active?.id || null);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadSessions();
    fetchActiveAccount();
  }, [fetchActiveAccount]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('research_sessions')
        .select('*, ghl_accounts(account_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.industry?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'completed' && session.status === 'completed') ||
      (filterType === 'failed' && session.status === 'failed') ||
      session.research_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quick':
        return Zap;
      case 'deep':
        return Microscope;
      default:
        return Search;
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-slate-400 bg-slate-100';
    if (score >= 0.8) return 'text-teal-700 bg-teal-100';
    if (score >= 0.6) return 'text-amber-700 bg-amber-100';
    return 'text-red-700 bg-red-100';
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} min ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'quick', label: 'Quick' },
    { id: 'standard', label: 'Standard' },
    { id: 'deep', label: 'Deep' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Research History</h2>
            <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">
              View and manage your past research sessions
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="font-data">{sessions.length}</span> sessions
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterType(filter.id)}
                  className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    filterType === filter.id
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : filteredSessions.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredSessions.map((session) => {
                  const TypeIcon = getTypeIcon(session.research_type);
                  return (
                    <Link
                      key={session.id}
                      href={`/history/${session.id}`}
                      className="card p-4 block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{session.company_name}</p>
                              <p className="text-xs text-slate-500">{session.industry || 'Unknown industry'}</p>
                              {session.ghl_accounts?.account_name && (
                                <div className="mt-1">
                                  <AccountBadge
                                    account_name={session.ghl_accounts.account_name}
                                    is_active={session.ghl_account_id === activeAccountId}
                                  />
                                </div>
                              )}
                            </div>
                            {session.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                            ) : session.status === 'failed' ? (
                              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            ) : (
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400 flex-shrink-0" />
                            )}
                          </div>

                          {/* Metrics row */}
                          <div className="flex items-center gap-3 mt-3 text-xs">
                            <div className="flex items-center gap-1">
                              <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-600 capitalize">{session.research_type}</span>
                            </div>
                            {session.confidence_score && (
                              <span className={`font-data px-2 py-0.5 rounded-lg ${getConfidenceColor(session.confidence_score)}`}>
                                {Math.round(session.confidence_score * 100)}%
                              </span>
                            )}
                            <span className="text-slate-500 font-data">{formatDuration(session.duration_ms)}</span>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(session.created_at)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 self-center" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Signals
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((session) => {
                        const TypeIcon = getTypeIcon(session.research_type);
                        return (
                          <tr
                            key={session.id}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{session.company_name}</p>
                                  <p className="text-xs text-slate-500">
                                    {session.industry || 'Unknown industry'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {session.ghl_accounts?.account_name ? (
                                <AccountBadge
                                  account_name={session.ghl_accounts.account_name}
                                  is_active={session.ghl_account_id === activeAccountId}
                                />
                              ) : (
                                <span className="text-sm text-slate-400">&mdash;</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600 capitalize">
                                  {session.research_type}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold font-data ${getConfidenceColor(
                                  session.confidence_score
                                )}`}
                              >
                                {session.confidence_score
                                  ? `${Math.round(session.confidence_score * 100)}%`
                                  : '-'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-slate-600 font-data">{session.signals_found}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-slate-600 font-data">
                                {formatDuration(session.duration_ms)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Calendar className="w-4 h-4" />
                                {formatDate(session.created_at)}
                              </div>
                            </td>
                            <td className="p-4">
                              {session.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-teal-500" />
                              ) : session.status === 'failed' ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                              )}
                            </td>
                            <td className="p-4">
                              <Link
                                href={`/history/${session.id}`}
                                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2 font-heading">No research history</h3>
              <p className="text-slate-500 text-sm mb-6">
                {searchQuery || filterType !== 'all'
                  ? 'No sessions match your filters'
                  : 'Start researching companies to build your history'}
              </p>
              <Link href="/research" className="btn-primary inline-flex">
                <Search className="w-4 h-4" />
                Start Research
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
