'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Layers,
  Upload,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  CloudDownload,
  FileSpreadsheet,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  selected: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

type Tab = 'selection' | 'progress' | 'results';

export default function BulkResearchPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('selection');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [csvInput, setCsvInput] = useState('');
  const [ghlCompanies, setGhlCompanies] = useState<any[]>([]);
  const [loadingGhl, setLoadingGhl] = useState(false);

  // Load companies from GHL
  const loadFromGHL = async () => {
    setLoadingGhl(true);
    try {
      const response = await fetch('/api/ghl/companies');
      const data = await response.json();

      if (data.companies) {
        const mapped = data.companies.map((c: any) => ({
          id: c.id,
          name: c.name || c.businessName,
          website: c.website,
          industry: c.industry,
          selected: false,
          status: 'pending' as const,
        }));
        setGhlCompanies(mapped);
        setCompanies(mapped);
      }
    } catch (error) {
      console.error('Failed to load GHL companies:', error);
    } finally {
      setLoadingGhl(false);
    }
  };

  // Parse CSV input
  const parseCSV = () => {
    const lines = csvInput.trim().split('\n');
    const parsed: Company[] = lines.map((line, index) => {
      const [name, website, industry] = line.split(',').map((s) => s.trim());
      return {
        id: `csv-${index}`,
        name: name || '',
        website: website || '',
        industry: industry || '',
        selected: true,
        status: 'pending' as const,
      };
    }).filter((c) => c.name);

    setCompanies(parsed);
  };

  // Toggle company selection
  const toggleSelect = (id: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // Select/deselect all
  const toggleAll = (selected: boolean) => {
    setCompanies((prev) => prev.map((c) => ({ ...c, selected })));
  };

  // Start bulk research
  const startResearch = async () => {
    const selected = companies.filter((c) => c.selected);
    if (selected.length === 0) return;

    setProcessing(true);
    setPaused(false);
    setActiveTab('progress');
    setCurrentIndex(0);

    for (let i = 0; i < selected.length; i++) {
      if (paused) break;

      const company = selected[i];
      setCurrentIndex(i);

      // Update status to processing
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, status: 'processing' } : c))
      );

      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: company.name,
            company_website: company.website,
            industry: company.industry,
            research_type: 'standard',
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setCompanies((prev) =>
            prev.map((c) =>
              c.id === company.id ? { ...c, status: 'completed', result: data.research } : c
            )
          );
        } else {
          throw new Error(data.error || 'Research failed');
        }
      } catch (error) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === company.id
              ? { ...c, status: 'failed', error: error instanceof Error ? error.message : 'Failed' }
              : c
          )
        );
      }

      // Small delay between requests
      if (i < selected.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setProcessing(false);
    setActiveTab('results');
  };

  // Pause/resume
  const togglePause = () => {
    setPaused(!paused);
  };

  const selectedCount = companies.filter((c) => c.selected).length;
  const completedCount = companies.filter((c) => c.status === 'completed').length;
  const failedCount = companies.filter((c) => c.status === 'failed').length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bulk Research</h2>
            <p className="text-slate-500 text-sm mt-0.5">Research multiple companies at once</p>
          </div>
          {companies.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium">{selectedCount}</span> selected
              {completedCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600 font-medium">{completedCount} done</span>
                </>
              )}
              {failedCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-red-600 font-medium">{failedCount} failed</span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'selection' as Tab, label: 'Select Companies' },
              { id: 'progress' as Tab, label: 'Progress' },
              { id: 'results' as Tab, label: 'Results' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selection Tab */}
          {activeTab === 'selection' && (
            <div className="space-y-6">
              {/* Import Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From GHL */}
                <button
                  onClick={loadFromGHL}
                  disabled={loadingGhl}
                  className="card-interactive p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <CloudDownload className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Import from GHL</h3>
                      <p className="text-sm text-slate-500">Pull companies from GoHighLevel</p>
                    </div>
                    {loadingGhl && <Loader2 className="w-5 h-5 animate-spin text-purple-600 ml-auto" />}
                  </div>
                </button>

                {/* From CSV */}
                <div className="card p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Paste CSV</h3>
                      <p className="text-sm text-slate-500">name, website, industry</p>
                    </div>
                  </div>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="input h-24 text-sm font-mono"
                    placeholder="Acme Corp, https://acme.com, Manufacturing&#10;TechFlow, https://techflow.io, SaaS"
                  />
                  <button
                    onClick={parseCSV}
                    disabled={!csvInput.trim()}
                    className="btn-secondary mt-3 w-full disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Parse CSV
                  </button>
                </div>
              </div>

              {/* Company List */}
              {companies.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={companies.every((c) => c.selected)}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {companies.length} companies
                      </span>
                    </div>
                    <button
                      onClick={startResearch}
                      disabled={selectedCount === 0}
                      className="btn-primary disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      Start Research ({selectedCount})
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={company.selected}
                          onChange={() => toggleSelect(company.id)}
                          className="w-4 h-4 rounded text-emerald-500"
                        />
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{company.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {company.website || 'No website'} • {company.industry || 'Unknown industry'}
                          </p>
                        </div>
                        {company.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        )}
                        {company.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {companies.length === 0 && (
                <div className="card p-12 text-center">
                  <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">No companies yet</h3>
                  <p className="text-slate-500 text-sm">
                    Import companies from GHL or paste a CSV to get started
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {processing ? 'Processing...' : 'Complete'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {completedCount} of {selectedCount} companies researched
                    </p>
                  </div>
                  {processing && (
                    <button onClick={togglePause} className="btn-secondary">
                      {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {paused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${selectedCount ? (completedCount / selectedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Company Status List */}
              <div className="card">
                <div className="max-h-96 overflow-y-auto">
                  {companies
                    .filter((c) => c.selected)
                    .map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100">
                          {company.status === 'processing' && (
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          )}
                          {company.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          )}
                          {company.status === 'failed' && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          {company.status === 'pending' && (
                            <Building2 className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{company.name}</p>
                          <p className="text-xs text-slate-500">
                            {company.status === 'processing' && 'Researching...'}
                            {company.status === 'completed' && 'Done'}
                            {company.status === 'failed' && company.error}
                            {company.status === 'pending' && 'Waiting...'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {companies
                .filter((c) => c.status === 'completed')
                .map((company) => (
                  <div key={company.id} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{company.name}</h3>
                        <p className="text-sm text-slate-500">
                          {company.result?.company_profile?.industry || company.industry}
                        </p>
                      </div>
                      <span className="badge badge-emerald">
                        {Math.round((company.result?.research_confidence?.overall_score || 0) * 100)}%
                      </span>
                    </div>

                    {/* Signals */}
                    {company.result?.recent_signals?.slice(0, 2).map((signal: any, i: number) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2">
                        <span className="text-xs font-semibold text-emerald-600">{signal.signal_type}</span>
                        <p className="text-sm text-slate-700 mt-1">{signal.description}</p>
                      </div>
                    ))}

                    <div className="flex gap-2 mt-4">
                      <button className="btn-primary flex-1">
                        Push to GHL
                      </button>
                      <button className="btn-secondary">
                        View Full Report
                      </button>
                    </div>
                  </div>
                ))}

              {companies.filter((c) => c.status === 'completed').length === 0 && (
                <div className="card p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">No results yet</h3>
                  <p className="text-slate-500 text-sm">
                    Run bulk research to see results here
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
