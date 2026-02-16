'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  Search,
  Zap,
  Microscope,
  Building2,
  Globe,
  Briefcase,
  AlertCircle,
  Send,
  Copy,
  Sparkles,
  Link as LinkIcon,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  DollarSign,
  Database,
  AlertTriangle,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { ProgressStep } from '@/components/ui/ProgressiveLoader';
import {
  ResearchOutputV3,
  PERSONA_DISPLAY_NAMES_V3,
  SIGNAL_TYPE_CONFIG,
  INTENT_FIT_COLORS,
  CONFIDENCE_COLORS,
  URGENCY_COLORS,
  IntentSignalV3,
  HypothesisV3,
  PersonaAnglesV3,
  ResearchMetadataV3,
} from '@/types/researchTypesV3';

// Dynamic imports for heavy components (only loaded when needed)
const ProgressiveLoader = dynamic(
  () => import('@/components/ui/ProgressiveLoader').then(mod => mod.ProgressiveLoader),
  { ssr: false, loading: () => <div className="animate-pulse bg-slate-100 rounded-2xl h-64" /> }
);

const ReplaceResearchModal = dynamic(
  () => import('@/components/research/ReplaceResearchModal').then(mod => mod.ReplaceResearchModal),
  { ssr: false }
);

type ResearchType = 'quick' | 'standard' | 'deep';

interface GHLCompany {
  id: string;
  companyName: string;
  website?: string;
  industry?: string;
  email?: string;
  phone?: string;
}

// Research progress steps
const RESEARCH_STEPS: Record<ResearchType, ProgressStep[]> = {
  quick: [
    { id: 'website', label: 'Analyzing company website', description: 'Extracting company information' },
    { id: 'insights', label: 'Generating quick insights', description: 'Creating actionable recommendations' },
  ],
  standard: [
    { id: 'website', label: 'Analyzing company website', description: 'Extracting company information' },
    { id: 'news', label: 'Searching recent news', description: 'Finding latest company updates' },
    { id: 'signals', label: 'Identifying pain points', description: 'Detecting business challenges' },
    { id: 'insights', label: 'Generating insights', description: 'Creating actionable recommendations' },
  ],
  deep: [
    { id: 'website', label: 'Analyzing company website', description: 'Deep web scraping and analysis' },
    { id: 'news', label: 'Searching recent news', description: 'Comprehensive news and press analysis' },
    { id: 'search', label: 'Running web searches', description: 'Using Tavily for deep research' },
    { id: 'signals', label: 'Identifying intent signals', description: 'Detecting buying signals' },
    { id: 'synthesis', label: 'Synthesizing research', description: 'AI-powered insight generation' },
    { id: 'insights', label: 'Generating recommendations', description: 'Creating personalized outreach' },
  ],
};

// Estimated times in seconds
const ESTIMATED_TIMES: Record<ResearchType, number> = {
  quick: 5,
  standard: 15,
  deep: 90,
};

