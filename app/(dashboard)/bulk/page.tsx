'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
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
  ArrowLeft,
  AlertCircle,
  Download,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  Globe,
  X,
  Zap,
  Search,
  Microscope,
  ExternalLink,
  Database,
  Target,
  Lightbulb,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BulkFilterConfig,
  BulkSelectionStrategy,
  BULK_FILTER_PRESETS,
  GHLCompaniesResponse,
  BATCH_LIMITS,
  getBatchWarningLevel,
  BatchWarningLevel,
  calculateTokenEstimate,
  TOKEN_ESTIMATES,
  calculateCostFromTokens,
} from '@/types/bulkResearchTypes';
import {
  useBulkSessionPersistence,
  CompanyWithResult,
} from '@/lib/hooks/useBulkSessionPersistence';
import { useGHLCompanySync } from '@/lib/hooks/useGHLCompanySync';
import {
  ResearchOutputV3,
  PERSONA_DISPLAY_NAMES_V3,
  SIGNAL_TYPE_CONFIG,
  INTENT_FIT_COLORS,
  CONFIDENCE_COLORS,
  URGENCY_COLORS,
  IntentSignalV3,
  HypothesisV3,
} from '@/types/researchTypesV3';

interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  score?: number;
  selected: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ResearchOutputV3;
  error?: string;
}

type Step = 1 | 2 | 3;
type ResearchType = 'quick' | 'standard' | 'deep';

const RESEARCH_TYPE_CONFIG = [
  {
    id: 'quick' as ResearchType,
    label: 'Quick',
    icon: Zap,
    credits: 1,
    description: 'Basic company overview',
    color: 'amber',
  },
  {
    id: 'standard' as ResearchType,
    label: 'Standard',
    icon: Search,
    credits: 2,
    description: 'Full research with signals',
    color: 'emerald',
  },
  {
    id: 'deep' as ResearchType,
    label: 'Deep',
    icon: Microscope,
    credits: 5,
    description: 'Comprehensive with web search',
    color: 'purple',
    requiresTavily: true,
  },
];

