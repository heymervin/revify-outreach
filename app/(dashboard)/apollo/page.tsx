'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Building2,
  Users,
  MapPin,
  Briefcase,
  TrendingUp,
  DollarSign,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  Filter,
  Mail,
  Globe,
  User,
  ExternalLink,
  Play,
  Zap,
} from 'lucide-react';

// Seniority display mapping
const SENIORITY_LABELS: Record<string, string> = {
  c_suite: 'C-Suite',
  vp: 'VP',
  director: 'Director',
  manager: 'Manager',
  entry: 'Entry Level',
  senior: 'Senior',
  founder: 'Founder',
  owner: 'Owner',
  partner: 'Partner',
};

// Email status badge component
const EmailStatusBadge = ({ status }: { status?: string }) => {
  if (!status || status === 'unavailable') {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-400" title="Unavailable" />;
  }
  if (status === 'verified') {
    return <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Verified" />;
  }
  if (status === 'guessed') {
    return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" title="Guessed" />;
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-gray-400" title="Unknown" />;
};

// Types
type Mode = 'lookup' | 'search';
type SearchType = 'people' | 'organizations';
type LookupType = 'person' | 'organization';

type Seniority = 'c_suite' | 'vp' | 'director' | 'manager' | 'entry';

interface PeopleFilters {
  keywords: string;
  job_titles: string;
  seniority: Seniority | '';
  domains: string;
  locations: string;
  departments: string;
  email_status: string;
}

interface OrganizationFilters {
  name_keywords: string;
  domains: string;
  industry_keywords: string;
  employee_range: string;
  revenue_range: string;
}

interface PersonLookupInput {
  email: string;
  linkedin_url: string;
  first_name: string;
  last_name: string;
  domain: string;
  organization_name: string;
}

interface OrgLookupInput {
  domain: string;
}

interface PersonResult {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  seniority: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  photo_url?: string;
  headline?: string;
  _apollo_data?: Record<string, unknown>;
}

interface OrganizationResult {
  id: string;
  name: string;
  industry: string;
  employees: string;
  revenue: string;
  location: string;
  website?: string;
  linkedin_url?: string;
  logo_url?: string;
  description?: string;
  founded_year?: string;
  _apollo_data?: Record<string, unknown>;
}

type SearchResult = PersonResult | OrganizationResult;

// ===== Demo Data =====
const DEMO_PEOPLE: PersonResult[] = [
  {
    id: 'demo-person-1',
    name: 'Sarah Chen',
    title: 'Chief Marketing Officer',
    company: 'TechFlow Solutions',
    location: 'San Francisco, CA, United States',
    seniority: 'c_suite',
    email: 'sarah.chen@techflow.io',
    email_status: 'verified',
    linkedin_url: 'https://linkedin.com/in/sarahchen',
    _apollo_data: {
      id: 'demo-person-1',
      first_name: 'Sarah',
      last_name: 'Chen',
      name: 'Sarah Chen',
      title: 'Chief Marketing Officer',
      email: 'sarah.chen@techflow.io',
      linkedin_url: 'https://linkedin.com/in/sarahchen',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      seniority: 'c_suite',
      departments: ['marketing'],
      organization: { name: 'TechFlow Solutions', website_url: 'https://techflow.io' },
    },
  },
  {
    id: 'demo-person-2',
    name: 'Marcus Williams',
    title: 'VP of Sales',
    company: 'DataBridge Analytics',
    location: 'Austin, TX, United States',
    seniority: 'vp',
    email: 'mwilliams@databridge.com',
    linkedin_url: 'https://linkedin.com/in/marcuswilliams',
    email_status: 'verified',
    _apollo_data: {
      id: 'demo-person-2',
      first_name: 'Marcus',
      last_name: 'Williams',
      name: 'Marcus Williams',
      title: 'VP of Sales',
      email: 'mwilliams@databridge.com',
      linkedin_url: 'https://linkedin.com/in/marcuswilliams',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      seniority: 'vp',
      departments: ['sales'],
      organization: { name: 'DataBridge Analytics', website_url: 'https://databridge.com' },
    },
  },
  {
    id: 'demo-person-3',
    name: 'Emily Rodriguez',
    title: 'Director of Operations',
    company: 'GreenScale Manufacturing',
    location: 'Chicago, IL, United States',
    seniority: 'director',
    email: 'emily.r@greenscale.com',
    linkedin_url: 'https://linkedin.com/in/emilyrodriguez',
    _apollo_data: {
    email_status: 'guessed',
      id: 'demo-person-3',
      first_name: 'Emily',
      last_name: 'Rodriguez',
      name: 'Emily Rodriguez',
      title: 'Director of Operations',
      email: 'emily.r@greenscale.com',
      linkedin_url: 'https://linkedin.com/in/emilyrodriguez',
      city: 'Chicago',
      state: 'IL',
      country: 'United States',
      seniority: 'director',
      departments: ['operations'],
      organization: { name: 'GreenScale Manufacturing', website_url: 'https://greenscale.com' },
    },
  },
  {
    id: 'demo-person-4',
    name: 'James Park',
    title: 'Head of Product',
    company: 'CloudNine Software',
    location: 'Seattle, WA, United States',
    seniority: 'vp',
    email: 'james@cloudnine.dev',
    linkedin_url: 'https://linkedin.com/in/jamespark',
    _apollo_data: {
      id: 'demo-person-4',
    email_status: 'verified',
      first_name: 'James',
      last_name: 'Park',
      name: 'James Park',
      title: 'Head of Product',
      email: 'james@cloudnine.dev',
      linkedin_url: 'https://linkedin.com/in/jamespark',
      city: 'Seattle',
      state: 'WA',
      country: 'United States',
      seniority: 'vp',
      departments: ['product'],
      organization: { name: 'CloudNine Software', website_url: 'https://cloudnine.dev' },
    },
  },
  {
    id: 'demo-person-5',
    name: 'Lisa Thompson',
    title: 'CEO',
    company: 'BrightPath Consulting',
    location: 'New York, NY, United States',
    seniority: 'c_suite',
    email: 'lisa@brightpath.co',
    linkedin_url: 'https://linkedin.com/in/lisathompson',
    _apollo_data: {
      id: 'demo-person-5',
      first_name: 'Lisa',
    email_status: 'guessed',
      last_name: 'Thompson',
      name: 'Lisa Thompson',
      title: 'CEO',
      email: 'lisa@brightpath.co',
      linkedin_url: 'https://linkedin.com/in/lisathompson',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      seniority: 'c_suite',
      departments: ['executive'],
      organization: { name: 'BrightPath Consulting', website_url: 'https://brightpath.co' },
    },
  },
];

const DEMO_ORGANIZATIONS: OrganizationResult[] = [
  {
    id: 'demo-org-1',
    name: 'TechFlow Solutions',
    industry: 'Computer Software',
    employees: '250',
    revenue: '$25M - $50M',
    location: 'San Francisco, CA, United States',
    website: 'https://techflow.io',
    linkedin_url: 'https://linkedin.com/company/techflow',
    description: 'Enterprise workflow automation platform helping companies streamline operations.',
    _apollo_data: {
      id: 'demo-org-1',
      name: 'TechFlow Solutions',
      website_url: 'https://techflow.io',
      industry: 'Computer Software',
      estimated_num_employees: 250,
      annual_revenue_printed: '$25M - $50M',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      short_description: 'Enterprise workflow automation platform helping companies streamline operations.',
      linkedin_url: 'https://linkedin.com/company/techflow',
      primary_domain: 'techflow.io',
      phone: '(415) 555-0142',
    },
  },
  {
    id: 'demo-org-2',
    name: 'DataBridge Analytics',
    industry: 'Information Technology',
    employees: '500',
    revenue: '$50M - $100M',
    location: 'Austin, TX, United States',
    website: 'https://databridge.com',
    linkedin_url: 'https://linkedin.com/company/databridge',
    description: 'AI-powered business intelligence and data analytics solutions for mid-market companies.',
    _apollo_data: {
      id: 'demo-org-2',
      name: 'DataBridge Analytics',
      website_url: 'https://databridge.com',
      industry: 'Information Technology',
      estimated_num_employees: 500,
      annual_revenue_printed: '$50M - $100M',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      short_description: 'AI-powered business intelligence and data analytics solutions for mid-market companies.',
      linkedin_url: 'https://linkedin.com/company/databridge',
      primary_domain: 'databridge.com',
      phone: '(512) 555-0198',
    },
  },
  {
    id: 'demo-org-3',
    name: 'GreenScale Manufacturing',
    industry: 'Manufacturing',
    employees: '1200',
    revenue: '$100M - $500M',
    location: 'Chicago, IL, United States',
    website: 'https://greenscale.com',
    linkedin_url: 'https://linkedin.com/company/greenscale',
    description: 'Sustainable manufacturing solutions with carbon-neutral production facilities.',
    _apollo_data: {
      id: 'demo-org-3',
      name: 'GreenScale Manufacturing',
      website_url: 'https://greenscale.com',
      industry: 'Manufacturing',
      estimated_num_employees: 1200,
      annual_revenue_printed: '$100M - $500M',
      city: 'Chicago',
      state: 'IL',
      country: 'United States',
      short_description: 'Sustainable manufacturing solutions with carbon-neutral production facilities.',
      linkedin_url: 'https://linkedin.com/company/greenscale',
      primary_domain: 'greenscale.com',
      phone: '(312) 555-0267',
    },
  },
  {
    id: 'demo-org-4',
    name: 'CloudNine Software',
    industry: 'SaaS',
    employees: '150',
    revenue: '$10M - $25M',
    location: 'Seattle, WA, United States',
    website: 'https://cloudnine.dev',
    linkedin_url: 'https://linkedin.com/company/cloudnine',
    description: 'Cloud-native development platform for building and deploying modern applications.',
    _apollo_data: {
      id: 'demo-org-4',
      name: 'CloudNine Software',
      website_url: 'https://cloudnine.dev',
      industry: 'SaaS',
      estimated_num_employees: 150,
      annual_revenue_printed: '$10M - $25M',
      city: 'Seattle',
      state: 'WA',
      country: 'United States',
      short_description: 'Cloud-native development platform for building and deploying modern applications.',
      linkedin_url: 'https://linkedin.com/company/cloudnine',
      primary_domain: 'cloudnine.dev',
      phone: '(206) 555-0331',
    },
  },
  {
    id: 'demo-org-5',
    name: 'BrightPath Consulting',
    industry: 'Management Consulting',
    employees: '75',
    revenue: '$5M - $10M',
    location: 'New York, NY, United States',
    website: 'https://brightpath.co',
    linkedin_url: 'https://linkedin.com/company/brightpath',
    description: 'Strategic consulting firm specializing in digital transformation and organizational growth.',
    _apollo_data: {
      id: 'demo-org-5',
      name: 'BrightPath Consulting',
      website_url: 'https://brightpath.co',
      industry: 'Management Consulting',
      estimated_num_employees: 75,
      annual_revenue_printed: '$5M - $10M',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      short_description: 'Strategic consulting firm specializing in digital transformation and organizational growth.',
      linkedin_url: 'https://linkedin.com/company/brightpath',
      primary_domain: 'brightpath.co',
      phone: '(212) 555-0489',
    },
  },
];

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  error?: string;
}

