import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, Loader2, ChevronDown, X, Database, Edit3, Users } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { GHLService, GHLCompanyOption, GHLAssociatedContact } from '../services/ghlService';

export type CompanySource = 'manual' | 'ghl';

export interface GHLCompanyData {
  companyName: string;
  website?: string;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  contacts?: GHLAssociatedContact[];
  // Saved research JSON from GHL
  companyResearch?: string;
  // GHL record ID for saving research
  ghlRecordId?: string;
}

interface GHLCompanySelectorProps {
  value: string;
  onChange: (companyName: string, data?: GHLCompanyData) => void;
  disabled?: boolean;
  source: CompanySource;
  onSourceChange: (source: CompanySource) => void;
}

const GHLCompanySelector: React.FC<GHLCompanySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  source,
  onSourceChange,
}) => {
  const { apiKeys, ghl } = useSettings();
  const [companies, setCompanies] = useState<GHLCompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hasGHLConfig = Boolean(apiKeys.ghl && ghl?.locationId);

  const fetchCompanies = useCallback(async (query?: string) => {
    if (!apiKeys.ghl || !ghl?.locationId) return;

    setLoading(true);
    setError(null);

    try {
      const service = new GHLService(apiKeys.ghl, ghl.locationId);
      const options = await service.getCompanyOptions(query);
      setCompanies(options);
    } catch (err) {
      console.error('Failed to fetch GHL companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [apiKeys.ghl, ghl?.locationId]);

  useEffect(() => {
    if (source === 'ghl' && hasGHLConfig) {
      fetchCompanies();
    }
  }, [source, hasGHLConfig, fetchCompanies]);

  useEffect(() => {
    if (source === 'ghl' && hasGHLConfig && searchQuery) {
      const debounce = setTimeout(() => {
        fetchCompanies(searchQuery);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, source, hasGHLConfig, fetchCompanies]);

  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);

  const handleSelectCompany = async (company: GHLCompanyOption) => {
    if (!apiKeys.ghl || !ghl?.locationId) return;

    setIsOpen(false);
    setSearchQuery('');
    setLoadingContacts(company.id);

    // First, send the basic company data immediately
    const companyData: GHLCompanyData = {
      companyName: company.companyName,
      website: company.website,
      industry: company.industry,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      description: company.description,
      companyResearch: company.companyResearch,
      ghlRecordId: company.id,
    };

    onChange(company.companyName, companyData);

    // Then fetch contacts in the background
    try {
      const service = new GHLService(apiKeys.ghl, ghl.locationId);
      const contacts = await service.getContactsForBusiness(company.id, company.companyName);

      // Update with contacts data
      onChange(company.companyName, {
        ...companyData,
        contacts,
      });
    } catch (err) {
      console.warn('Failed to fetch contacts for company:', err);
      // Keep the company data even if contacts fetch fails
    } finally {
      setLoadingContacts(null);
    }
  };

  const filteredCompanies = searchQuery
    ? companies.filter(c =>
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : companies;

  if (source === 'manual') {
    return (
      <div>
        <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
          <Building2 className="w-4 h-4 mr-1.5 text-slate-400" />
          Company Name <span className="text-red-500 ml-1">*</span>
          {hasGHLConfig && (
            <button
              type="button"
              onClick={() => onSourceChange('ghl')}
              disabled={disabled}
              className="ml-auto text-xs text-purple-600 hover:text-purple-700 flex items-center"
            >
              <Database className="w-3 h-3 mr-1" />
              Select from GHL
            </button>
          )}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., FoodWell"
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm transition-colors disabled:bg-slate-100"
        />
      </div>
    );
  }

  // GHL Source
  return (
    <div>
      <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
        <Database className="w-4 h-4 mr-1.5 text-purple-500" />
        Company from GHL <span className="text-red-500 ml-1">*</span>
        <button
          type="button"
          onClick={() => onSourceChange('manual')}
          disabled={disabled}
          className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center"
        >
          <Edit3 className="w-3 h-3 mr-1" />
          Enter manually
        </button>
      </label>

      <div className="relative">
        <div
          className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer flex items-center justify-between ${
            disabled
              ? 'bg-slate-100 border-slate-300'
              : isOpen
              ? 'border-purple-500 ring-2 ring-purple-500/20'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex items-center">
            <span className={value ? 'text-slate-900' : 'text-slate-400'}>
              {value || 'Select a company...'}
            </span>
            {loadingContacts && (
              <span className="ml-2 text-xs text-purple-500 flex items-center">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Loading contacts...
              </span>
            )}
          </div>
          <div className="flex items-center">
            {value && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-1 hover:bg-slate-100 rounded mr-1"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            {loading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search companies..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-48">
              {error ? (
                <div className="px-3 py-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : loading ? (
                <div className="px-3 py-4 text-center text-slate-500 text-sm flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading companies...
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="px-3 py-4 text-center text-slate-500 text-sm">
                  {searchQuery ? 'No companies found' : 'No companies in GHL'}
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelectCompany(company)}
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
                          {company.website}
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

      {!hasGHLConfig && (
        <p className="mt-1.5 text-xs text-amber-600">
          Configure GHL API key and Location ID in Settings to use this feature.
        </p>
      )}
    </div>
  );
};

export default GHLCompanySelector;