export default function BulkResearchPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const loadingAllRef = useRef(false); // Guard against multiple loadAll calls
  const [csvInput, setCsvInput] = useState('');
  const [loadingGhl, setLoadingGhl] = useState(false);
  const [importSource, setImportSource] = useState<'ghl' | 'csv' | null>(null);
  const [researchType, setResearchType] = useState<ResearchType>('standard');

  // GHL push state
  const [pushingToGhl, setPushingToGhl] = useState(false);
  const [ghlPushProgress, setGhlPushProgress] = useState({ current: 0, total: 0 });

  // Modal state for viewing full report
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [personaExpanded, setPersonaExpanded] = useState<string | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  // Pagination state (page-based to match API)
  const [pagination, setPagination] = useState({
    page: 1,
    pageLimit: 100,
    total: 0,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BulkFilterConfig>({});
  const [minScoreInput, setMinScoreInput] = useState('');
  const [maxScoreInput, setMaxScoreInput] = useState('');
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);

  // Server-side search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Batch warning confirmation state
  const [batchWarningConfirmed, setBatchWarningConfirmed] = useState(false);

  // Token usage tracking
  const [tokenUsage, setTokenUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalEstimatedCost: 0,
  });

  // Session start time for duration tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Session persistence hook
  const {
    hasSavedSession,
    savedSessionSummary,
    savedSessionState,
    isRestoring,
    restoreSession,
    discardSession,
    saveCurrentState,
    buildSessionState,
  } = useBulkSessionPersistence(supabase);

  // GHL company sync hook - checks if GHL is configured
  const {
    isLoading: isGHLLoading,
    isConfigured: isGHLConfigured,
  } = useGHLCompanySync();

  // Show restore dialog when saved session is detected
  useEffect(() => {
    if (hasSavedSession && companies.length === 0) {
      setShowRestoreDialog(true);
    }
  }, [hasSavedSession, companies.length]);

  // Auto-save session state on changes
  useEffect(() => {
    if (companies.length > 0 && !isRestoring) {
      const sessionState = buildSessionState({
        currentStep,
        researchType,
        importSource,
        companies,
        filters,
      });
      saveCurrentState(sessionState);
    }
  }, [
    companies,
    currentStep,
    researchType,
    importSource,
    filters,
    buildSessionState,
    saveCurrentState,
    isRestoring,
  ]);

  // Handle session restore
  const handleRestoreSession = async () => {
    const restoredCompanies = await restoreSession();
    if (restoredCompanies.length > 0) {
      setCompanies(restoredCompanies);
      // Restore all state from saved session
      if (savedSessionState) {
        setCurrentStep(savedSessionState.currentStep);
        setResearchType(savedSessionState.researchType);
        setImportSource(savedSessionState.importSource);
        setFilters(savedSessionState.filters);
        // Restore filter input fields
        if (savedSessionState.filters.minScore !== undefined) {
          setMinScoreInput(savedSessionState.filters.minScore.toString());
        }
        if (savedSessionState.filters.maxScore !== undefined) {
          setMaxScoreInput(savedSessionState.filters.maxScore.toString());
        }
      }
    }
    setShowRestoreDialog(false);
  };

  // Handle session discard
  const handleDiscardSession = () => {
    discardSession();
    setShowRestoreDialog(false);
  };

  // Debounce filter inputs
  const debouncedMinScore = useDebounce(minScoreInput, 300);
  const debouncedMaxScore = useDebounce(maxScoreInput, 300);

  // Update filters when debounced values change
  useEffect(() => {
    const minScore = debouncedMinScore ? parseInt(debouncedMinScore, 10) : undefined;
    const maxScore = debouncedMaxScore ? parseInt(debouncedMaxScore, 10) : undefined;
    setFilters((prev) => ({
      ...prev,
      minScore: isNaN(minScore as number) ? undefined : minScore,
      maxScore: isNaN(maxScore as number) ? undefined : maxScore,
    }));
  }, [debouncedMinScore, debouncedMaxScore]);

  // Extract unique industries from loaded companies
  useEffect(() => {
    const industrySet = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) {
        industrySet.add(c.industry);
      }
    });
    const industries = Array.from(industrySet).sort();
    setAvailableIndustries(industries);
  }, [companies]);

  // Auto-reload companies when sync completes
  // Server-side search when query or filters change (using cache)
  useEffect(() => {
    if (importSource !== 'ghl') return;

    // Debounced reload with current search query and filters
    const searchCompanies = async () => {
      setIsSearching(true);
      try {
        await loadFromGHL(false);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    searchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, filters, importSource]);

  // Client-side filtered companies (only for CSV, GHL uses server-side filtering)
  const filteredCompanies = useMemo(() => {
    // For GHL imports, companies are already server-side filtered
    if (importSource === 'ghl') {
      return companies;
    }
    // For CSV imports, apply client-side filters
    return companies.filter((company) => {
      if (filters.minScore !== undefined && (company.score || 0) < filters.minScore) return false;
      if (filters.maxScore !== undefined && (company.score || 0) > filters.maxScore) return false;
      if (filters.industries?.length && company.industry && !filters.industries.includes(company.industry)) return false;
      if (filters.hasWebsite && !company.website) return false;
      return true;
    });
  }, [companies, filters, importSource]);

  // Stats
  const filteredStats = useMemo(() => {
    const withWebsite = filteredCompanies.filter((c) => c.website).length;
    const withScore = filteredCompanies.filter((c) => c.score !== undefined).length;
    const avgScore = withScore > 0
      ? Math.round(filteredCompanies.reduce((sum, c) => sum + (c.score || 0), 0) / withScore)
      : 0;
    return { withWebsite, withScore, avgScore };
  }, [filteredCompanies]);

  // Load companies from GHL cache with server-side filters
  const loadFromGHL = async (append = false, overrideFilters?: BulkFilterConfig) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoadingGhl(true);
      setImportSource('ghl');
    }

    try {
      const currentFilters = overrideFilters || filters;
      const offset = append ? companies.length : 0;
      const limit = 50;

      // Build query params for server-side filtering
      const params = new URLSearchParams({
        source: 'cache',
        limit: String(limit),
        offset: String(offset),
      });

      if (searchQuery.trim()) {
        params.set('query', searchQuery.trim());
      }
      if (currentFilters.minScore !== undefined) {
        params.set('minScore', String(currentFilters.minScore));
      }
      if (currentFilters.maxScore !== undefined) {
        params.set('maxScore', String(currentFilters.maxScore));
      }
      if (currentFilters.industries?.length) {
        params.set('industries', currentFilters.industries.join(','));
      }
      if (currentFilters.hasWebsite) {
        params.set('hasWebsite', 'true');
      }

      const response = await fetch(`/api/ghl/companies?${params}`);
      const data = await response.json();

      if (data.companies) {
        const mapped = data.companies.map((c: any) => ({
          id: c.id,
          name: c.companyName || c.name || '',
          website: c.website,
          industry: c.industry,
          score: c.score,
          selected: false,
          status: 'pending' as const,
        }));

        if (append) {
          setCompanies((prev) => [...prev, ...mapped]);
        } else {
          setCompanies(mapped);
        }

        setPagination({
          page: Math.floor(data.offset / limit) + 1,
          pageLimit: limit,
          total: data.total || 0,
          hasMore: data.hasMore || false,
        });
      }
    } catch (error) {
      console.error('Failed to load GHL companies:', error);
    } finally {
      setLoadingGhl(false);
      setLoadingMore(false);
    }
  };

  // Load more companies from cache (append to existing)
  const loadMoreFromGHL = async () => {
    if (loadingAllRef.current || !pagination.hasMore) return;
    loadingAllRef.current = true;
    await loadFromGHL(true);
    loadingAllRef.current = false;
  };

  // Parse CSV input
  const parseCSV = () => {
    if (!csvInput.trim()) return;
    setImportSource('csv');
    const lines = csvInput.trim().split('\n');
    const parsed: Company[] = lines.map((line, index) => {
      const [name, website, industry, scoreStr] = line.split(',').map((s) => s.trim());
      return {
        id: `csv-${index}`,
        name: name || '',
        website: website || '',
        industry: industry || '',
        score: scoreStr ? parseFloat(scoreStr) : undefined,
        selected: false,
        status: 'pending' as const,
      };
    }).filter((c) => c.name);

    setCompanies(parsed);
    setPagination({ page: 1, pageLimit: parsed.length, total: parsed.length, hasMore: false });
  };

  // Toggle company selection
  const toggleSelect = (id: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // Select/deselect all filtered
  const toggleAllFiltered = (selected: boolean) => {
    const filteredIds = new Set(filteredCompanies.map((c) => c.id));
    setCompanies((prev) =>
      prev.map((c) => (filteredIds.has(c.id) ? { ...c, selected } : c))
    );
  };

  // Apply selection strategy
  const applySelectionStrategy = (strategy: BulkSelectionStrategy) => {
    // First, deselect all
    let newCompanies = companies.map((c) => ({ ...c, selected: false }));
    const filteredIds = new Set(filteredCompanies.map((c) => c.id));

    // Get filtered companies in order
    const filtered = newCompanies.filter((c) => filteredIds.has(c.id));

    let toSelect: string[] = [];

    switch (strategy) {
      case 'first_5':
        toSelect = filtered.slice(0, 5).map((c) => c.id);
        break;
      case 'first_10':
        toSelect = filtered.slice(0, 10).map((c) => c.id);
        break;
      case 'first_25':
        toSelect = filtered.slice(0, 25).map((c) => c.id);
        break;
      case 'first_50':
        toSelect = filtered.slice(0, 50).map((c) => c.id);
        break;
      case 'first_100':
        toSelect = filtered.slice(0, 100).map((c) => c.id);
        break;
      case 'first_250':
        toSelect = filtered.slice(0, 250).map((c) => c.id);
        break;
      case 'first_500':
        toSelect = filtered.slice(0, 500).map((c) => c.id);
        break;
      case 'all_filtered':
        toSelect = filtered.map((c) => c.id);
        break;
      case 'top_10_by_score':
        toSelect = [...filtered]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 10)
          .map((c) => c.id);
        break;
      case 'top_25_by_score':
        toSelect = [...filtered]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 25)
          .map((c) => c.id);
        break;
      case 'top_50_by_score':
        toSelect = [...filtered]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 50)
          .map((c) => c.id);
        break;
      case 'top_100_by_score':
        toSelect = [...filtered]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 100)
          .map((c) => c.id);
        break;
      default:
        break;
    }

    const toSelectSet = new Set(toSelect);
    newCompanies = newCompanies.map((c) => ({
      ...c,
      selected: toSelectSet.has(c.id),
    }));

    setCompanies(newCompanies);
  };

  // Apply filter preset
  const applyFilterPreset = (presetKey: string) => {
    const preset = BULK_FILTER_PRESETS[presetKey];
    if (preset) {
      setFilters(preset);
      setMinScoreInput(preset.minScore?.toString() || '');
      setMaxScoreInput(preset.maxScore?.toString() || '');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setMinScoreInput('');
    setMaxScoreInput('');
  };

  // Toggle industry selection
  const toggleIndustry = (industry: string) => {
    setFilters((prev) => {
      const current = prev.industries || [];
      const updated = current.includes(industry)
        ? current.filter((i) => i !== industry)
        : [...current, industry];
      return { ...prev, industries: updated.length > 0 ? updated : undefined };
    });
  };

  // Start bulk research
  const startResearch = async () => {
    const selected = companies.filter((c) => c.selected);
    if (selected.length === 0) return;

    setProcessing(true);
    setPaused(false);
    pausedRef.current = false;
    setCurrentStep(3);

    // Set session start time if not already set
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    for (let i = 0; i < selected.length; i++) {
      if (pausedRef.current) break;

      const company = selected[i];

      // Skip already processed companies (for resume)
      if (company.status === 'completed') continue;

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
            research_type: researchType,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setCompanies((prev) =>
            prev.map((c) =>
              c.id === company.id ? { ...c, status: 'completed', result: data.research } : c
            )
          );

          // Update token usage from response
          if (data.input_tokens || data.output_tokens) {
            setTokenUsage((prev) => ({
              totalInputTokens: prev.totalInputTokens + (data.input_tokens || 0),
              totalOutputTokens: prev.totalOutputTokens + (data.output_tokens || 0),
              totalEstimatedCost: prev.totalEstimatedCost + (data.estimated_cost || 0),
            }));
          }
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
  };

  // Pause/resume
  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  // Reset and start over
  const resetWizard = () => {
    setCompanies([]);
    setCsvInput('');
    setImportSource(null);
    setCurrentStep(1);
    setProcessing(false);
    setPaused(false);
    setFilters({});
    setMinScoreInput('');
    setMaxScoreInput('');
    setPagination({ page: 1, pageLimit: 100, total: 0, hasMore: false });
    setResearchType('standard');
    loadingAllRef.current = false;
    // Reset new state
    setSearchQuery('');
    setBatchWarningConfirmed(false);
    setTokenUsage({ totalInputTokens: 0, totalOutputTokens: 0, totalEstimatedCost: 0 });
    setSessionStartTime(null);
    // Clear saved session when user explicitly resets
    discardSession();
  };

  // Export results to CSV - comprehensive export with all research data
  const exportResults = () => {
    const completed = companies.filter((c) => c.status === 'completed');

    // Build comprehensive CSV headers
    const headers = [
      'Company Name',
      'Industry',
      'Sub-Segment',
      'Website',
      'Estimated Revenue',
      'Employee Count',
      'Headquarters',
      'Founded Year',
      'Business Model',
      'Ownership Type',
      'Market Position',
      'Confidence Score',
      'Research Gaps',
      'Recommended Personas',
      'Urgency',
      'Timing Notes',
      'Cautions',
      'Top Pain Point 1',
      'Pain Point 1 Evidence',
      'Top Pain Point 2',
      'Pain Point 2 Evidence',
      'Signal 1 Type',
      'Signal 1 Description',
      'Signal 1 Source',
      'Signal 1 Date',
      'Signal 2 Type',
      'Signal 2 Description',
      'Signal 2 Source',
      'Signal 2 Date',
      'CFO Hook',
      'Pricing Hook',
      'Sales Hook',
      'CEO Hook',
      'Research Date',
      'Research Type'
    ];

    const rows = completed.map((c) => {
      const r = c.result;
      if (!r) {
        return [c.name, c.industry || '', '', c.website || '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', new Date().toISOString(), researchType];
      }
      const profile = r.company_profile;
      const signals = r.recent_signals || [];
      const painPoints = r.pain_point_hypotheses || [];
      const angles = r.persona_angles;
      const priority = r.outreach_priority;
      const confidence = r.research_confidence;

      return [
        profile.confirmed_name || c.name,
        typeof profile.industry === 'string' ? profile.industry : ((profile.industry as { vertical?: string })?.vertical || c.industry || ''),
        typeof profile.sub_segment === 'string' ? profile.sub_segment : '',
        profile.website || c.website || '',
        profile.estimated_revenue || '',
        profile.employee_count || '',
        profile.headquarters || '',
        profile.founded_year || '',
        profile.business_model || '',
        profile.ownership_type || '',
        profile.market_position || '',
        Math.round((confidence?.overall_score || 0) * 100) + '%',
        (confidence?.gaps || []).join('; '),
        (priority?.recommended_personas || []).join(', '),
        priority?.urgency || '',
        priority?.timing_notes || '',
        Array.isArray(priority?.cautions) ? priority.cautions.join('; ') : (priority?.cautions || ''),
        painPoints[0]?.hypothesis || '',
        painPoints[0]?.evidence || '',
        painPoints[1]?.hypothesis || '',
        painPoints[1]?.evidence || '',
        signals[0]?.type || '',
        signals[0]?.description || signals[0]?.headline || '',
        signals[0]?.source_url || '',
        signals[0]?.date || '',
        signals[1]?.type || '',
        signals[1]?.description || signals[1]?.headline || '',
        signals[1]?.source_url || '',
        signals[1]?.date || '',
        angles?.cfo_finance?.hook || '',
        angles?.pricing_rgm?.hook || '',
        angles?.sales_commercial?.hook || '',
        angles?.ceo_gm?.hook || '',
        new Date().toISOString(),
        researchType
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Push all results to GHL
  const pushAllToGHL = async () => {
    const completed = companies.filter((c) => c.status === 'completed');
    if (completed.length === 0) return;

    if (!confirm(`Push ${completed.length} research results to GHL?`)) return;

    setPushingToGhl(true);
    setGhlPushProgress({ current: 0, total: completed.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < completed.length; i++) {
      const company = completed[i];
      setGhlPushProgress({ current: i + 1, total: completed.length });

      try {
        const response = await fetch('/api/ghl/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: company.id,
            research_data: company.result,
            contact_data: {
              companyName: company.name,
              website: company.website,
            },
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to push ${company.name} to GHL`);
        }
      } catch (error) {
        failCount++;
        console.error(`Error pushing ${company.name} to GHL:`, error);
      }

      // Small delay between requests
      if (i < completed.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setPushingToGhl(false);
    alert(`GHL Push Complete:\n${successCount} succeeded\n${failCount} failed`);
  };

  // Retry a failed company
  const retryCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    setCompanies(prev => prev.map(c =>
      c.id === companyId ? { ...c, status: 'processing', error: undefined } : c
    ));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company.name,
          company_website: company.website,
          industry: company.industry,
          research_type: researchType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCompanies(prev => prev.map(c =>
          c.id === companyId ? { ...c, status: 'completed', result: data.research } : c
        ));

        // Update token usage from response
        if (data.input_tokens || data.output_tokens) {
          setTokenUsage((prev) => ({
            totalInputTokens: prev.totalInputTokens + (data.input_tokens || 0),
            totalOutputTokens: prev.totalOutputTokens + (data.output_tokens || 0),
            totalEstimatedCost: prev.totalEstimatedCost + (data.estimated_cost || 0),
          }));
        }
      } else {
        throw new Error(data.error || 'Research failed');
      }
    } catch (error) {
      setCompanies(prev => prev.map(c =>
        c.id === companyId ? { ...c, status: 'failed', error: error instanceof Error ? error.message : 'Failed' } : c
      ));
    }
  };

  // Confirmation dialog before starting research
  const confirmAndStartResearch = () => {
    const credits = selectedCount * (RESEARCH_TYPE_CONFIG.find(t => t.id === researchType)?.credits || 2);
    const SECONDS_PER_COMPANY = researchType === 'deep' ? 67 : researchType === 'standard' ? 45 : 30;
    const estimatedMinutes = Math.ceil(selectedCount * SECONDS_PER_COMPANY / 60);

    if (confirm(
      `Start research for ${selectedCount} companies?\n\n` +
      `Credits: ${credits}\n` +
      `Estimated time: ~${estimatedMinutes} minutes\n\n` +
      `Continue?`
    )) {
      startResearch();
    }
  };

  const selectedCount = companies.filter((c) => c.selected).length;
  const selectedFromFiltered = filteredCompanies.filter((c) => c.selected).length;
  const completedCount = companies.filter((c) => c.status === 'completed').length;
  const failedCount = companies.filter((c) => c.status === 'failed').length;
  const processedCount = completedCount + failedCount;

  // Reset batch warning confirmation when selection changes
  useEffect(() => {
    setBatchWarningConfirmed(false);
  }, [selectedCount]);

  // Batch warning level
  const batchWarningLevel = getBatchWarningLevel(selectedCount);

  // Token estimate for selected companies
  const tokenEstimate = useMemo(() => {
    if (selectedCount === 0) return null;
    return calculateTokenEstimate(selectedCount, researchType);
  }, [selectedCount, researchType]);

  // Calculate estimated time based on research type
  const estimatedTimeMinutes = useMemo(() => {
    const secondsPerCompany = researchType === 'deep' ? 67 : researchType === 'standard' ? 45 : 30;
    return Math.ceil((selectedCount * secondsPerCompany) / 60);
  }, [selectedCount, researchType]);

  // Session duration
  const sessionDuration = useMemo(() => {
    if (!sessionStartTime) return null;
    const durationMs = Date.now() - sessionStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [sessionStartTime, completedCount]); // Re-calculate when completedCount changes

  // Helper functions for displaying research data
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-teal-600 bg-teal-100';
    if (score >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getSignalTypeConfig = (type: string) => {
    return SIGNAL_TYPE_CONFIG[type] || { label: type, color: 'slate', icon: 'Info' };
  };

  // Helper to check if hypothesis is object (deep) or string (legacy)
  const getHypothesis = (result: ResearchOutputV3): HypothesisV3 | null => {
    if (!result?.hypothesis) return null;
    if (typeof result.hypothesis === 'object') return result.hypothesis as HypothesisV3;
    return null;
  };

  // Open the full report modal for a company
  const openReportModal = (company: Company) => {
    setSelectedCompany(company);
    setShowReportModal(true);
    setPersonaExpanded(null);
    setSourcesExpanded(false);
    setMetadataExpanded(false);
  };

  // Close the modal
  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedCompany(null);
  };

  // Determine if user can proceed to next step
  const canProceedToStep2 = companies.length > 0;
  const canProceedToStep3 = selectedCount > 0;

  const steps = [
    { number: 1, label: 'Import', description: 'Add companies' },
    { number: 2, label: 'Review', description: 'Confirm selection' },
    { number: 3, label: 'Results', description: 'View & export' },
  ];

  // Limit visible companies for performance (show first 500 in list)
  const VISIBLE_LIMIT = 500;
  const visibleCompanies = useMemo(() => {
    return filteredCompanies.slice(0, VISIBLE_LIMIT);
  }, [filteredCompanies]);

  return (
    <div className="min-h-screen">
      {/* Restore Session Dialog */}
      {showRestoreDialog && savedSessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Resume Previous Session?</h3>
                  <p className="text-emerald-100 text-sm">We found an unsaved bulk research session</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Companies</p>
                  <p className="text-lg font-semibold text-slate-900">{savedSessionSummary.selectedCompanies}</p>
                  <p className="text-xs text-slate-500">selected</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Progress</p>
                  <p className="text-lg font-semibold text-emerald-600">{savedSessionSummary.completedCompanies}</p>
                  <p className="text-xs text-slate-500">completed</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Remaining</p>
                  <p className="text-lg font-semibold text-amber-600">{savedSessionSummary.pendingCompanies}</p>
                  <p className="text-xs text-slate-500">pending</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-slate-700">{savedSessionSummary.lastUpdated}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDiscardSession}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Start Fresh
                </button>
                <button
                  onClick={handleRestoreSession}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Continue
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 lg:px-8 lg:py-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Bulk Research</h2>
          <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">Research multiple companies at once</p>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Stepper */}
          <nav aria-label="Progress" className="mb-8">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const isClickable = step.number < currentStep && !processing;

                return (
                  <li key={step.number} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => isClickable && setCurrentStep(step.number as Step)}
                        disabled={!isClickable}
                        className={`
                          w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center
                          font-semibold text-sm lg:text-base transition-all duration-200
                          ${isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                              : 'bg-slate-100 text-slate-400'
                          }
                          ${isClickable ? 'cursor-pointer hover:ring-4 hover:ring-emerald-100' : ''}
                        `}
                        aria-current={isActive ? 'step' : undefined}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5 lg:w-6 lg:h-6" aria-hidden="true" />
                        ) : (
                          step.number
                        )}
                      </button>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-medium ${isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-slate-500 hidden sm:block">{step.description}</p>
                      </div>
                    </div>
                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div
                        className={`absolute top-5 lg:top-6 left-[calc(50%+24px)] lg:left-[calc(50%+32px)] right-[calc(-50%+24px)] lg:right-[calc(-50%+32px)] h-0.5 ${
                          currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Step 1: Import */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-slate-900">How would you like to add companies?</h3>
                <p className="text-slate-500 text-sm mt-1">Choose an import method to get started</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GHL Import Card */}
                <div className={`card p-6 transition-all ${importSource === 'ghl' ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <CloudDownload className="w-6 h-6 text-purple-600" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">Import from GHL</h4>
                      <p className="text-sm text-slate-500">
                        {isGHLLoading
                          ? 'Checking configuration...'
                          : isGHLConfigured
                            ? 'Pull companies from GoHighLevel'
                            : 'Configure GHL in Settings first'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => loadFromGHL(false)}
                    disabled={isGHLLoading || loadingGhl || !isGHLConfigured}
                    className="btn-secondary w-full min-h-[44px]"
                  >
                    {isGHLLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Checking...
                      </>
                    ) : loadingGhl ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Loading...
                      </>
                    ) : !isGHLConfigured ? (
                      <>
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        Configure GHL in Settings
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" aria-hidden="true" />
                        {importSource === 'ghl' ? 'Refresh' : 'Load Companies'}
                      </>
                    )}
                  </button>
                </div>

                {/* CSV Import Card */}
                <div className={`card p-6 transition-all ${importSource === 'csv' ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Paste CSV Data</h4>
                      <p className="text-sm text-slate-500">Format: name, website, industry, score</p>
                    </div>
                  </div>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="input h-20 text-sm font-mono mb-3"
                    placeholder="Acme Corp, https://acme.com, Manufacturing, 78&#10;TechFlow, https://techflow.io, SaaS, 85"
                    aria-label="CSV data input"
                  />
                  <button
                    onClick={parseCSV}
                    disabled={!csvInput.trim()}
                    className="btn-secondary w-full min-h-[44px] disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Parse CSV
                  </button>
                </div>
              </div>

              {/* Preview of loaded companies with filters */}
              {companies.length > 0 && (
                <>
                  {/* Server-side Search for GHL */}
                  {importSource === 'ghl' && (
                    <div className="card p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search across all companies..."
                            className="input pl-10 w-full"
                          />
                        </div>
                        {isSearching && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Searching {pagination.total.toLocaleString()} companies...</span>
                          </div>
                        )}
                        {searchQuery && !isSearching && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              loadFromGHL(false);
                            }}
                            className="btn-ghost text-sm"
                          >
                            <X className="w-4 h-4" />
                            Clear
                          </button>
                        )}
                      </div>
                      {searchQuery && !isSearching && companies.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          Found {companies.length} matching companies
                          {pagination.hasMore && ` (showing first ${companies.length})`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Filter Panel - Key filters always visible */}
                  <div className="card">
                    {/* Always visible: Key filters inline */}
                    <div className="p-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-500" aria-hidden="true" />
                        <span className="font-medium text-slate-900">Filters</span>
                        {(filters.minScore || filters.maxScore || filters.industries?.length || filters.hasWebsite) && (
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>

                      {/* Has Website - always visible */}
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg">
                        <input
                          type="checkbox"
                          checked={filters.hasWebsite || false}
                          onChange={(e) => setFilters((prev) => ({ ...prev, hasWebsite: e.target.checked || undefined }))}
                          className="w-4 h-4 rounded text-emerald-500"
                        />
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">Has Website</span>
                      </label>

                      {/* Score Range - always visible */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Score:</span>
                        <input
                          type="number"
                          value={minScoreInput}
                          onChange={(e) => setMinScoreInput(e.target.value)}
                          placeholder="Min"
                          className="input w-16 text-sm py-1.5"
                          min="0"
                          max="100"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="number"
                          value={maxScoreInput}
                          onChange={(e) => setMaxScoreInput(e.target.value)}
                          placeholder="Max"
                          className="input w-16 text-sm py-1.5"
                          min="0"
                          max="100"
                        />
                      </div>

                      {/* Clear filters button */}
                      {(filters.minScore || filters.maxScore || filters.industries?.length || filters.hasWebsite) && (
                        <button
                          onClick={clearFilters}
                          className="btn-ghost text-xs py-1 px-2 text-red-600"
                        >
                          <X className="w-3 h-3" />
                          Clear
                        </button>
                      )}

                      {/* Toggle advanced filters */}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="ml-auto btn-ghost text-xs py-1.5"
                      >
                        {showFilters ? 'Less' : 'More'}
                        {showFilters ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Advanced filters - collapsed by default */}
                    {showFilters && (
                      <div className="p-4 border-t border-slate-100 space-y-4">
                        {/* Industries Multi-Select */}
                        {availableIndustries.length > 0 && (
                          <div className="relative">
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Industries</label>
                            <button
                              onClick={() => setIndustryDropdownOpen(!industryDropdownOpen)}
                              className="input w-full text-left flex items-center justify-between"
                            >
                              <span className={filters.industries?.length ? 'text-slate-900' : 'text-slate-400'}>
                                {filters.industries?.length
                                  ? `${filters.industries.length} selected`
                                  : 'Select industries...'}
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>

                            {industryDropdownOpen && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {availableIndustries.map((industry) => (
                                  <label
                                    key={industry}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filters.industries?.includes(industry) || false}
                                      onChange={() => toggleIndustry(industry)}
                                      className="w-4 h-4 rounded text-emerald-500"
                                    />
                                    <span className="text-sm text-slate-700">{industry}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Filter Presets */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="text-xs font-medium text-slate-600 mb-2 block">Quick Filters</label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => applyFilterPreset('high_score')}
                              className="btn-ghost text-xs py-1 px-3"
                            >
                              High Score (55+)
                            </button>
                            <button
                              onClick={() => applyFilterPreset('high_score_with_website')}
                              className="btn-ghost text-xs py-1 px-3"
                            >
                              High Score + Website
                            </button>
                            <button
                              onClick={() => applyFilterPreset('all')}
                              className="btn-ghost text-xs py-1 px-3"
                            >
                              All
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pagination Info */}
                  <div className="card">
                    <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                        <span className="font-medium text-slate-900">
                          {companies.length} of {pagination.total > 0 ? pagination.total.toLocaleString() : companies.length} companies
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {pagination.hasMore && (
                          <button
                            onClick={() => loadFromGHL(true)}
                            disabled={loadingMore}
                            className="btn-secondary text-sm min-h-[36px]"
                          >
                            {loadingMore ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Load More ({pagination.total - companies.length} remaining)</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="px-4 py-2 bg-slate-50 text-xs text-slate-600 flex gap-4 flex-wrap">
                      <span>{filteredStats.withWebsite} with website</span>
                      {filteredStats.avgScore > 0 && <span>Avg score: {filteredStats.avgScore}</span>}
                      <span className="text-slate-400">•</span>
                      <span>
                        {importSource === 'ghl'
                          ? `Searching ${pagination.total.toLocaleString()} companies`
                          : 'from CSV'}
                      </span>
                    </div>

                    {/* Company Preview List */}
                    <div className="max-h-64 overflow-y-auto">
                      {companies.slice(0, 10).map((company) => (
                        <div key={company.id} className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-0">
                          <Building2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
                          <span className="text-sm text-slate-700 truncate flex-1">{company.name}</span>
                          {company.industry && (
                            <span className="text-xs text-slate-400 hidden sm:block">{company.industry}</span>
                          )}
                          {company.score !== undefined && (
                            <span className="text-xs font-medium text-slate-600">{company.score}</span>
                          )}
                        </div>
                      ))}
                      {companies.length > 10 && (
                        <div className="p-3 text-center text-sm text-slate-500">
                          +{(companies.length - 10).toLocaleString()} more companies
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Next button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className="btn-primary min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Review
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review & Confirm */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Review Your Selection</h3>
                <p className="text-slate-500 text-sm mt-1">Select the companies you want to research</p>
              </div>

              {/* Quick Select Strategies - Simplified with dropdown for more options */}
              <div className="card p-4">
                <label className="text-xs font-medium text-slate-600 mb-2 block">Quick Select</label>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Primary options (most common) */}
                  <button
                    onClick={() => applySelectionStrategy('top_25_by_score')}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Top 25 by Score
                  </button>
                  <button
                    onClick={() => applySelectionStrategy('top_50_by_score')}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Top 50 by Score
                  </button>
                  <button
                    onClick={() => applySelectionStrategy('all_filtered')}
                    className="btn-secondary text-sm py-1.5"
                  >
                    All Filtered ({filteredCompanies.length})
                  </button>

                  {/* More options dropdown */}
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          applySelectionStrategy(e.target.value as BulkSelectionStrategy);
                          e.target.value = '';
                        }
                      }}
                      className="btn-ghost text-sm py-1.5 pr-8 appearance-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>More options...</option>
                      <option value="first_5">First 5</option>
                      <option value="first_10">First 10</option>
                      <option value="first_25">First 25</option>
                      <option value="first_50">First 50</option>
                      <option value="first_100">First 100</option>
                      <option value="first_250">First 250</option>
                      <option value="first_500">First 500</option>
                      <option value="top_10_by_score">Top 10 by Score</option>
                      <option value="top_100_by_score">Top 100 by Score</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Research Type Selector */}
              <div className="card p-4">
                <label className="text-xs font-medium text-slate-600 mb-3 block">Research Depth</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RESEARCH_TYPE_CONFIG.map((type) => {
                    const Icon = type.icon;
                    const isSelected = researchType === type.id;
                    const colorMap: Record<string, { bg: string; icon: string; credits: string }> = {
                      amber: {
                        bg: isSelected ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-slate-200 hover:border-amber-200',
                        icon: 'bg-amber-100 text-amber-600',
                        credits: 'text-amber-600',
                      },
                      emerald: {
                        bg: isSelected ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200',
                        icon: 'bg-emerald-100 text-emerald-600',
                        credits: 'text-emerald-600',
                      },
                      purple: {
                        bg: isSelected ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-white border-slate-200 hover:border-purple-200',
                        icon: 'bg-purple-100 text-purple-600',
                        credits: 'text-purple-600',
                      },
                    };
                    const colorClasses = colorMap[type.color];

                    return (
                      <button
                        key={type.id}
                        onClick={() => setResearchType(type.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${colorClasses.bg}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses.icon}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{type.label}</p>
                            <p className={`text-xs font-medium ${colorClasses.credits}`}>
                              {type.credits} credit{type.credits > 1 ? 's' : ''}/company
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">{type.description}</p>
                        {type.requiresTavily && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Requires Tavily API key
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Card with Token Estimates */}
              <div className="card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-emerald-700">Ready to research</p>
                    <p className="text-3xl font-bold text-emerald-900">{selectedCount} companies</p>
                    {filteredCompanies.length !== companies.length && (
                      <p className="text-xs text-emerald-600 mt-1">
                        {selectedFromFiltered} from {filteredCompanies.length} filtered
                      </p>
                    )}
                  </div>
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Layers className="w-8 h-8 text-emerald-600" aria-hidden="true" />
                  </div>
                </div>

                {/* Token Usage Estimate */}
                {selectedCount > 0 && tokenEstimate && (
                  <div className="border-t border-emerald-200 pt-4 mt-4 space-y-2">
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Estimated Usage</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-xs text-emerald-600">Input Tokens</p>
                        <p className="text-sm font-semibold text-emerald-800">~{(tokenEstimate.estimatedInputTokens / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-xs text-emerald-600">Output Tokens</p>
                        <p className="text-sm font-semibold text-emerald-800">~{(tokenEstimate.estimatedOutputTokens / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-xs text-emerald-600">Est. API Cost</p>
                        <p className="text-sm font-semibold text-emerald-800">${tokenEstimate.minCost.toFixed(2)} - ${tokenEstimate.maxCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-xs text-emerald-600">Est. Time</p>
                        <p className="text-sm font-semibold text-emerald-800">~{estimatedTimeMinutes} min</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                      <DollarSign className="w-3 h-3" />
                      Using your OpenAI API key (GPT-4o pricing)
                    </p>
                  </div>
                )}
              </div>

              {/* Batch Size Warnings */}
              {selectedCount > 0 && batchWarningLevel !== 'none' && (
                <>
                  {/* Caution Warning (101-250) */}
                  {batchWarningLevel === 'caution' && (
                    <div className="card p-4 bg-amber-50 border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Large Batch</p>
                          <p className="text-sm text-amber-700 mt-1">
                            This batch will take approximately {estimatedTimeMinutes} minutes to complete.
                            Browser must remain open during processing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extended Warning (251-500) */}
                  {batchWarningLevel === 'extended' && (
                    <div className="card p-4 bg-orange-50 border-orange-300">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-orange-800">Large Batch Warning</p>
                          <p className="text-sm text-orange-700 mt-1">
                            You've selected {selectedCount} companies. Processing will take approximately {estimatedTimeMinutes} minutes.
                          </p>
                          <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
                            <li>Browser must stay open during entire processing</li>
                            <li>Consider splitting into smaller batches for reliability</li>
                            <li>Session can be resumed if interrupted (24hr window)</li>
                          </ul>
                          <label className="flex items-center gap-2 mt-4 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={batchWarningConfirmed}
                              onChange={(e) => setBatchWarningConfirmed(e.target.checked)}
                              className="w-4 h-4 rounded text-orange-600"
                            />
                            <span className="text-sm font-medium text-orange-800">
                              I understand the requirements and want to proceed
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blocked (501+) */}
                  {batchWarningLevel === 'blocked' && (
                    <div className="card p-4 bg-red-50 border-red-300">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-800">Batch Too Large</p>
                          <p className="text-sm text-red-700 mt-1">
                            Maximum batch size is {BATCH_LIMITS.HARD_MAX} companies. You've selected {selectedCount}.
                          </p>
                          <p className="text-sm text-red-700 mt-2 font-medium">To proceed:</p>
                          <ul className="text-sm text-red-700 mt-1 space-y-1 list-disc list-inside">
                            <li>Use filters to narrow your selection</li>
                            <li>Or process in multiple batches of {BATCH_LIMITS.HARD_MAX} or fewer</li>
                          </ul>
                          <p className="text-xs text-red-600 mt-3">
                            Why? Processing {selectedCount} companies would take ~{estimatedTimeMinutes} minutes and risks
                            browser timeouts, memory issues, and session interruptions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Company List with Selection - Virtual Scrolling */}
              <div className="card">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filteredCompanies.length > 0 && filteredCompanies.every((c) => c.selected)}
                      onChange={(e) => toggleAllFiltered(e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Select all filtered ({filteredCompanies.length})
                    </span>
                  </label>
                  <span className="text-sm text-slate-500">{selectedFromFiltered} selected</span>
                </div>

                {/* Scrollable Company List */}
                {filteredCompanies.length > 0 ? (
                  <div className="max-h-[400px] overflow-y-auto">
                    {visibleCompanies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={company.selected}
                          onChange={() => toggleSelect(company.id)}
                          className="w-5 h-5 rounded text-emerald-500"
                        />
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-slate-500" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{company.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {company.website || 'No website'} • {company.industry || 'Unknown industry'}
                          </p>
                        </div>
                        {company.score !== undefined && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                            company.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                            company.score >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {company.score}
                          </span>
                        )}
                      </label>
                    ))}
                    {filteredCompanies.length > VISIBLE_LIMIT && (
                      <div className="p-4 text-center text-sm text-slate-500 bg-slate-50">
                        Showing first {VISIBLE_LIMIT} of {filteredCompanies.length} companies.
                        Use filters or quick select to narrow down your selection.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No companies match the current filters
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="btn-ghost min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </button>
                <button
                  onClick={confirmAndStartResearch}
                  disabled={
                    !canProceedToStep3 ||
                    batchWarningLevel === 'blocked' ||
                    (batchWarningLevel === 'extended' && !batchWarningConfirmed)
                  }
                  className="btn-primary min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Start Research ({selectedCount})
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Progress & Results */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Progress Section - shown while processing or if there are pending items */}
              {(processing || processedCount < selectedCount) && (
                <div className="card p-6">
                  {/* Header with stats */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-heading">
                        {processing ? (paused ? 'Research Paused' : 'Research in Progress') : 'Ready to Continue'}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="success" size="md">
                          {processedCount} completed
                        </Badge>
                        {failedCount > 0 && (
                          <Badge variant="danger" size="md">
                            {failedCount} failed
                          </Badge>
                        )}
                        <Badge variant="neutral" size="md">
                          {selectedCount - processedCount - failedCount} pending
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {processing && (
                        <Button
                          variant={paused ? 'primary' : 'secondary'}
                          onClick={togglePause}
                          leftIcon={paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        >
                          {paused ? 'Resume' : 'Pause'}
                        </Button>
                      )}
                      {!processing && processedCount < selectedCount && (
                        <Button
                          variant="primary"
                          onClick={startResearch}
                          leftIcon={<Play className="w-4 h-4" />}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar with percentage */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 font-medium">
                        {processedCount} / {selectedCount} companies
                      </span>
                      <span className="text-slate-500 font-data">
                        {selectedCount ? Math.round((processedCount / selectedCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${selectedCount ? (processedCount / selectedCount) * 100 : 0}%` }}
                        role="progressbar"
                        aria-valuenow={processedCount}
                        aria-valuemin={0}
                        aria-valuemax={selectedCount}
                        aria-label={`Research progress: ${processedCount} of ${selectedCount} complete`}
                      />
                    </div>
                  </div>

                  {/* Time estimate */}
                  {processing && !paused && (selectedCount - processedCount) > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>
                        ~{Math.ceil((selectedCount - processedCount) * (researchType === 'deep' ? 90 : researchType === 'standard' ? 15 : 5) / 60)} minutes remaining
                      </span>
                    </div>
                  )}

                  {/* Live Token Usage Tracking */}
                  {(tokenUsage.totalInputTokens > 0 || tokenUsage.totalOutputTokens > 0) && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Token Usage (Live)</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Input</p>
                          <p className="text-sm font-semibold text-slate-700">{tokenUsage.totalInputTokens.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Output</p>
                          <p className="text-sm font-semibold text-slate-700">{tokenUsage.totalOutputTokens.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Est. Cost</p>
                          <p className="text-sm font-semibold text-emerald-600">${tokenUsage.totalEstimatedCost.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Processing list with streaming results */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Processing Queue
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {companies
                        .filter((c) => c.selected)
                        .sort((a, b) => {
                          // Sort: processing first, then pending, then completed
                          const order = { processing: 0, pending: 1, completed: 2, failed: 3 };
                          return order[a.status] - order[b.status];
                        })
                        .map((company) => (
                          <div
                            key={company.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${
                              company.status === 'processing' ? 'bg-teal-50' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200">
                              {company.status === 'processing' && (
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                              )}
                              {company.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-success-500" />
                              )}
                              {company.status === 'failed' && (
                                <XCircle className="w-4 h-4 text-danger-500" />
                              )}
                              {company.status === 'pending' && (
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm truncate block ${
                                company.status === 'processing' ? 'text-teal-700 font-medium' :
                                company.status === 'failed' ? 'text-danger-600' :
                                company.status === 'completed' ? 'text-slate-700' : 'text-slate-500'
                              }`}>
                                {company.name}
                              </span>
                              {company.status === 'completed' && company.result?.company_profile?.industry && (
                                <span className="text-xs text-slate-400">
                                  {company.result.company_profile.industry}
                                </span>
                              )}
                            </div>
                            {company.status === 'failed' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-danger-500 truncate max-w-[120px]" title={company.error}>
                                  {company.error || 'Failed'}
                                </span>
                                <button
                                  onClick={() => retryCompany(company.id)}
                                  className="text-xs text-teal-600 hover:underline font-medium px-2 py-1 bg-teal-50 rounded"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : company.status === 'completed' ? (
                              <button
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setShowReportModal(true);
                                }}
                                className="text-xs text-teal-600 hover:underline font-medium"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {company.status === 'processing' && 'Researching...'}
                                {company.status === 'pending' && 'Queued'}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Session Complete Summary */}
              {!processing && completedCount > 0 && processedCount >= selectedCount && (
                <div className="card p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-teal-900">Session Complete</h3>
                      <p className="text-sm text-teal-700">All selected companies have been processed</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-teal-600 uppercase tracking-wider">Companies</p>
                      <p className="text-xl font-bold text-teal-900">{completedCount}</p>
                      <p className="text-xs text-teal-600">processed</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-teal-600 uppercase tracking-wider">Success Rate</p>
                      <p className="text-xl font-bold text-teal-900">
                        {selectedCount > 0 ? Math.round((completedCount / selectedCount) * 100) : 0}%
                      </p>
                      <p className="text-xs text-teal-600">{completedCount}/{selectedCount}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-teal-600 uppercase tracking-wider">Token Usage</p>
                      <p className="text-sm font-semibold text-teal-900">
                        {(tokenUsage.totalInputTokens / 1000).toFixed(1)}K in
                      </p>
                      <p className="text-sm font-semibold text-teal-900">
                        {(tokenUsage.totalOutputTokens / 1000).toFixed(1)}K out
                      </p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-teal-600 uppercase tracking-wider">Total Cost</p>
                      <p className="text-xl font-bold text-teal-900">
                        ${tokenUsage.totalEstimatedCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-teal-600">API usage</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-teal-200">
                    {sessionDuration && (
                      <p className="text-xs text-teal-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Total session time: {sessionDuration}
                      </p>
                    )}
                    <button
                      onClick={resetWizard}
                      className="btn-secondary text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Start New Batch
                    </button>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {completedCount > 0 && (
                <>
                  {/* Bulk Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="font-semibold text-slate-900">
                      {completedCount} Research Results
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={exportResults} className="btn-secondary min-h-[44px]">
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Export CSV
                      </button>
                      <button
                        onClick={pushAllToGHL}
                        disabled={pushingToGhl}
                        className="btn-primary min-h-[44px] disabled:opacity-70"
                      >
                        {pushingToGhl ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Pushing {ghlPushProgress.current}/{ghlPushProgress.total}...
                          </>
                        ) : (
                          <>
                            <CloudDownload className="w-4 h-4" aria-hidden="true" />
                            Push All to GHL
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Results Cards */}
                  <div className="space-y-4">
                    {companies
                      .filter((c) => c.status === 'completed' && c.result)
                      .map((company) => {
                        const result = company.result!;
                        const profile = result.company_profile;
                        const priority = result.outreach_priority;
                        const painPoints = result.pain_point_hypotheses || [];
                        const confidence = result.research_confidence;

                        return (
                          <div key={company.id} className="card p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-slate-900 text-lg">
                                  {profile.confirmed_name || company.name}
                                </h4>
                                <p className="text-sm text-slate-500">
                                  {typeof profile.industry === 'string' ? profile.industry : ((profile.industry as { vertical?: string })?.vertical || company.industry)}
                                  {typeof profile.sub_segment === 'string' && profile.sub_segment && ` • ${profile.sub_segment}`}
                                </p>
                                {/* Company metrics */}
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                                  {profile.employee_count && (
                                    <span>{profile.employee_count} employees</span>
                                  )}
                                  {profile.estimated_revenue && (
                                    <span>{profile.estimated_revenue} revenue</span>
                                  )}
                                  {profile.headquarters && (
                                    <span>{profile.headquarters}</span>
                                  )}
                                </div>
                              </div>
                              <span className={`badge ${
                                (confidence?.overall_score || 0) >= 0.7 ? 'badge-emerald' :
                                (confidence?.overall_score || 0) >= 0.5 ? 'badge-amber' : 'badge-slate'
                              }`}>
                                {Math.round((confidence?.overall_score || 0) * 100)}%
                              </span>
                            </div>

                            {/* Recommended Personas */}
                            {priority?.recommended_personas && priority.recommended_personas.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {priority.recommended_personas.slice(0, 4).map((persona: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                    {persona}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Top Pain Points */}
                            {painPoints.length > 0 && (
                              <div className="mb-3 space-y-2">
                                {painPoints.slice(0, 2).map((pain, i) => (
                                  <div key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                    <p className="text-sm text-slate-700 font-medium">{pain.hypothesis}</p>
                                    {pain.evidence && (
                                      <p className="text-xs text-slate-500 mt-1">{pain.evidence}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Top Signals */}
                            {result.recent_signals?.slice(0, 2).map((signal, i) => (
                              <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2">
                                <span className="text-xs font-semibold text-emerald-600">
                                  {signal.type}
                                </span>
                                <p className="text-sm text-slate-700 mt-1">
                                  {signal.description || signal.headline}
                                </p>
                                {signal.source_url && (
                                  <a
                                    href={signal.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-teal-600 hover:underline mt-1 inline-block"
                                  >
                                    View source
                                  </a>
                                )}
                              </div>
                            ))}

                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => openReportModal(company)}
                                className="btn-ghost text-sm flex-1 min-h-[40px]"
                              >
                                View Full Report
                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch('/api/ghl/push', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        business_id: company.id,
                                        research_data: company.result,
                                        contact_data: {
                                          companyName: company.name,
                                          website: company.website,
                                        },
                                      }),
                                    });
                                    alert(`Pushed ${company.name} to GHL`);
                                  } catch {
                                    alert(`Failed to push ${company.name} to GHL`);
                                  }
                                }}
                                className="btn-secondary text-sm min-h-[40px]"
                              >
                                <CloudDownload className="w-4 h-4" aria-hidden="true" />
                                Push to GHL
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {/* Empty state for results */}
              {!processing && completedCount === 0 && (
                <div className="card p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-semibold text-slate-900 mb-2">No results yet</h3>
                  <p className="text-slate-500 text-sm">
                    Research is processing. Results will appear here.
                  </p>
                </div>
              )}

              {/* Start Over Button */}
              {!processing && (
                <div className="flex justify-center pt-4">
                  <button onClick={resetWizard} className="btn-ghost min-h-[44px]">
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    Start New Batch
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Report Modal */}
      {showReportModal && selectedCompany?.result && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeReportModal}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div className="relative min-h-screen flex items-start justify-center p-4 pt-8 pb-8">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedCompany.result.company_profile.confirmed_name || selectedCompany.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {typeof selectedCompany.result.company_profile.industry === 'string'
                      ? selectedCompany.result.company_profile.industry
                      : ((selectedCompany.result.company_profile.industry as { vertical?: string })?.vertical || selectedCompany.industry)}
                    {typeof selectedCompany.result.company_profile.sub_segment === 'string' && selectedCompany.result.company_profile.sub_segment && ` • ${selectedCompany.result.company_profile.sub_segment}`}
                  </p>
                </div>
                <button
                  onClick={closeReportModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {(() => {
                  const result = selectedCompany.result;
                  const isDeepResult = researchType === 'deep';
                  const hypothesis = getHypothesis(result);

                  return (
                    <>
                      {/* Company Profile Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            {result.company_profile.ownership_type && (
                              <span className="inline-block mb-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                {result.company_profile.ownership_type}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {/* Confidence Badge */}
                            {result.research_confidence?.overall_score !== undefined ? (
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(
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
                              <p className="font-semibold text-slate-900">
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
                        <div className="bg-white rounded-xl border-2 border-red-200 p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Target className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Intent Signals</h3>
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
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Lightbulb className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Sales Hypothesis</h3>
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
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Signals</h3>
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
                                      <span className="text-xs text-slate-500 whitespace-nowrap">
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

                      {/* Pain Points */}
                      {result.pain_point_hypotheses && result.pain_point_hypotheses.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                          <h3 className="text-lg font-bold text-slate-900 mb-4">Pain Point Hypotheses</h3>
                          <div className="space-y-3">
                            {result.pain_point_hypotheses.map((point, index) => (
                              <div key={index} className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="font-medium text-slate-900 mb-1">{point.hypothesis}</p>
                                <p className="text-sm text-slate-600">{point.evidence}</p>
                                {point.revology_solution_fit && (
                                  <p className="text-xs text-teal-600 mt-2">
                                    Solution Fit: {point.revology_solution_fit}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Persona Angles */}
                      {result.persona_angles && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-slate-600" />
                            <h3 className="text-lg font-bold text-slate-900">Persona Angles</h3>
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
                        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-slate-600" />
                            <h3 className="text-lg font-bold text-slate-900">Outreach Priority</h3>
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
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h3 className="text-lg font-bold text-amber-800">Research Gaps</h3>
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
                        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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
                                <p className="font-semibold text-slate-900">{result.metadata.searches_performed}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <Database className="w-3 h-3" />
                                  Sources
                                </p>
                                <p className="font-semibold text-slate-900">{result.metadata.sources_cited}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Duration
                                </p>
                                <p className="font-semibold text-slate-900">
                                  {Math.round((result.metadata.execution_time_ms || 0) / 1000)}s
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  Est. Cost
                                </p>
                                <p className="font-semibold text-slate-900">
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

                      {/* Research Confidence Details */}
                      {result.research_confidence && (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Confidence Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {result.research_confidence.financial_confidence !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Financial Data</p>
                                <p className="font-semibold text-slate-900">
                                  {Math.round(result.research_confidence.financial_confidence * 100)}%
                                </p>
                              </div>
                            )}
                            {result.research_confidence.signal_freshness !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Signal Freshness</p>
                                <p className="font-semibold text-slate-900">
                                  {Math.round(result.research_confidence.signal_freshness * 100)}%
                                </p>
                              </div>
                            )}
                            {result.research_confidence.source_quality !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Source Quality</p>
                                <p className="font-semibold text-slate-900">
                                  {Math.round(result.research_confidence.source_quality * 100)}%
                                </p>
                              </div>
                            )}
                            {result.research_confidence.search_coverage !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Search Coverage</p>
                                <p className="font-semibold text-slate-900">
                                  {Math.round(result.research_confidence.search_coverage * 100)}%
                                </p>
                              </div>
                            )}
                          </div>
                          {result.research_confidence.gaps && result.research_confidence.gaps.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Data Gaps</p>
                              <ul className="space-y-1">
                                {result.research_confidence.gaps.map((gap, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="text-amber-500">•</span>
                                    {gap}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={closeReportModal}
                  className="btn-secondary flex-1 min-h-[44px]"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!selectedCompany) return;
                    try {
                      await fetch('/api/ghl/push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          business_id: selectedCompany.id,
                          research_data: selectedCompany.result,
                          contact_data: {
                            companyName: selectedCompany.name,
                            website: selectedCompany.website,
                          },
                        }),
                      });
                      alert(`Pushed ${selectedCompany.name} to GHL`);
                    } catch {
                      alert(`Failed to push ${selectedCompany.name} to GHL`);
                    }
                  }}
                  className="btn-primary flex-1 min-h-[44px]"
                >
                  <CloudDownload className="w-4 h-4" />
                  Push to GHL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
