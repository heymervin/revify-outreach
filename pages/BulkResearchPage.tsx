import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Play,
  CheckCircle,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { GHLService, GHLCompanyOption } from '../services/ghlService';
import {
  BulkResearchSession,
  BulkFilterConfig,
  BulkSelectionStrategy,
  BulkProgressUpdate,
  createEmptyBulkSession,
} from '../types/bulkResearchTypes';
import {
  filterCompanies,
  toBulkCompanyItems,
  getUniqueIndustries,
  executeBulkResearch,
  requestPause,
  resumeBulkResearch,
  applySelectionStrategy,
} from '../services/bulkResearchService';
import { calculateBulkCostEstimate } from '../types/bulkResearchTypes';
import SelectionTab from '../components/bulk/SelectionTab';
import ProgressTab from '../components/bulk/ProgressTab';
import ResultsTab from '../components/bulk/ResultsTab';
import EmailTab from '../components/bulk/EmailTab';

type TabId = 'selection' | 'progress' | 'results' | 'email';

const tabs = [
  { id: 'selection' as TabId, label: 'Company Selection', icon: Users },
  { id: 'progress' as TabId, label: 'Progress', icon: Play },
  { id: 'results' as TabId, label: 'Results', icon: CheckCircle },
  { id: 'email' as TabId, label: 'Batch Emails', icon: Mail },
];

