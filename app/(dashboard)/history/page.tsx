'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Clock,
  Building2,
  Search,
  Filter,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Zap,
  Microscope,
} from 'lucide-react';

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
}

export default function HistoryPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('research_sessions')
        .select('*')
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
    if (score >= 0.8) return 'text-emerald-700 bg-emerald-100';
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Research History</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              View and manage your past research sessions
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            {sessions.length} sessions
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'quick', label: 'Quick' },
                { id: 'standard', label: 'Standard' },
                { id: 'deep', label: 'Deep' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterType(filter.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === filter.id
                      ? 'bg-emerald-500 text-white'
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
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Company
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
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600 capitalize">
                                {session.research_type}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${getConfidenceColor(
                                session.confidence_score
                              )}`}
                            >
                              {session.confidence_score
                                ? `${Math.round(session.confidence_score * 100)}%`
                                : '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-slate-600">{session.signals_found}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-slate-600">
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
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : session.status === 'failed' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            )}
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/history/${session.id}`}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex"
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
          ) : (
            <div className="card p-12 text-center">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">No research history</h3>
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
