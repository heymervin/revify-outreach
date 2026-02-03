'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  Globe,
  Briefcase,
  Calendar,
  Clock,
  Zap,
  Search,
  Microscope,
  Send,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface ResearchSession {
  id: string;
  company_name: string;
  company_website?: string;
  industry?: string;
  research_type: string;
  confidence_score?: number;
  signals_found: number;
  pain_points_found: number;
  status: string;
  credits_used: number;
  duration_ms?: number;
  ghl_company_id?: string;
  ghl_pushed_at?: string;
  created_at: string;
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSession(params.id as string);
    }
  }, [params.id]);

  const loadSession = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setSession(data);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const pushToGHL = async () => {
    if (!session) return;

    setPushing(true);
    try {
      const response = await fetch('/api/ghl/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          research_data: {
            company_profile: {
              confirmed_name: session.company_name,
              industry: session.industry,
            },
          },
        }),
      });

      if (response.ok) {
        // Reload session to get updated GHL info
        loadSession(session.id);
      }
    } catch (error) {
      console.error('Failed to push to GHL:', error);
    } finally {
      setPushing(false);
    }
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Session not found</h2>
        <p className="text-slate-500 mb-6">This research session doesn't exist or was deleted.</p>
        <Link href="/history" className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(session.research_type);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{session.company_name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Research details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="btn-ghost"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
            <Link href={`/email?session=${session.id}`} className="btn-secondary">
              <Mail className="w-4 h-4" />
              Generate Email
            </Link>
            <button
              onClick={pushToGHL}
              disabled={pushing || !!session.ghl_pushed_at}
              className="btn-primary disabled:opacity-50"
            >
              {pushing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {session.ghl_pushed_at ? 'Pushed to GHL' : 'Push to GHL'}
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Company Profile Card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{session.company_name}</h3>
                  <p className="text-slate-500">{session.industry || 'Unknown industry'}</p>
                </div>
              </div>
              <span
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${getConfidenceColor(
                  session.confidence_score
                )}`}
              >
                {session.confidence_score
                  ? `${Math.round(session.confidence_score * 100)}% Confidence`
                  : 'No confidence score'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {session.company_website && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-medium">Website</span>
                  </div>
                  <a
                    href={session.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline text-sm flex items-center gap-1"
                  >
                    {new URL(session.company_website).hostname}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium">Industry</span>
                </div>
                <p className="text-slate-900 text-sm font-medium">
                  {session.industry || 'Unknown'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <TypeIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Research Type</span>
                </div>
                <p className="text-slate-900 text-sm font-medium capitalize">
                  {session.research_type}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Duration</span>
                </div>
                <p className="text-slate-900 text-sm font-medium">
                  {session.duration_ms ? `${(session.duration_ms / 1000).toFixed(1)}s` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {session.signals_found}
              </div>
              <div className="text-sm text-slate-500">Signals Found</div>
            </div>
            <div className="card p-6 text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">
                {session.pain_points_found}
              </div>
              <div className="text-sm text-slate-500">Pain Points</div>
            </div>
            <div className="card p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {session.credits_used}
              </div>
              <div className="text-sm text-slate-500">Credits Used</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="card p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Session Details</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Session ID</span>
                <span className="text-slate-900 font-mono">{session.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-slate-900 capitalize">{session.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">
                  {new Date(session.created_at).toLocaleString()}
                </span>
              </div>
              {session.ghl_pushed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Pushed to GHL</span>
                  <span className="text-emerald-600">
                    {new Date(session.ghl_pushed_at).toLocaleString()}
                  </span>
                </div>
              )}
              {session.ghl_company_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">GHL Contact ID</span>
                  <span className="text-slate-900 font-mono">{session.ghl_company_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Note about full results */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Note:</strong> Full research results (signals, pain points, talking points) are
            stored in GoHighLevel. Push this research to GHL to access the complete data, or run a
            new research session.
          </div>
        </div>
      </div>
    </div>
  );
}
