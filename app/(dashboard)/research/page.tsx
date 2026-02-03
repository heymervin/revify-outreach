'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Zap,
  Microscope,
  Building2,
  Globe,
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Send,
  Copy,
  ExternalLink,
} from 'lucide-react';

type ResearchType = 'quick' | 'standard' | 'deep';

interface ResearchResult {
  company_profile: {
    confirmed_name: string;
    industry: string;
    estimated_revenue?: string;
    employee_count?: string;
    headquarters?: string;
  };
  recent_signals: Array<{
    signal_type: string;
    description: string;
    source: string;
    credibility_score: number;
  }>;
  pain_point_hypotheses: Array<{
    hypothesis: string;
    evidence: string;
  }>;
  persona_angles: Record<string, {
    primary_hook: string;
    supporting_point: string;
  }>;
  research_confidence: {
    overall_score: number;
  };
}

const researchTypes = [
  {
    id: 'quick' as ResearchType,
    label: 'Quick',
    icon: Zap,
    credits: 1,
    description: 'Fast overview',
  },
  {
    id: 'standard' as ResearchType,
    label: 'Standard',
    icon: Search,
    credits: 2,
    description: 'Comprehensive',
  },
  {
    id: 'deep' as ResearchType,
    label: 'Deep',
    icon: Microscope,
    credits: 3,
    description: 'Full intelligence',
  },
];

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const initialType = (searchParams.get('type') as ResearchType) || 'standard';

  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [researchType, setResearchType] = useState<ResearchType>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_website: companyWebsite,
          industry,
          research_type: researchType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Research failed');
      }

      setResult(data.research);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-100';
    if (score >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Research Company</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Get AI-powered insights on any company
            </p>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Research Form */}
          <form onSubmit={handleResearch} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="label flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input"
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  Website (optional)
                </label>
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  Industry (optional)
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="input"
                  placeholder="e.g., Manufacturing"
                />
              </div>
            </div>

            {/* Research Type Selection */}
            <div className="mb-6">
              <label className="label">Research Depth</label>
              <div className="grid grid-cols-3 gap-3">
                {researchTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = researchType === type.id;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setResearchType(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-slate-500">{type.credits} credit{type.credits > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Start Research
                </>
              )}
            </button>
          </form>

          {/* Results */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Company Profile */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {result.company_profile.confirmed_name}
                    </h3>
                    <p className="text-slate-500">{result.company_profile.industry}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(
                      result.research_confidence.overall_score
                    )}`}
                  >
                    {Math.round(result.research_confidence.overall_score * 100)}% Confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {result.company_profile.estimated_revenue && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="font-semibold text-slate-900">
                        {result.company_profile.estimated_revenue}
                      </p>
                    </div>
                  )}
                  {result.company_profile.employee_count && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Employees</p>
                      <p className="font-semibold text-slate-900">
                        {result.company_profile.employee_count}
                      </p>
                    </div>
                  )}
                  {result.company_profile.headquarters && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Headquarters</p>
                      <p className="font-semibold text-slate-900">
                        {result.company_profile.headquarters}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Signals */}
              {result.recent_signals.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Signals</h3>
                  <div className="space-y-3">
                    {result.recent_signals.slice(0, 5).map((signal, index) => (
                      <div
                        key={index}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold mb-2">
                              {signal.signal_type}
                            </span>
                            <p className="text-slate-700">{signal.description}</p>
                            <p className="text-xs text-slate-500 mt-1">Source: {signal.source}</p>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {Math.round(signal.credibility_score * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pain Points */}
              {result.pain_point_hypotheses.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Pain Point Hypotheses</h3>
                  <div className="space-y-3">
                    {result.pain_point_hypotheses.map((point, index) => (
                      <div key={index} className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="font-medium text-slate-900 mb-1">{point.hypothesis}</p>
                        <p className="text-sm text-slate-600">{point.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button className="btn-primary flex-1">
                  <Send className="w-4 h-4" />
                  Push to GHL
                </button>
                <button className="btn-secondary flex-1">
                  <Copy className="w-4 h-4" />
                  Copy Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