const BulkResearchPage = () => {
  const settingsContext = useSettings();
  const { apiKeys, modelSelection, promptTemplates, tavily, ghl, lastUpdated } = settingsContext;
  const settings = { apiKeys, modelSelection, promptTemplates, tavily, ghl, lastUpdated };

  const [activeTab, setActiveTab] = useState<TabId>('selection');
  const [companies, setCompanies] = useState<GHLCompanyOption[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<GHLCompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [minScore, setMinScore] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [noExistingResearch, setNoExistingResearch] = useState(false);

  const [selectionStrategy, setSelectionStrategy] = useState<BulkSelectionStrategy>('first_10');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [researchDepth, setResearchDepth] = useState<'standard' | 'deep'>('standard');

  const [currentSession, setCurrentSession] = useState<BulkResearchSession | null>(null);
  const [progress, setProgress] = useState<BulkProgressUpdate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  const ghlServiceRef = useRef<GHLService | null>(null);
  const hasGHLConfig = !!(settings.apiKeys.ghl && settings.ghl.locationId);

  useEffect(() => {
    if (hasGHLConfig) {
      ghlServiceRef.current = new GHLService(settings.apiKeys.ghl!, settings.ghl.locationId!);
    } else {
      ghlServiceRef.current = null;
    }
  }, [settings.apiKeys.ghl, settings.ghl.locationId, hasGHLConfig]);

  const loadCompanies = useCallback(async () => {
    if (!ghlServiceRef.current) {
      setError('GHL not configured. Please add your API key and Location ID in Settings.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allCompanies = await ghlServiceRef.current.getAllCompanyOptions(1000);
      setCompanies(allCompanies);
      setFilteredCompanies(allCompanies);
      setAvailableIndustries(getUniqueIndustries(allCompanies));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasGHLConfig) {
      loadCompanies();
    }
  }, [hasGHLConfig, loadCompanies]);

  useEffect(() => {
    const filters: BulkFilterConfig = {};
    if (minScore && !isNaN(parseInt(minScore))) filters.minScore = parseInt(minScore);
    if (selectedIndustries.length > 0) filters.industries = selectedIndustries;
    if (hasWebsiteOnly) filters.hasWebsite = true;
    if (noExistingResearch) filters.hasExistingResearch = false;
    setFilteredCompanies(filterCompanies(companies, filters));
  }, [companies, minScore, selectedIndustries, hasWebsiteOnly, noExistingResearch]);

  const startResearch = async () => {
    if (!settings.apiKeys.openai || !settings.apiKeys.tavily) {
      setError('OpenAI and Tavily API keys are required. Please add them in Settings.');
      return;
    }

    const selected = selectionStrategy === 'custom'
      ? filteredCompanies.filter(c => selectedCompanyIds.has(c.id))
      : applySelectionStrategy(filteredCompanies, selectionStrategy);

    if (selected.length === 0) {
      setError('No companies selected for research.');
      return;
    }

    const filters: BulkFilterConfig = {};
    if (minScore && !isNaN(parseInt(minScore))) filters.minScore = parseInt(minScore);
    if (selectedIndustries.length > 0) filters.industries = selectedIndustries;
    if (hasWebsiteOnly) filters.hasWebsite = true;
    if (noExistingResearch) filters.hasExistingResearch = false;

    const costEstimate = calculateBulkCostEstimate(selected.length, researchDepth);
    const session = createEmptyBulkSession(`Bulk Research ${new Date().toLocaleDateString()}`);
    session.filters = filters;
    session.selectionStrategy = selectionStrategy;
    session.researchDepth = researchDepth;
    session.selectedCompanies = toBulkCompanyItems(selected, true);
    session.totalCount = selected.length;
    session.estimatedCost = costEstimate.maxCost;
    session.status = 'ready';

    setCurrentSession(session);
    setActiveTab('progress');
    setIsRunning(true);
    setError(null);

    try {
      await executeBulkResearch(
        session, settings, ghlServiceRef.current,
        (update) => setProgress(update),
        (updatedSession) => setCurrentSession({ ...updatedSession })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setIsRunning(false);
    }
  };

  const pauseResearch = () => {
    if (currentSession) requestPause(currentSession.id);
  };

  const handleResume = async () => {
    if (!currentSession) return;
    setIsRunning(true);
    setError(null);
    try {
      await resumeBulkResearch(
        currentSession.id, settings, ghlServiceRef.current,
        (update) => setProgress(update),
        (updatedSession) => setCurrentSession({ ...updatedSession })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume failed');
    } finally {
      setIsRunning(false);
    }
  };

  if (!hasGHLConfig) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bulk Research</h1>
          <p className="text-slate-500 mt-1">Process 100-1,000 companies at once.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6" role="alert">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-amber-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">GHL Configuration Required</h3>
              <p className="text-amber-700 mt-1">
                Please configure your GoHighLevel API key and Location ID in Settings to use bulk research.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bulk Research</h1>
        <p className="text-slate-500 mt-1">Process 100-1,000 companies at once with filtering and selection.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-slate-200" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'selection' && (
        <SelectionTab
          companies={companies}
          filteredCompanies={filteredCompanies}
          loading={loading}
          error={error}
          availableIndustries={availableIndustries}
          selectionStrategy={selectionStrategy}
          selectedCompanyIds={selectedCompanyIds}
          researchDepth={researchDepth}
          minScore={minScore}
          selectedIndustries={selectedIndustries}
          hasWebsiteOnly={hasWebsiteOnly}
          noExistingResearch={noExistingResearch}
          onLoadCompanies={loadCompanies}
          onSelectionStrategyChange={setSelectionStrategy}
          onToggleCompany={(id) => {
            setSelectedCompanyIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            });
          }}
          onSelectAll={() => setSelectedCompanyIds(new Set(filteredCompanies.map(c => c.id)))}
          onDeselectAll={() => setSelectedCompanyIds(new Set())}
          onResearchDepthChange={setResearchDepth}
          onMinScoreChange={setMinScore}
          onSelectedIndustriesChange={setSelectedIndustries}
          onHasWebsiteOnlyChange={setHasWebsiteOnly}
          onNoExistingResearchChange={setNoExistingResearch}
          onStartResearch={startResearch}
        />
      )}
      {activeTab === 'progress' && (
        <ProgressTab
          session={currentSession}
          progress={progress}
          onPause={pauseResearch}
          onResume={handleResume}
        />
      )}
      {activeTab === 'results' && <ResultsTab session={currentSession} />}
      {activeTab === 'email' && <EmailTab session={currentSession} />}
    </div>
  );
};

export default BulkResearchPage;
