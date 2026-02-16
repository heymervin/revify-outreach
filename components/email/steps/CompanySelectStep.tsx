'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  Search,
  Building2,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { GHLCompany } from '../OutreachWizard';

interface CompanySelectStepProps {
  selectedCompany: GHLCompany | null;
  onCompanySelect: (company: GHLCompany) => void;
  onCompanyClear: () => void;
  onNext: () => void;
  checkingResearch: boolean;
  hasResearch: boolean;
}

export function CompanySelectStep({
  selectedCompany,
  onCompanySelect,
  onCompanyClear,
  onNext,
  checkingResearch,
  hasResearch,
}: CompanySelectStepProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [ghlConfigured, setGhlConfigured] = useState<boolean | null>(null);
  const [companies, setCompanies] = useState<GHLCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debouncedQuery = useDebounce(filterQuery, 300);
  const hasFetchedConfig = useRef(false);
  const hasFetchedInitial = useRef(false);

  // Check GHL configuration on mount
  useEffect(() => {
    if (hasFetchedConfig.current) return;
    hasFetchedConfig.current = true;

    const checkConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setGhlConfigured(false);
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userData?.organization_id) {
          setGhlConfigured(false);
          return;
        }

        const [configResult, keyResult] = await Promise.all([
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
        ]);

        setGhlConfigured(!!configResult.data?.location_id && !!keyResult.data?.key_hint);
      } catch {
        setGhlConfigured(false);
      }
    };

    checkConfig();
  }, [supabase]);

  // Fetch companies
  const fetchCompanies = useCallback(async (searchQuery?: string) => {
    if (searchQuery) {
      setSearchLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery?.trim()) {
        params.set('query', searchQuery.trim());
      }
      const response = await fetch(`/api/ghl/companies?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.companies) {
        setCompanies(data.companies);
        setFocusedIndex(-1);
      } else {
        setError(data.error || 'Failed to fetch companies');
        setCompanies([]);
      }
    } catch {
      setError('Failed to fetch companies');
      setCompanies([]);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, []);

  // Initial fetch and search
  useEffect(() => {
    if (!ghlConfigured) return;

    // Initial fetch
    if (!debouncedQuery && !hasFetchedInitial.current && companies.length === 0 && !loading) {
      hasFetchedInitial.current = true;
      fetchCompanies();
      return;
    }

    // Search query changed
    if (debouncedQuery) {
      fetchCompanies(debouncedQuery);
    }
  }, [debouncedQuery, ghlConfigured, companies.length, loading, fetchCompanies]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const focusedItem = items[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleSelectCompany = (company: GHLCompany) => {
    onCompanySelect(company);
    setDropdownOpen(false);
    setFilterQuery('');
    setFocusedIndex(-1);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < companies.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && companies[focusedIndex]) {
          handleSelectCompany(companies[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setDropdownOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleRetry = () => {
    setError(null);
    hasFetchedInitial.current = false;
    fetchCompanies(filterQuery || undefined);
  };

  // Get user-friendly error message
  const getErrorMessage = (err: string) => {
    if (err.includes('API key') || err.includes('Authentication')) {
      return 'Your GHL API key appears to be invalid. Please check your settings.';
    }
    if (err.includes('timeout') || err.includes('Timeout')) {
      return 'The request took too long. GHL might be experiencing slowdowns.';
    }
    if (err.includes('network') || err.includes('Network')) {
      return 'Network error. Please check your internet connection.';
    }
    return err || 'Something went wrong. Please try again.';
  };

  if (ghlConfigured === null) {
    return (
      <div className="card p-8 flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="ml-2 text-slate-500">Loading...</span>
      </div>
    );
  }

  if (!ghlConfigured) {
    return (
      <div className="card p-6 sm:p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">GHL Not Configured</h3>
        <p className="text-slate-500 mb-4">
          Please configure your GoHighLevel integration in Settings to use the outreach wizard.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
        >
          Go to Settings
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Select Company</h3>
            <p className="text-sm text-slate-500">Choose a company from your GHL account</p>
          </div>
        </div>

        {/* Company Selector */}
        <div className="relative" ref={dropdownRef}>
          <label id="company-select-label" className="sr-only">
            Search and select a company
          </label>
          <div
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            aria-controls="company-listbox"
            aria-labelledby="company-select-label"
            tabIndex={0}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer flex items-center justify-between min-h-[48px] ${
              dropdownOpen
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onKeyDown={handleKeyDown}
          >
            <span className={selectedCompany ? 'text-slate-900' : 'text-slate-400'}>
              {selectedCompany ? selectedCompany.companyName : 'Search for a company...'}
            </span>
            <div className="flex items-center gap-2">
              {selectedCompany && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompanyClear();
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Clear selection"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              {loading ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-80 overflow-hidden"
              role="dialog"
              aria-label="Company selection"
            >
              {/* Search Input */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  {searchLoading ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  )}
                  <input
                    ref={searchInputRef}
                    id="company-search"
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search companies..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Search companies"
                    aria-autocomplete="list"
                    aria-controls="company-listbox"
                  />
                </div>
              </div>

              {/* Company List */}
              <div
                ref={listRef}
                id="company-listbox"
                role="listbox"
                aria-label="Companies"
                className="overflow-y-auto max-h-60"
              >
                {error ? (
                  <div className="px-4 py-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                    <p className="text-sm text-red-600 mb-3">{getErrorMessage(error)}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={handleRetry}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                      <a
                        href="/settings"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        Check Settings
                      </a>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm flex items-center justify-center" role="status">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading companies...
                  </div>
                ) : companies.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-3">
                      {filterQuery ? 'No companies found matching your search' : 'No companies in GHL'}
                    </p>
                    {filterQuery && (
                      <button
                        onClick={() => setFilterQuery('')}
                        className="text-sm text-emerald-600 hover:underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  companies.map((company, index) => (
                    <div
                      key={company.id}
                      role="option"
                      aria-selected={selectedCompany?.id === company.id}
                      tabIndex={-1}
                      onClick={() => handleSelectCompany(company)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`w-full px-4 py-3 text-left cursor-pointer transition-colors border-b border-slate-50 last:border-0 min-h-[56px] ${
                        selectedCompany?.id === company.id
                          ? 'bg-emerald-50'
                          : focusedIndex === index
                            ? 'bg-emerald-50/50'
                            : 'hover:bg-slate-50'
                      } ${focusedIndex === index ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
                    >
                      <div className="font-medium text-sm text-slate-900">
                        {company.companyName}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {company.industry && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {company.industry}
                          </span>
                        )}
                        {company.website && (
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">
                            {company.website.replace(/^https?:\/\//, '')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Keyboard hint */}
              {companies.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 hidden sm:block">
                  Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↓</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">Enter</kbd> to select
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Company Info */}
        {selectedCompany && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{selectedCompany.companyName}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {selectedCompany.industry && (
                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {selectedCompany.industry}
                    </span>
                  )}
                  {selectedCompany.website && (
                    <a
                      href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline truncate max-w-[200px]"
                    >
                      {selectedCompany.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              {/* Research Status */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {checkingResearch ? (
                  <span className="flex items-center gap-1 text-xs text-slate-500" role="status">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking...
                  </span>
                ) : hasResearch ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Has Research
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    No Research
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedCompany || checkingResearch}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {selectedCompany && `Selected: ${selectedCompany.companyName}`}
      </div>
    </div>
  );
}