const researchTypes = [
  {
    id: 'quick' as ResearchType,
    label: 'Quick',
    icon: Zap,
    credits: 1,
    description: 'Fast overview (~5s)',
  },
  {
    id: 'standard' as ResearchType,
    label: 'Standard',
    icon: Search,
    credits: 2,
    description: 'Comprehensive (~15s)',
  },
  {
    id: 'deep' as ResearchType,
    label: 'Deep',
    icon: Microscope,
    credits: 5,
    description: 'Full intelligence (~90s)',
    note: 'Requires Tavily API key',
  },
];

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Use ref to prevent re-creating Supabase client on each render
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const initialType = (searchParams.get('type') as ResearchType) || 'standard';

  // Return to email wizard params
  const returnTo = searchParams.get('returnTo');
  const preselectedGhlCompanyId = searchParams.get('ghl_company_id');

  // Track if initial data has been fetched to prevent duplicate fetches on navigation
  const hasFetchedGhlConfig = useRef(false);

  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [researchType, setResearchType] = useState<ResearchType>(initialType);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchOutputV3 | null>(null);
  const [resultType, setResultType] = useState<ResearchType>('standard');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Push to GHL state
  const [pushing, setPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Smart auto-push state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [existingGhlPushedAt, setExistingGhlPushedAt] = useState<string | null>(null);
  const [pendingAutoPush, setPendingAutoPush] = useState(false);

  // Collapsible sections state
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [personaExpanded, setPersonaExpanded] = useState<string | null>(null);

  // GHL state
  const [ghlConfigured, setGhlConfigured] = useState<boolean | null>(null);
  const [ghlCompanies, setGhlCompanies] = useState<GHLCompany[]>([]);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlSearchLoading, setGhlSearchLoading] = useState(false);
  const [ghlError, setGhlError] = useState<string | null>(null);
  const [ghlDropdownOpen, setGhlDropdownOpen] = useState(false);
  const [ghlFilterQuery, setGhlFilterQuery] = useState('');
  const [selectedGhlCompany, setSelectedGhlCompany] = useState<GHLCompany | null>(null);
  const [useGhlSource, setUseGhlSource] = useState(false);
  const [activeAccountName, setActiveAccountName] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const ghlDropdownRef = useRef<HTMLDivElement>(null);

  // Selected company research status
  const [selectedCompanyResearchStatus, setSelectedCompanyResearchStatus] = useState<{
    hasResearch: boolean;
    lastResearchedAt: string | null;
  } | null>(null);
  const [checkingResearchStatus, setCheckingResearchStatus] = useState(false);

  // Debounced search query for server-side search
  const debouncedGhlQuery = useDebounce(ghlFilterQuery, 300);

  // Track if we should redirect after push (for returnTo flow)
  const [shouldRedirectAfterPush, setShouldRedirectAfterPush] = useState(false);
  const hasFetchedPreselectedCompany = useRef(false);

  // Check if GHL is configured on mount (only once)
  useEffect(() => {
    if (hasFetchedGhlConfig.current) return;
    hasFetchedGhlConfig.current = true;

    const checkGhlConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userData?.organization_id) return;

        const [configResult, keyResult, accountsResult] = await Promise.all([
          supabase
            .from('ghl_config')
            .select('location_id')
            .eq('organization_id', userData.organization_id)
            .single(),
          supabase
            .from('api_keys')
            .select('key_hint')
            .eq('organization_id', userData.organization_id)
            .eq('provider', 'ghl')
            .single(),
          fetch('/api/ghl/accounts').then(res => res.ok ? res.json() : null),
        ]);

        setGhlConfigured(!!configResult.data?.location_id && !!keyResult.data?.key_hint);

        // Set active account name and ID
        if (accountsResult) {
          const accounts = accountsResult.accounts || [];
          const selected = accountsResult.selected_account_id
            ? accounts.find((a: { id: string }) => a.id === accountsResult.selected_account_id)
            : null;
          const primary = accounts.find((a: { is_primary: boolean }) => a.is_primary);
          const active = selected || primary || accounts[0];
          setActiveAccountName(active?.account_name || null);
          setActiveAccountId(active?.id || null);
        }
      } catch {
        setGhlConfigured(false);
      }
    };

    checkGhlConfig();
  }, [supabase]);

  // Auto-select GHL company if preselected (from returnTo flow)
  useEffect(() => {
    if (
      preselectedGhlCompanyId &&
      ghlConfigured &&
      !hasFetchedPreselectedCompany.current
    ) {
      hasFetchedPreselectedCompany.current = true;

      // Fetch the specific company and auto-select it
      const fetchAndSelectCompany = async () => {
        try {
          const response = await fetch(`/api/ghl/companies?id=${preselectedGhlCompanyId}`);
          const data = await response.json();

          if (response.ok && data.company) {
            setUseGhlSource(true);
            setSelectedGhlCompany(data.company);
            setCompanyName(data.company.companyName);
            setCompanyWebsite(data.company.website || '');
            setIndustry(data.company.industry || '');
            // Enable redirect after push if returnTo is set
            if (returnTo === 'email') {
              setShouldRedirectAfterPush(true);
            }
          }
        } catch (error) {
          console.error('Failed to fetch preselected company:', error);
        }
      };

      fetchAndSelectCompany();
    }
  }, [preselectedGhlCompanyId, ghlConfigured, returnTo]);

  // Fetch GHL companies with optional search query
  const fetchGhlCompanies = useCallback(async (searchQuery?: string) => {
    // Use search-specific loading state when searching, initial loading otherwise
    if (searchQuery) {
      setGhlSearchLoading(true);
    } else {
      setGhlLoading(true);
    }
    setGhlError(null);

    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery?.trim()) {
        params.set('query', searchQuery.trim());
      }
      const response = await fetch(`/api/ghl/companies?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.companies) {
        setGhlCompanies(data.companies);
      } else {
        setGhlError(data.error || 'Failed to fetch companies');
        setGhlCompanies([]);
      }
    } catch {
      setGhlError('Failed to fetch companies');
      setGhlCompanies([]);
    } finally {
      setGhlLoading(false);
      setGhlSearchLoading(false);
    }
  }, []);

  // Consolidated GHL companies fetching - handles both initial load and search
  const hasFetchedInitialCompanies = useRef(false);
  useEffect(() => {
    if (!useGhlSource || !ghlConfigured) {
      hasFetchedInitialCompanies.current = false;
      return;
    }

    // Initial fetch (no search query) - only run once
    if (!debouncedGhlQuery && !hasFetchedInitialCompanies.current && ghlCompanies.length === 0 && !ghlLoading) {
      hasFetchedInitialCompanies.current = true;
      fetchGhlCompanies();
      return;
    }

    // Search query changed - always fetch
    if (debouncedGhlQuery) {
      fetchGhlCompanies(debouncedGhlQuery);
    }
  }, [debouncedGhlQuery, useGhlSource, ghlConfigured, ghlCompanies.length, ghlLoading, fetchGhlCompanies]);

  // No longer filtering client-side since server handles search
  const filteredGhlCompanies = ghlCompanies;

  const handleSelectGhlCompany = (company: GHLCompany) => {
    setSelectedGhlCompany(company);
    setCompanyName(company.companyName);
    setCompanyWebsite(company.website || '');
    setIndustry(company.industry || '');
    setGhlDropdownOpen(false);
    setGhlFilterQuery('');
    // Reset research status when selecting new company
    setSelectedCompanyResearchStatus(null);
  };

  const handleClearGhlSelection = () => {
    setSelectedGhlCompany(null);
    setCompanyName('');
    setCompanyWebsite('');
    setIndustry('');
    setSelectedCompanyResearchStatus(null);
  };

  // Check research status when a GHL company is selected
  useEffect(() => {
    const checkResearchStatus = async () => {
      if (!selectedGhlCompany?.id) {
        setSelectedCompanyResearchStatus(null);
        return;
      }

      setCheckingResearchStatus(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userData?.organization_id) return;

        // Check if there's any research pushed to GHL for this company
        const { data: existingResearch } = await supabase
          .from('research_sessions')
          .select('id, ghl_pushed_at')
          .eq('organization_id', userData.organization_id)
          .eq('ghl_company_id', selectedGhlCompany.id)
          .not('ghl_pushed_at', 'is', null)
          .order('ghl_pushed_at', { ascending: false })
          .limit(1);

        setSelectedCompanyResearchStatus({
          hasResearch: !!(existingResearch && existingResearch.length > 0),
          lastResearchedAt: existingResearch?.[0]?.ghl_pushed_at || null,
        });
      } catch (error) {
        console.error('Error checking research status:', error);
        setSelectedCompanyResearchStatus(null);
      } finally {
        setCheckingResearchStatus(false);
      }
    };

    checkResearchStatus();
  }, [selectedGhlCompany?.id, supabase]);

  const handleSwitchToManual = () => {
    setUseGhlSource(false);
    setSelectedGhlCompany(null);
    setGhlDropdownOpen(false);
    setGhlFilterQuery('');
  };

  const handleSwitchToGhl = () => {
    setUseGhlSource(true);
    setCompanyName('');
    setCompanyWebsite('');
    setIndustry('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ghlDropdownRef.current && !ghlDropdownRef.current.contains(event.target as Node)) {
        setGhlDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setCurrentStep(0);
    setError(null);
    setResult(null);
    setDurationMs(null);
    // Clear pending research flag - starting new research
    sessionStorage.removeItem('research_results_pending');

    // Simulate step progression while waiting for response
    const steps = RESEARCH_STEPS[researchType];
    const stepDuration = (ESTIMATED_TIMES[researchType] * 1000) / steps.length;

    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_website: companyWebsite,
          industry,
          research_type: researchType,
          ghl_company_id: selectedGhlCompany?.id || null,
        }),
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      setCurrentStep(steps.length - 1);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Research failed');
      }

      setResult(data.research);
      setResultType(data.research_type || researchType);
      setDurationMs(data.duration_ms);
      setSessionId(data.session_id);
      // Reset push state for new research
      setPushSuccess(false);

      // Mark research as pending push (for account switch warning)
      sessionStorage.setItem('research_results_pending', 'true');

      // Smart auto-push logic
      if (selectedGhlCompany?.id) {
        if (data.has_existing_ghl_research) {
          // Show confirmation modal for existing research
          setExistingGhlPushedAt(data.existing_ghl_pushed_at);
          setShowReplaceModal(true);
        } else {
          // Auto-push for new companies
          setPendingAutoPush(true);
        }
      }
    } catch (err) {
      clearInterval(progressInterval);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Research cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCancelResearch = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const pushToGHL = async (showSuccessMessage = true) => {
    if (!result) return;

    if (!selectedGhlCompany?.id) {
      setError('Please select a company from GHL to push research data');
      return;
    }

    setPushing(true);
    setPushSuccess(false);

    try {
      const response = await fetch('/api/ghl/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: selectedGhlCompany.id,
          session_id: sessionId,
          research_data: result,
          contact_data: {
            companyName: result.company_profile.confirmed_name,
            website: companyWebsite,
          },
          ghl_account_id: activeAccountId, // Pin to active account at time of research
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to push to GHL');
      }

      setPushSuccess(true);
      // Clear pending research flag - results have been pushed
      sessionStorage.removeItem('research_results_pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push to GHL');
    } finally {
      setPushing(false);
      setPendingAutoPush(false);
    }
  };

  // Handle auto-push after research completes
  useEffect(() => {
    if (pendingAutoPush && result && selectedGhlCompany?.id && !pushing) {
      pushToGHL(true);
    }
  }, [pendingAutoPush, result, selectedGhlCompany?.id]);

  // Handle redirect after successful push (for returnTo flow)
  useEffect(() => {
    if (pushSuccess && shouldRedirectAfterPush && selectedGhlCompany?.id) {
      // Short delay to show success state before redirecting
      const timer = setTimeout(() => {
        router.push(`/email?ghl_company_id=${selectedGhlCompany.id}&returned=true`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pushSuccess, shouldRedirectAfterPush, selectedGhlCompany?.id, router]);

  // Modal handlers
  const handleKeepExisting = () => {
    setShowReplaceModal(false);
    setExistingGhlPushedAt(null);
    // Research is saved in Supabase, just don't push to GHL
  };

  const handleReplaceWithNew = async () => {
    setShowReplaceModal(false);
    await pushToGHL(true);
    setExistingGhlPushedAt(null);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-teal-600 bg-teal-100';
    if (score >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getSignalTypeConfig = (type: string) => {
    return SIGNAL_TYPE_CONFIG[type] || { label: type, color: 'slate', icon: 'Info' };
  };

  const isDeepResearch = researchType === 'deep';
  const isDeepResult = resultType === 'deep';

  // Helper to check if hypothesis is object (deep) or string (legacy)
  const getHypothesis = (): HypothesisV3 | null => {
    if (!result?.hypothesis) return null;
    if (typeof result.hypothesis === 'object') return result.hypothesis as HypothesisV3;
    return null;
  };

  const hypothesis = getHypothesis();

  return (
    <div className="min-h-screen">
      {/* Header */}
      {/* Return to Email Banner */}
      {returnTo === 'email' && selectedGhlCompany && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <p className="text-sm text-indigo-700">
              Researching for outreach: <span className="font-semibold">{selectedGhlCompany.companyName}</span>
            </p>
            {pushSuccess && shouldRedirectAfterPush && (
              <span className="text-xs text-indigo-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Returning to email wizard...
              </span>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Research Company</h2>
            <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">
              Get AI-powered insights on any company
            </p>
          </div>
        </div>
      </header>

      {/* Active GHL Account Banner */}
      {activeAccountName && (
        <div className="bg-teal-50 border-b border-teal-100 px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-700" />
              <p className="text-sm text-teal-700">
                Active GHL Account: <span className="font-semibold">{activeAccountName}</span>
              </p>
            </div>
            <span className="text-xs text-teal-600">
              Research and push operations use this account
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Research Form */}
          <form onSubmit={handleResearch} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Company Name Field */}
              <div className="md:col-span-2">
                {!useGhlSource && (
                  <div>
                    <label className="label flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      Company Name *
                      {ghlConfigured && (
                        <button
                          type="button"
                          onClick={handleSwitchToGhl}
                          className="ml-auto text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Select from GHL
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input"
                      placeholder="e.g., Acme Corporation"
                      required
                    />
                    {ghlConfigured === false && (
                      <p className="text-xs text-slate-500 mt-1">
                        <a href="/settings" className="text-purple-600 hover:text-purple-700 underline">
                          Connect GHL
                        </a>
                        {' '}to select companies from your account.
                      </p>
                    )}
                  </div>
                )}

                {useGhlSource && ghlConfigured && (
                  <div>
                    {activeAccountName && (
                      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-4 h-4 text-teal-600" />
                        <span>Companies from: <span className="font-medium text-slate-900">{activeAccountName}</span></span>
                      </div>
                    )}
                    <label className="label flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-purple-500" />
                      Company from GHL *
                      <button
                        type="button"
                        onClick={handleSwitchToManual}
                        className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Building2 className="w-3 h-3" />
                        Enter manually
                      </button>
                    </label>

                    <div className="relative" ref={ghlDropdownRef}>
                      <div
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer flex items-center justify-between ${
                          ghlDropdownOpen
                            ? 'border-purple-500 ring-2 ring-purple-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setGhlDropdownOpen(!ghlDropdownOpen)}
                      >
                        <span className={selectedGhlCompany ? 'text-slate-900' : 'text-slate-400'}>
                          {selectedGhlCompany ? selectedGhlCompany.companyName : 'Select a company...'}
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedGhlCompany && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearGhlSelection();
                              }}
                              className="p-1 hover:bg-slate-100 rounded"
                            >
                              <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                          {ghlLoading ? (
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {ghlDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                              {ghlSearchLoading ? (
                                <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
                              ) : (
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              )}
                              <input
                                type="text"
                                value={ghlFilterQuery}
                                onChange={(e) => setGhlFilterQuery(e.target.value)}
                                placeholder="Search companies..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="overflow-y-auto max-h-52">
                            {ghlError ? (
                              <div className="px-3 py-4 text-center text-red-500 text-sm">
                                {ghlError}
                              </div>
                            ) : ghlLoading ? (
                              <div className="px-3 py-4 text-center text-slate-500 text-sm flex items-center justify-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading companies...
                              </div>
                            ) : filteredGhlCompanies.length === 0 ? (
                              <div className="px-3 py-4 text-center text-slate-500 text-sm">
                                {ghlFilterQuery ? 'No companies found' : 'No companies in GHL'}
                              </div>
                            ) : (
                              filteredGhlCompanies.map((company) => (
                                <button
                                  key={company.id}
                                  type="button"
                                  onClick={() => handleSelectGhlCompany(company)}
                                  className="w-full px-3 py-2.5 text-left hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <div className="font-medium text-sm text-slate-900">
                                    {company.companyName}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {company.industry && (
                                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                        {company.industry}
                                      </span>
                                    )}
                                    {company.website && (
                                      <span className="text-xs text-slate-500">
                                        {company.website.replace(/^https?:\/\//, '').slice(0, 30)}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedGhlCompany && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs text-purple-600 flex items-center gap-1">
                          <span className="bg-purple-100 px-2 py-0.5 rounded-full">Selected from GHL</span>
                          <span className="text-slate-500">Fields auto-filled</span>
                        </p>

                        {/* Research status indicator */}
                        {checkingResearchStatus ? (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking research status...
                          </p>
                        ) : selectedCompanyResearchStatus !== null && (
                          selectedCompanyResearchStatus.hasResearch ? (
                            <p className="text-xs text-teal-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Research synced to GHL</span>
                              {selectedCompanyResearchStatus.lastResearchedAt && (
                                <span className="text-slate-400">
                                  ({new Date(selectedCompanyResearchStatus.lastResearchedAt).toLocaleDateString()})
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>No research in GHL yet - run research below to sync</span>
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {researchTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = researchType === type.id;
                  const isDeep = type.id === 'deep';

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setResearchType(type.id)}
                      className={`p-4 min-h-[44px] rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? isDeep
                            ? 'border-gold-500 bg-gold-50'
                            : 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? isDeep
                                ? 'bg-gold-500 text-slate-900'
                                : 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <p className={`font-semibold font-heading ${
                            isSelected
                              ? isDeep ? 'text-gold-700' : 'text-teal-700'
                              : 'text-slate-900'
                          }`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-slate-500 font-data">{type.credits} credit{type.credits > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{type.description}</p>
                      {type.note && (
                        <p className="text-xs text-amber-600 mt-1">{type.note}</p>
                      )}
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

            {!loading && (
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className={`w-full min-h-[44px] py-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDeepResearch ? 'btn-accent' : 'btn-primary'
                }`}
              >
                {isDeepResearch ? <Sparkles className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                {isDeepResearch ? 'Start Deep Research' : 'Start Research'}
              </button>
            )}
          </form>

          {/* Progressive Loading UI */}
          {loading && (
            <div className="mt-6">
              <ProgressiveLoader
                steps={RESEARCH_STEPS[researchType]}
                currentStep={currentStep}
                estimatedTime={ESTIMATED_TIMES[researchType]}
                onCancel={handleCancelResearch}
                title={`Researching ${companyName}...`}
                showTimeRemaining={true}
              />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Company Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                      {result.company_profile.confirmed_name}
                    </h3>
                    <p className="text-slate-500">{result.company_profile.industry}</p>
                    {result.company_profile.ownership_type && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {result.company_profile.ownership_type}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {/* Confidence Badge */}
                    {result.research_confidence?.overall_score !== undefined ? (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold font-data ${getConfidenceColor(
                          result.research_confidence.overall_score
                        )}`}
                      >
                        {Math.round(result.research_confidence.overall_score * 100)}% Confidence
                      </span>
                    ) : hypothesis?.confidence && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${CONFIDENCE_COLORS[hypothesis.confidence]}`}>
                        {hypothesis.confidence.charAt(0).toUpperCase() + hypothesis.confidence.slice(1)} Confidence
                      </span>
                    )}
                    {/* Sources Badge (Deep) */}
                    {result.company_profile.citations && result.company_profile.citations.length > 0 && (
                      <button
                        onClick={() => setSourcesExpanded(!sourcesExpanded)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        <Database className="w-3 h-3" />
                        {result.company_profile.citations.length} sources
                        {sourcesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sources Expanded */}
                {sourcesExpanded && result.company_profile.citations && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Source Citations</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.company_profile.citations.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 truncate"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {result.company_profile.estimated_revenue && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="font-semibold text-slate-900 font-data">
                        {result.company_profile.estimated_revenue}
                      </p>
                      {result.company_profile.revenue_source && (
                        <p className="text-xs text-slate-400 mt-0.5">{result.company_profile.revenue_source}</p>
                      )}
                    </div>
                  )}
                  {result.company_profile.employee_count && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Employees</p>
                      <p className="font-semibold text-slate-900 font-data">
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
                  {result.company_profile.investors && result.company_profile.investors.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Investors</p>
                      <p className="font-semibold text-slate-900 text-sm">
                        {result.company_profile.investors.slice(0, 2).join(', ')}
                        {result.company_profile.investors.length > 2 && ` +${result.company_profile.investors.length - 2}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Intent Signals (Deep Only) */}
              {isDeepResult && result.intent_signals && result.intent_signals.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-red-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Target className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-heading">Intent Signals</h3>
                      <p className="text-xs text-red-600">High-priority buying signals detected</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.intent_signals.map((signal: IntentSignalV3, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${INTENT_FIT_COLORS[signal.fit_score]}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-white/50 rounded text-xs font-semibold uppercase">
                                {signal.signal_type.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                signal.fit_score === 'perfect' ? 'bg-red-200 text-red-800' :
                                signal.fit_score === 'good' ? 'bg-orange-200 text-orange-800' :
                                'bg-amber-200 text-amber-800'
                              }`}>
                                {signal.fit_score} fit
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium">{signal.description}</p>
                            {signal.timeframe && (
                              <p className="text-xs text-slate-500 mt-1">Timeframe: {signal.timeframe}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">Source: {signal.source}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hypothesis Section (Deep) */}
              {isDeepResult && hypothesis && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-heading">Sales Hypothesis</h3>
                    <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${CONFIDENCE_COLORS[hypothesis.confidence]}`}>
                      {hypothesis.confidence.charAt(0).toUpperCase() + hypothesis.confidence.slice(1)} Confidence
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium mb-3">{hypothesis.primary_hypothesis}</p>
                  {hypothesis.supporting_evidence && hypothesis.supporting_evidence.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Supporting Evidence</p>
                      {hypothesis.supporting_evidence.map((evidence: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                          <span>{evidence}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Signals */}
              {result.recent_signals && result.recent_signals.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 font-heading">Recent Signals</h3>
                  <div className="space-y-3">
                    {result.recent_signals.slice(0, 5).map((signal, index) => {
                      const typeConfig = getSignalTypeConfig(signal.type || 'strategic');
                      const signalText = signal.headline || signal.description || signal.signal;
                      const signalDetail = signal.detail || signal.description;

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border ${
                            signal.is_intent_signal ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                                  {typeConfig.label}
                                </span>
                                {signal.is_intent_signal && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                    Intent Signal
                                  </span>
                                )}
                                {signal.date && (
                                  <span className="text-xs text-slate-400">{signal.date}</span>
                                )}
                              </div>
                              <p className="text-slate-700 font-medium">{signalText}</p>
                              {signalDetail && signalDetail !== signalText && (
                                <p className="text-sm text-slate-600 mt-1">{signalDetail}</p>
                              )}
                              {(signal.relevance_to_revology || signal.relevance) && (
                                <p className="text-xs text-teal-600 mt-2">
                                  Relevance: {signal.relevance_to_revology || signal.relevance}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                {signal.source_url ? (
                                  <a
                                    href={signal.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {signal.source_name || 'Source'}
                                  </a>
                                ) : (
                                  <span>Source: {signal.source_name || signal.source}</span>
                                )}
                              </div>
                            </div>
                            {signal.credibility_score !== undefined && (
                              <span className="text-xs text-slate-500 whitespace-nowrap font-data">
                                {Math.round(signal.credibility_score * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pain Points (Quick/Standard) */}
              {!isDeepResult && result.pain_point_hypotheses && result.pain_point_hypotheses.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 font-heading">Pain Point Hypotheses</h3>
                  <div className="space-y-3">
                    {result.pain_point_hypotheses.map((point, index) => (
                      <div key={index} className="p-4 bg-gold-50 rounded-xl border border-gold-100">
                        <p className="font-medium text-slate-900 mb-1">{point.hypothesis}</p>
                        <p className="text-sm text-slate-600">{point.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Persona Angles (Standard/Deep) */}
              {result.persona_angles && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-bold text-slate-900 font-heading">Persona Angles</h3>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.persona_angles).map(([key, angle]) => {
                      const isExpanded = personaExpanded === key;
                      const displayName = PERSONA_DISPLAY_NAMES_V3[key] || key;
                      const personaAngle = angle as { hook?: string; primary_hook?: string; supporting_point?: string; question?: string; question_to_pose?: string };

                      return (
                        <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setPersonaExpanded(isExpanded ? null : key)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                          >
                            <span className="font-medium text-slate-900">{displayName}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 bg-slate-50">
                              <div className="pt-3">
                                <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Hook</p>
                                <p className="text-sm text-slate-700">{personaAngle.hook || personaAngle.primary_hook}</p>
                              </div>
                              {personaAngle.supporting_point && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Supporting Point</p>
                                  <p className="text-sm text-slate-700">{personaAngle.supporting_point}</p>
                                </div>
                              )}
                              {(personaAngle.question || personaAngle.question_to_pose) && (
                                <div>
                                  <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Question to Pose</p>
                                  <p className="text-sm text-slate-700 italic">{personaAngle.question || personaAngle.question_to_pose}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Outreach Priority */}
              {result.outreach_priority && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-bold text-slate-900 font-heading">Outreach Priority</h3>
                    {result.outreach_priority.urgency && (
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${URGENCY_COLORS[result.outreach_priority.urgency]}`}>
                        {result.outreach_priority.urgency.charAt(0).toUpperCase() + result.outreach_priority.urgency.slice(1)} Urgency
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {result.outreach_priority.recommended_personas && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Recommended Personas</p>
                        <div className="flex flex-wrap gap-2">
                          {result.outreach_priority.recommended_personas.map((persona, i) => (
                            <span key={i} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                              {PERSONA_DISPLAY_NAMES_V3[persona] || persona}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(result.outreach_priority.timing_notes || result.outreach_priority.urgency_reason) && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Timing</p>
                        <p className="text-sm text-slate-700">
                          {result.outreach_priority.timing_notes || result.outreach_priority.urgency_reason}
                        </p>
                      </div>
                    )}
                    {result.outreach_priority.cautions && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Cautions</p>
                        {Array.isArray(result.outreach_priority.cautions) ? (
                          <ul className="text-sm text-slate-600 space-y-1">
                            {result.outreach_priority.cautions.map((caution, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                {caution}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-600">{result.outreach_priority.cautions}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Research Gaps (Deep) */}
              {isDeepResult && result.research_gaps && result.research_gaps.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-bold text-amber-800 font-heading">Research Gaps</h3>
                  </div>
                  <p className="text-sm text-amber-700 mb-3">The following data points could not be verified:</p>
                  <ul className="space-y-1">
                    {result.research_gaps.map((gap, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata Panel (Deep - Collapsible) */}
              {isDeepResult && result.metadata && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setMetadataExpanded(!metadataExpanded)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-700">Research Metadata</span>
                    </div>
                    {metadataExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {metadataExpanded && (
                    <div className="px-4 sm:px-6 pb-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      <div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          Searches
                        </p>
                        <p className="font-semibold text-slate-900 font-data">{result.metadata.searches_performed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          Sources
                        </p>
                        <p className="font-semibold text-slate-900 font-data">{result.metadata.sources_cited}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Duration
                        </p>
                        <p className="font-semibold text-slate-900 font-data">
                          {Math.round((result.metadata.execution_time_ms || durationMs || 0) / 1000)}s
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Est. Cost
                        </p>
                        <p className="font-semibold text-slate-900 font-data">
                          ${result.metadata.estimated_cost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      {result.metadata.models_used && (
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-xs text-slate-500 mb-1">Models Used</p>
                          <p className="text-sm text-slate-700">
                            Search: {result.metadata.models_used.search} | Synthesis: {result.metadata.models_used.synthesis}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => pushToGHL()}
                  disabled={pushing || pushSuccess || !ghlConfigured || !selectedGhlCompany}
                  className="btn-primary flex-1 min-h-[44px] disabled:opacity-50"
                  title={!selectedGhlCompany ? 'Select a company from GHL first' : undefined}
                >
                  {pushing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : pushSuccess ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {pushSuccess ? 'Synced to GHL' : !selectedGhlCompany ? 'Select GHL Company First' : `Push to GHL${activeAccountName ? ` (${activeAccountName})` : ''}`}
                </button>
                <button className="btn-secondary flex-1 min-h-[44px]">
                  <Copy className="w-4 h-4" />
                  Copy Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replace Research Modal */}
      {showReplaceModal && (
        <ReplaceResearchModal
          companyName={companyName}
          lastSyncedAt={existingGhlPushedAt}
          onKeepExisting={handleKeepExisting}
          onReplace={handleReplaceWithNew}
          onClose={() => setShowReplaceModal(false)}
          isReplacing={pushing}
        />
      )}
    </div>
  );
}