interface ImportProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors?: string[];
}

export default function ApolloPage() {
  const [mode, setMode] = useState<Mode>('lookup');
  const [searchType, setSearchType] = useState<SearchType>('people');
  const [lookupType, setLookupType] = useState<LookupType>('person');
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);

  // Progressive disclosure for person lookup
  const [showNameFields, setShowNameFields] = useState(false);

  // Demo banner dismissal
  const [showDemo, setShowDemo] = useState(true);

  // People filters
  const [peopleFilters, setPeopleFilters] = useState<PeopleFilters>({
    keywords: '',
    job_titles: '',
    seniority: '',
    domains: '',
    locations: '',
    departments: '',
    email_status: '',
  });

  // Organization filters
  const [orgFilters, setOrgFilters] = useState<OrganizationFilters>({
    name_keywords: '',
    domains: '',
    industry_keywords: '',
    employee_range: '',
    revenue_range: '',
  });

  // Lookup inputs
  const [personLookup, setPersonLookup] = useState<PersonLookupInput>({
    email: '',
    linkedin_url: '',
    first_name: '',
    last_name: '',
    domain: '',
    organization_name: '',
  });

  const [orgLookup, setOrgLookup] = useState<OrgLookupInput>({
    domain: '',
  });

  // Lookup state
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<SearchResult | null>(null);

  // Search state
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importType, setImportType] = useState<'companies' | 'contacts' | 'both'>('contacts');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [linkContactsToCompanies, setLinkContactsToCompanies] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  // Demo mode
  const [demoMode, setDemoMode] = useState(false);
  const [demoSearchType, setDemoSearchType] = useState<'people' | 'organizations'>('people');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadDemoData = (type: 'people' | 'organizations') => {
    setDemoMode(true);
    setDemoSearchType(type);
    setSearchError(null);
    setLookupError(null);
    setSelectedIds(new Set());

    if (type === 'people') {
      setResults(DEMO_PEOPLE);
      setTotalResults(DEMO_PEOPLE.length);
      setCurrentPage(1);
      setTotalPages(1);
    } else {
      setResults(DEMO_ORGANIZATIONS);
      setTotalResults(DEMO_ORGANIZATIONS.length);
      setCurrentPage(1);
      setTotalPages(1);
    }
  };

  // Check Apollo API key on mount and check demo banner dismissal
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch('/api/keys');
        const data = await response.json();

        if (response.ok && data.keys) {
          const apolloKey = data.keys.find((k: any) => k.provider === 'apollo');
          setApiKeyConfigured(!!apolloKey);
        } else {
          setApiKeyConfigured(false);
        }
      } catch {
        setApiKeyConfigured(false);
      }
    };

    // Check if demo banner was dismissed
    const demoDismissed = localStorage.getItem('apollo_demo_dismissed');
    if (demoDismissed) {
      setShowDemo(false);
    }

    checkApiKey();
  }, []);

  const handleDismissDemo = () => {
    localStorage.setItem('apollo_demo_dismissed', 'true');
    setShowDemo(false);
  };

  // Poll import status
  useEffect(() => {
    if (!importJobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/apollo/import/${importJobId}`);
        const data = await response.json();

        if (response.ok) {
          setImportProgress(data);

          if (data.status === 'completed' || data.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error polling import status:', error);
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [importJobId]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const body = lookupType === 'person'
        ? {
            type: 'person',
            email: personLookup.email || undefined,
            linkedin_url: personLookup.linkedin_url || undefined,
            first_name: personLookup.first_name || undefined,
            last_name: personLookup.last_name || undefined,
            domain: personLookup.domain || undefined,
            organization_name: personLookup.organization_name || undefined,
          }
        : {
            type: 'organization',
            domain: orgLookup.domain,
          };

      const response = await fetch('/api/apollo/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      if (data.result) {
        setLookupResult(data.result);
      } else {
        setLookupError(data.message || 'No result found');
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, page = 1) => {
    if (e) e.preventDefault();

    setSearching(true);
    setSearchError(null);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const filters = searchType === 'people'
        ? {
            keywords: peopleFilters.keywords,
            job_titles: peopleFilters.job_titles,
            seniority: peopleFilters.seniority,
            domains: peopleFilters.domains,
            locations: peopleFilters.locations,
            departments: peopleFilters.departments,
            email_status: peopleFilters.email_status,
          }
        : {
            name_keywords: orgFilters.name_keywords,
            domains: orgFilters.domains,
            industry_keywords: orgFilters.industry_keywords,
            employee_range: orgFilters.employee_range,
            revenue_range: orgFilters.revenue_range,
          };

      const response = await fetch('/api/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: searchType,
          filters,
          page,
          per_page: pageSize,
        }),
      });

      const data: SearchResponse = await response.json();

      if (!response.ok) {
        // Check for 403 error (free plan limitation)
        if (response.status === 403) {
          throw new Error('Search requires an Apollo paid plan. Use the Lookup tab for free-plan access.');
        }
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results);
      setTotalResults(data.total);
      setCurrentPage(data.page);
      setTotalPages(data.total_pages);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      handleSearch(undefined, newPage);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleStartImport = () => {
    setShowImportModal(true);
    setImportStep(1);
    setImportProgress(null);
    setImportJobId(null);
  };

  const handleImportLookupResult = () => {
    if (!lookupResult) return;

    // Set the lookup result as selected and open modal
    setSelectedIds(new Set([lookupResult.id]));
    setResults([lookupResult]);
    setShowImportModal(true);
    setImportStep(1);
    setImportProgress(null);
    setImportJobId(null);
  };

  const handleImportNext = () => {
    const nextStep = importStep + 1;

    // Auto-detect import type when entering step 2
    if (nextStep === 2) {
      const selectedRecords = results.filter(r => selectedIds.has(r.id));
      const peopleCount = selectedRecords.filter(r => isPerson(r)).length;
      const companiesCount = selectedRecords.length - peopleCount;

      if (peopleCount > 0 && companiesCount === 0) {
        setImportType('contacts');
      } else if (companiesCount > 0 && peopleCount === 0) {
        setImportType('companies');
      }
    }

    setImportStep(prev => Math.min(prev + 1, 4));
  };

  const handleImportBack = () => {
    setImportStep(prev => Math.max(prev - 1, 1));
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setImportStep(4);

    try {
      const selectedRecords = results.filter(r => selectedIds.has(r.id));

      // Transform UI results into import-compatible records with apollo_id, record_type, and apollo_data
      const importRecords = selectedRecords.map(r => ({
        apollo_id: r.id,
        record_type: isPerson(r) ? 'contact' : 'company',
        apollo_data: r._apollo_data || r,
      }));

      const response = await fetch('/api/apollo/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: importRecords,
          import_type: importType,
          options: {
            skip_duplicates: skipDuplicates,
            link_contacts_to_companies: linkContactsToCompanies,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportJobId(data.import_id);
      setImportProgress({
        status: 'pending',
        total: selectedRecords.length,
        processed: 0,
        successful: 0,
        failed: 0,
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Import failed');
      setImporting(false);
    }
  };

  const handleCloseModal = () => {
    setShowImportModal(false);
    setImportStep(1);
    setImportJobId(null);
    setImportProgress(null);
    setImporting(false);
  };

  const isPerson = (result: SearchResult): result is PersonResult => {
    return 'title' in result;
  };

  // Loading skeleton when checking API key
  if (apiKeyConfigured === null) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
          <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
        </header>
        <div className="p-4 sm:p-8"><div className="max-w-6xl mx-auto space-y-6">
          <div className="h-12 w-64 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        </div></div>
      </div>
    );
  }

  // Empty state when no API key
  if (apiKeyConfigured === false) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Apollo Integration</h2>
              <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">
                Lookup and search Apollo.io for people and companies
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">
                Apollo.io API Key Required
              </h3>
              <p className="text-slate-600 mb-6">
                Connect your Apollo.io account to start searching for leads and prospects.
              </p>
              <a
                href="/settings"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                Configure API Keys
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Apollo Integration</h2>
            <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">
              Lookup and search Apollo.io for people and companies
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Mode Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm inline-flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('lookup');
                setResults([]);
                setSelectedIds(new Set());
                setLookupResult(null);
                setLookupError(null);
                setSearchError(null);
                setDemoMode(false);
              }}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                mode === 'lookup'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Search className="w-4 h-4 inline-block mr-2" />
              Find by Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('search');
                setResults([]);
                setSelectedIds(new Set());
                setLookupResult(null);
                setLookupError(null);
                setSearchError(null);
                setDemoMode(false);
              }}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                mode === 'search'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 inline-block mr-2" />
              Search by Filters
            </button>
          </div>

          {/* Demo Mode Banner */}
          {showDemo && (
            <div className="bg-gradient-to-r from-amber-50 to-teal-50 rounded-2xl border border-amber-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 font-heading mb-1">Demo Mode</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Load sample Apollo data to test the full pipeline: view results, select contacts/companies, import to GHL, and generate PDF job orders.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => loadDemoData('people')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors shadow-sm"
                    >
                      <Users className="w-4 h-4" />
                      Load Demo Contacts
                    </button>
                    <button
                      onClick={() => loadDemoData('organizations')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      Load Demo Companies
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDismissDemo}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Dismiss demo banner"
                >
                  <X className="w-5 h-5 text-amber-600" />
                </button>
              </div>
            </div>
          )}

          {/* Demo Results */}
          {demoMode && results.length > 0 && (
            <>
              {/* Demo badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  Demo Data
                </span>
                <span className="text-sm text-slate-500">
                  {totalResults} sample {demoSearchType === 'people' ? 'contacts' : 'companies'}
                </span>
              </div>

              {/* Selection Action Bar */}
              {selectedIds.size > 0 && (
                <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                      <span className="font-semibold text-teal-900">
                        {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={clearSelection} className="btn-ghost">
                        <X className="w-4 h-4" />
                        Clear
                      </button>
                      <button onClick={handleStartImport} className="btn-primary">
                        <Download className="w-4 h-4" />
                        Import to GHL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Demo Results Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === results.length && results.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        {demoSearchType === 'people' ? (
                          <>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Title</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Company</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Location</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Seniority</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Industry</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Employees</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Revenue</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Location</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((result) => (
                        <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(result.id)}
                              onChange={() => toggleSelection(result.id)}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          {isPerson(result) ? (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{result.title}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{result.company}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {result.email ? (
                                  <div className="flex items-center gap-2">
                                    <EmailStatusBadge status={result.email_status} />
                                    <span>{result.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">{result.location || 'N/A'}</td>
                              <td className="px-4 py-3">
                                <span className="badge badge-teal text-xs">{SENIORITY_LABELS[result.seniority] || result.seniority}</span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{(result as OrganizationResult).industry || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{(result as OrganizationResult).employees || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{(result as OrganizationResult).revenue || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{result.location || 'N/A'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Lookup Mode */}
          {mode === 'lookup' && !demoMode && (
            <>
              {/* Lookup Type Toggle */}
              <div className="bg-slate-100 rounded-2xl border border-slate-200 p-2 shadow-sm inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLookupType('person');
                    setLookupResult(null);
                    setLookupError(null);
                  }}
                  className={`px-5 py-2 rounded-xl font-medium transition-all ${
                    lookupType === 'person'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <User className="w-4 h-4 inline-block mr-2" />
                  Person Lookup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLookupType('organization');
                    setLookupResult(null);
                    setLookupError(null);
                  }}
                  className={`px-5 py-2 rounded-xl font-medium transition-all ${
                    lookupType === 'organization'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline-block mr-2" />
                  Company Lookup
                </button>
              </div>

              {/* Lookup Form */}
              <form onSubmit={handleLookup} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    {lookupType === 'person' ? 'Person Lookup' : 'Company Lookup'}
                  </h3>
                </div>

                {lookupType === 'person' ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800">
                        Enter an email, LinkedIn URL, or name with company domain to look up a person
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="label">
                          <Mail className="w-4 h-4 inline-block mr-1" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={personLookup.email}
                          onChange={(e) => setPersonLookup({ ...personLookup, email: e.target.value })}
                          className="input"
                          placeholder="john@company.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="label">
                          <ExternalLink className="w-4 h-4 inline-block mr-1" />
                          LinkedIn URL
                        </label>
                        <input
                          type="url"
                          value={personLookup.linkedin_url}
                          onChange={(e) => setPersonLookup({ ...personLookup, linkedin_url: e.target.value })}
                          className="input"
                          placeholder="https://linkedin.com/in/johndoe"
                        />
                      </div>

                      <div className="md:col-span-2 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowNameFields(!showNameFields)}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                        >
                          {showNameFields ? '− Hide name search' : '→ Or search by name'}
                        </button>
                      </div>

                      {showNameFields && (
                        <>
                          <div>
                            <label className="label">First Name</label>
                            <input
                              type="text"
                              value={personLookup.first_name}
                              onChange={(e) => setPersonLookup({ ...personLookup, first_name: e.target.value })}
                              className="input"
                              placeholder="John"
                            />
                          </div>

                          <div>
                            <label className="label">Last Name</label>
                            <input
                              type="text"
                              value={personLookup.last_name}
                              onChange={(e) => setPersonLookup({ ...personLookup, last_name: e.target.value })}
                              className="input"
                              placeholder="Doe"
                            />
                          </div>

                          <div>
                            <label className="label">Company Domain</label>
                            <input
                              type="text"
                              value={personLookup.domain}
                              onChange={(e) => setPersonLookup({ ...personLookup, domain: e.target.value })}
                              className="input"
                              placeholder="company.com"
                            />
                          </div>

                          <div>
                            <label className="label">Organization Name</label>
                            <input
                              type="text"
                              value={personLookup.organization_name}
                              onChange={(e) => setPersonLookup({ ...personLookup, organization_name: e.target.value })}
                              className="input"
                              placeholder="Acme Corp"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="label">
                      <Globe className="w-4 h-4 inline-block mr-1" />
                      Company Domain (required)
                    </label>
                    <input
                      type="text"
                      value={orgLookup.domain}
                      onChange={(e) => setOrgLookup({ domain: e.target.value })}
                      className="input"
                      placeholder="company.com"
                      required
                    />
                  </div>
                )}

                <div className="flex items-center justify-end mt-6 pt-6 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={lookingUp}
                    className="btn-primary"
                  >
                    {lookingUp ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    {lookingUp ? 'Looking up...' : 'Lookup'}
                  </button>
                </div>

                {lookupError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {lookupError}
                  </div>
                )}
              </form>

              {/* Lookup Result Card */}
              {lookupResult && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 font-heading">Lookup Result</h3>
                    <button
                      onClick={handleImportLookupResult}
                      className="btn-primary"
                    >
                      <Download className="w-4 h-4" />
                      Import to GHL
                    </button>
                  </div>

                  {isPerson(lookupResult) ? (
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        {lookupResult.photo_url && (
                          <img
                            src={lookupResult.photo_url}
                            alt={lookupResult.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-slate-900">{lookupResult.name}</h4>
                          <p className="text-slate-700 font-medium mt-1">{lookupResult.title}</p>
                          <p className="text-slate-600 mt-1">{lookupResult.company}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lookupResult.email && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <Mail className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Email</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.email}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.location && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Location</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.location}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.seniority && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <Briefcase className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Seniority</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.seniority}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.linkedin_url && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <ExternalLink className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">LinkedIn</div>
                              <a
                                href={lookupResult.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-teal-600 hover:text-teal-700 mt-1 inline-block"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {lookupResult.headline && (
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Headline</div>
                          <p className="text-sm text-slate-700">{lookupResult.headline}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        {lookupResult.logo_url && (
                          <img
                            src={lookupResult.logo_url}
                            alt={lookupResult.name}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-slate-900">{lookupResult.name}</h4>
                          {lookupResult.industry && (
                            <p className="text-slate-700 font-medium mt-1">{lookupResult.industry}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lookupResult.website && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <Globe className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Website</div>
                              <a
                                href={lookupResult.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-teal-600 hover:text-teal-700 mt-1 inline-block"
                              >
                                {lookupResult.website}
                              </a>
                            </div>
                          </div>
                        )}

                        {lookupResult.location && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Location</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.location}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.employees && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <Users className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Employees</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.employees}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.revenue && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <DollarSign className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Revenue</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.revenue}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.founded_year && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">Founded</div>
                              <div className="text-sm text-slate-900 mt-1">{lookupResult.founded_year}</div>
                            </div>
                          </div>
                        )}

                        {lookupResult.linkedin_url && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <ExternalLink className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-semibold">LinkedIn</div>
                              <a
                                href={lookupResult.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-teal-600 hover:text-teal-700 mt-1 inline-block"
                              >
                                View Company Page
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {lookupResult.description && (
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Description</div>
                          <p className="text-sm text-slate-700">{lookupResult.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Search Mode */}
          {mode === 'search' && !demoMode && (
            <>
              {/* Search Type Toggle */}
              <div className="bg-slate-100 rounded-2xl border border-slate-200 p-2 shadow-sm inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('people');
                    setResults([]);
                    setSelectedIds(new Set());
                  }}
                  className={`px-5 py-2 rounded-xl font-medium transition-all ${
                    searchType === 'people'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  People
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('organizations');
                    setResults([]);
                    setSelectedIds(new Set());
                  }}
                  className={`px-5 py-2 rounded-xl font-medium transition-all ${
                    searchType === 'organizations'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline-block mr-2" />
                  Organizations
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Search Filters</h3>
                </div>

                {searchType === 'people' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Keywords</label>
                      <input
                        type="text"
                        value={peopleFilters.keywords}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, keywords: e.target.value })}
                        className="input"
                        placeholder="e.g., marketing automation"
                      />
                    </div>

                    <div>
                      <label className="label">Job Titles (comma-separated)</label>
                      <input
                        type="text"
                        value={peopleFilters.job_titles}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, job_titles: e.target.value })}
                        className="input"
                        placeholder="e.g., CMO, VP Marketing"
                      />
                    </div>

                    <div>
                      <label className="label">Seniority</label>
                      <select
                        value={peopleFilters.seniority}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, seniority: e.target.value as Seniority | '' })}
                        className="input"
                      >
                        <option value="">All Levels</option>
                        <option value="c_suite">C-Suite</option>
                        <option value="vp">VP</option>
                        <option value="director">Director</option>
                        <option value="manager">Manager</option>
                        <option value="entry">Entry Level</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Company Domains (comma-separated)</label>
                      <input
                        type="text"
                        value={peopleFilters.domains}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, domains: e.target.value })}
                        className="input"
                        placeholder="e.g., example.com, company.com"
                      />
                    </div>

                    <div>
                      <label className="label">Locations (comma-separated)</label>
                      <input
                        type="text"
                        value={peopleFilters.locations}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, locations: e.target.value })}
                        className="input"
                        placeholder="e.g., San Francisco, New York"
                      />
                    </div>

                    <div>
                      <label className="label">Department</label>
                      <select
                        value={peopleFilters.departments}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, departments: e.target.value })}
                        className="input"
                      >
                        <option value="">All Departments</option>
                        <option value="engineering">Engineering</option>
                        <option value="sales">Sales</option>
                        <option value="marketing">Marketing</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                        <option value="hr">HR</option>
                        <option value="legal">Legal</option>
                        <option value="product">Product</option>
                        <option value="design">Design</option>
                        <option value="it">IT</option>
                        <option value="executive">Executive</option>
                        <option value="support">Support</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Email Status</label>
                      <select
                        value={peopleFilters.email_status}
                        onChange={(e) => setPeopleFilters({ ...peopleFilters, email_status: e.target.value })}
                        className="input"
                      >
                        <option value="">All</option>
                        <option value="verified">Verified Only</option>
                        <option value="verified,guessed">Verified + Guessed</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Company Name / Keywords</label>
                      <input
                        type="text"
                        value={orgFilters.name_keywords}
                        onChange={(e) => setOrgFilters({ ...orgFilters, name_keywords: e.target.value })}
                        className="input"
                        placeholder="e.g., Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="label">Domains (comma-separated)</label>
                      <input
                        type="text"
                        value={orgFilters.domains}
                        onChange={(e) => setOrgFilters({ ...orgFilters, domains: e.target.value })}
                        className="input"
                        placeholder="e.g., example.com"
                      />
                    </div>

                    <div>
                      <label className="label">Industry Keywords</label>
                      <input
                        type="text"
                        value={orgFilters.industry_keywords}
                        onChange={(e) => setOrgFilters({ ...orgFilters, industry_keywords: e.target.value })}
                        className="input"
                        placeholder="e.g., SaaS, Manufacturing"
                      />
                    </div>

                    <div>
                      <label className="label">Employee Count</label>
                      <select
                        value={orgFilters.employee_range}
                        onChange={(e) => setOrgFilters({ ...orgFilters, employee_range: e.target.value })}
                        className="input"
                      >
                        <option value="">All Sizes</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1,000</option>
                        <option value="1001-5000">1,001-5,000</option>
                        <option value="5001+">5,001+</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Revenue Range</label>
                      <select
                        value={orgFilters.revenue_range}
                        onChange={(e) => setOrgFilters({ ...orgFilters, revenue_range: e.target.value })}
                        className="input"
                      >
                        <option value="">All Ranges</option>
                        <option value="0-1M">$0 - $1M</option>
                        <option value="1M-10M">$1M - $10M</option>
                        <option value="10M-50M">$10M - $50M</option>
                        <option value="50M-100M">$50M - $100M</option>
                        <option value="100M-500M">$100M - $500M</option>
                        <option value="500M-1B">$500M - $1B</option>
                        <option value="1B+">$1B+</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">Results per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={searching}
                    className="btn-primary"
                  >
                    {searching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {searchError}
                  </div>
                )}
              </form>

              {/* Selection Action Bar */}
              {selectedIds.size > 0 && (
                <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                      <span className="font-semibold text-teal-900">
                        {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={clearSelection}
                        className="btn-ghost"
                      >
                        <X className="w-4 h-4" />
                        Clear
                      </button>
                      <button
                        onClick={handleStartImport}
                        className="btn-primary"
                      >
                        <Download className="w-4 h-4" />
                        Import to GHL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Table */}
              {results.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === results.length && results.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </th>
                          {searchType === 'people' ? (
                            <>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Title</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Company</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Location</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Seniority</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Industry</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Employees</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Revenue</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Location</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.map((result) => (
                          <tr
                            key={result.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(result.id)}
                                onChange={() => toggleSelection(result.id)}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            {isPerson(result) ? (
                              <>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.title}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.company}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {result.email ? (
                                    <div className="flex items-center gap-2">
                                      <EmailStatusBadge status={result.email_status} />
                                      <span>{result.email}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.location || 'N/A'}</td>
                                <td className="px-4 py-3">
                                  <span className="badge badge-teal text-xs">
                                    {SENIORITY_LABELS[result.seniority] || result.seniority}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.industry || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.employees || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.revenue || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{result.location || 'N/A'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalResults)} of {totalResults} results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-600 px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state when searched but no results */}
              {!searching && results.length === 0 && totalResults === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">
                    No results found
                  </h3>
                  <p className="text-slate-600">
                    Try adjusting your search filters or use different keywords
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Import Wizard Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                Import to GHL
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={importing && importProgress?.status === 'processing'}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Step 1: Confirm Selection */}
              {importStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-700 font-bold">1</span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">Confirm Selection</h4>
                  </div>
                  <p className="text-slate-600">
                    You are about to import {selectedIds.size} {searchType === 'people' ? 'contact' : 'company'}{selectedIds.size !== 1 ? 's' : ''} to GHL.
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                    {results.filter(r => selectedIds.has(r.id)).map((result) => (
                      <div key={result.id} className="py-2 border-b border-slate-200 last:border-0">
                        <div className="font-medium text-slate-900">{result.name}</div>
                        {isPerson(result) && (
                          <div className="text-sm text-slate-600">{result.title} at {result.company}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Choose Import Type */}
              {importStep === 2 && (() => {
                const selectedRecords = results.filter(r => selectedIds.has(r.id));
                const peopleCount = selectedRecords.filter(r => isPerson(r)).length;
                const companiesCount = selectedRecords.length - peopleCount;
                const isMixed = peopleCount > 0 && companiesCount > 0;
                const isAllPeople = peopleCount > 0 && companiesCount === 0;
                const isAllCompanies = companiesCount > 0 && peopleCount === 0;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-teal-700 font-bold">2</span>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900">Choose Import Type</h4>
                    </div>

                    {isAllPeople && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          People records selected - importing as contacts
                        </p>
                      </div>
                    )}

                    {isAllCompanies && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          Company records selected - importing as companies
                        </p>
                      </div>
                    )}

                    {isMixed && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          Mixed selection: {peopleCount} contact{peopleCount !== 1 ? 's' : ''} and {companiesCount} compan{companiesCount !== 1 ? 'ies' : 'y'}. Choose how to import them.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-colors ${isAllCompanies ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="import_type"
                          value="contacts"
                          checked={importType === 'contacts'}
                          onChange={(e) => setImportType(e.target.value as typeof importType)}
                          disabled={isAllCompanies}
                          className="mt-1 w-4 h-4 text-teal-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">Contacts Only</div>
                          <div className="text-sm text-slate-600">Import as GHL contacts</div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-colors ${isAllPeople ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="import_type"
                          value="companies"
                          checked={importType === 'companies'}
                          onChange={(e) => setImportType(e.target.value as typeof importType)}
                          disabled={isAllPeople}
                          className="mt-1 w-4 h-4 text-teal-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">Companies Only</div>
                          <div className="text-sm text-slate-600">Import as GHL companies</div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-colors ${!isMixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="import_type"
                          value="both"
                          checked={importType === 'both'}
                          onChange={(e) => setImportType(e.target.value as typeof importType)}
                          disabled={!isMixed}
                          className="mt-1 w-4 h-4 text-teal-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">Both</div>
                          <div className="text-sm text-slate-600">Import contacts and companies</div>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Options */}
              {importStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-700 font-bold">3</span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">Import Options</h4>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="mt-1 w-4 h-4 text-teal-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-slate-900">Skip Duplicates</div>
                        <div className="text-sm text-slate-600">Don't import records that already exist in GHL</div>
                      </div>
                    </label>
                    {(importType === 'both' || importType === 'contacts') && (
                      <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={linkContactsToCompanies}
                          onChange={(e) => setLinkContactsToCompanies(e.target.checked)}
                          className="mt-1 w-4 h-4 text-teal-600 rounded"
                        />
                        <div>
                          <div className="font-medium text-slate-900">Link Contacts to Companies</div>
                          <div className="text-sm text-slate-600">Automatically associate contacts with their companies in GHL</div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Progress */}
              {importStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      {importProgress?.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-teal-600" />
                      ) : importProgress?.status === 'failed' ? (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      ) : (
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                      )}
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {importProgress?.status === 'completed' ? 'Import Complete' :
                       importProgress?.status === 'failed' ? 'Import Failed' :
                       'Importing...'}
                    </h4>
                  </div>

                  {importProgress && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-semibold text-slate-900">
                            {importProgress.processed} / {importProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                          <div className="text-2xl font-bold text-teal-700 font-data">{importProgress.successful}</div>
                          <div className="text-sm text-teal-600">Successful</div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                          <div className="text-2xl font-bold text-red-700 font-data">{importProgress.failed}</div>
                          <div className="text-sm text-red-600">Failed</div>
                        </div>
                      </div>

                      {importProgress.errors && importProgress.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="text-sm font-semibold text-red-700 mb-2">Errors:</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto text-sm text-red-600">
                            {importProgress.errors.map((error, i) => (
                              <div key={i}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Post-Import Next Steps */}
                      {importProgress.status === 'completed' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">What's Next?</h5>
                            <p className="text-sm text-slate-600 mb-4">
                              Your contacts have been imported to GHL. Continue your workflow:
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Link
                              href="/research"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm"
                            >
                              <Briefcase className="w-4 h-4" />
                              Research These Companies
                            </Link>
                            <Link
                              href="/email"
                              className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-teal-600 text-teal-600 rounded-xl font-medium hover:bg-teal-50 transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              Start Outreach
                            </Link>
                            <button
                              onClick={handleCloseModal}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Step {importStep} of 4
              </div>
              <div className="flex items-center gap-3">
                {importStep > 1 && importStep < 4 && (
                  <button
                    onClick={handleImportBack}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                )}
                {importStep < 3 && (
                  <button
                    onClick={handleImportNext}
                    className="btn-primary"
                  >
                    Next
                  </button>
                )}
                {importStep === 3 && (
                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="btn-primary"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Start Import
                  </button>
                )}
                {importStep === 4 && importProgress?.status === 'failed' && (
                  <button
                    onClick={handleCloseModal}
                    className="btn-primary"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
