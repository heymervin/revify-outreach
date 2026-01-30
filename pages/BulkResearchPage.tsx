import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Mail,
  Filter,
  Loader2,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Clock,
  Building2,
  TrendingUp,
  ListChecks,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { GHLService, GHLCompanyOption } from '../services/ghlService';
import {
  BulkResearchSession,
  BulkFilterConfig,
  BulkSelectionStrategy,
  BulkProgressUpdate,
  BulkCompanyItem,
  BulkResearchResult,
  SELECTION_STRATEGY_LABELS,
  calculateBulkCostEstimate,
  createEmptyBulkSession,
  formatDuration,
  formatCost,
} from '../types/bulkResearchTypes';
import {
  filterCompanies,
  applySelectionStrategy,
  toBulkCompanyItems,
  getUniqueIndustries,
  executeBulkResearch,
  requestPause,
  resumeBulkResearch,
  loadBulkSessions,
  saveBulkSessions,
  updateSessionInStorage,
} from '../services/bulkResearchService';

type TabId = 'selection' | 'progress' | 'results' | 'email';

const BulkResearchPage: React.FC = () => {
  const { settings } = useSettings();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('selection');

  // Company loading state
  const [companies, setCompanies] = useState<GHLCompanyOption[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<GHLCompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<BulkFilterConfig>({});
  const [minScore, setMinScore] = useState<string>('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [noExistingResearch, setNoExistingResearch] = useState(false);

  // Selection state
  const [selectionStrategy, setSelectionStrategy] = useState<BulkSelectionStrategy>('first_10');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [researchDepth, setResearchDepth] = useState<'standard' | 'deep'>('standard');

  // Session state
  const [currentSession, setCurrentSession] = useState<BulkResearchSession | null>(null);
  const [progress, setProgress] = useState<BulkProgressUpdate | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Refs
  const ghlServiceRef = useRef<GHLService | null>(null);

  // Available industries
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  // Check if GHL is configured
  const hasGHLConfig = !!(settings.apiKeys.ghl && settings.ghl.locationId);

  // Initialize GHL service
  useEffect(() => {
    if (hasGHLConfig) {
      ghlServiceRef.current = new GHLService(settings.apiKeys.ghl!, settings.ghl.locationId!);
    } else {
      ghlServiceRef.current = null;
    }
  }, [settings.apiKeys.ghl, settings.ghl.locationId, hasGHLConfig]);

  // Load companies from GHL
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
      console.log(`[Bulk] Loaded ${allCompanies.length} companies from GHL`);
    } catch (err) {
      console.error('[Bulk] Failed to load companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load companies on mount
  useEffect(() => {
    if (hasGHLConfig) {
      loadCompanies();
    }
  }, [hasGHLConfig, loadCompanies]);

  // Apply filters when they change
  useEffect(() => {
    const newFilters: BulkFilterConfig = {};

    if (minScore && !isNaN(parseInt(minScore))) {
      newFilters.minScore = parseInt(minScore);
    }
    if (selectedIndustries.length > 0) {
      newFilters.industries = selectedIndustries;
    }
    if (hasWebsiteOnly) {
      newFilters.hasWebsite = true;
    }
    if (noExistingResearch) {
      newFilters.hasExistingResearch = false;
    }

    setFilters(newFilters);

    const filtered = filterCompanies(companies, newFilters);
    setFilteredCompanies(filtered);
  }, [companies, minScore, selectedIndustries, hasWebsiteOnly, noExistingResearch]);

  // Get selected companies based on strategy
  const getSelectedCompanies = useCallback((): GHLCompanyOption[] => {
    if (selectionStrategy === 'custom') {
      return filteredCompanies.filter(c => selectedCompanyIds.has(c.id));
    }
    return applySelectionStrategy(filteredCompanies, selectionStrategy);
  }, [filteredCompanies, selectionStrategy, selectedCompanyIds]);

  // Calculate cost estimate
  const selectedCount = getSelectedCompanies().length;
  const costEstimate = calculateBulkCostEstimate(selectedCount, researchDepth);

  // Toggle company selection (for custom mode)
  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  // Select all filtered companies
  const selectAllFiltered = () => {
    setSelectedCompanyIds(new Set(filteredCompanies.map(c => c.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedCompanyIds(new Set());
  };

  // Start bulk research
  const startResearch = async () => {
    if (!settings.apiKeys.openai || !settings.apiKeys.tavily) {
      setError('OpenAI and Tavily API keys are required. Please add them in Settings.');
      return;
    }

    const selected = getSelectedCompanies();
    if (selected.length === 0) {
      setError('No companies selected for research.');
      return;
    }

    // Create new session
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
        session,
        settings,
        ghlServiceRef.current,
        (update) => setProgress(update),
        (updatedSession) => setCurrentSession({ ...updatedSession })
      );
    } catch (err) {
      console.error('[Bulk] Research failed:', err);
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Pause research
  const pauseResearch = () => {
    if (currentSession) {
      requestPause(currentSession.id);
    }
  };

  // Resume research
  const handleResume = async () => {
    if (!currentSession) return;

    setIsRunning(true);
    setError(null);

    try {
      await resumeBulkResearch(
        currentSession.id,
        settings,
        ghlServiceRef.current,
        (update) => setProgress(update),
        (updatedSession) => setCurrentSession({ ...updatedSession })
      );
    } catch (err) {
      console.error('[Bulk] Resume failed:', err);
      setError(err instanceof Error ? err.message : 'Resume failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Render tab buttons
  const renderTabs = () => (
    <div className="flex space-x-1 mb-6 border-b border-slate-200">
      {[
        { id: 'selection' as TabId, label: 'Company Selection', icon: Users },
        { id: 'progress' as TabId, label: 'Progress', icon: Play },
        { id: 'results' as TabId, label: 'Results', icon: CheckCircle },
        { id: 'email' as TabId, label: 'Batch Emails', icon: Mail },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
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
  );

  // Render Selection Tab
  const renderSelectionTab = () => (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Min Score */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Score
            </label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="e.g., 55"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Industry
            </label>
            <select
              multiple
              value={selectedIndustries}
              onChange={(e) => {
                const options = e.target.selectedOptions;
                const selected: string[] = [];
                for (let i = 0; i < options.length; i++) {
                  selected.push(options[i].value);
                }
                setSelectedIndustries(selected);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              size={3}
            >
              {availableIndustries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasWebsiteOnly}
                onChange={(e) => setHasWebsiteOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">Has website only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={noExistingResearch}
                onChange={(e) => setNoExistingResearch(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">No existing research</span>
            </label>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={loadCompanies}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {filteredCompanies.length} of {companies.length} companies
        </div>
      </div>

      {/* Selection Strategy */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center mb-4">
          <ListChecks className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Selection</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(SELECTION_STRATEGY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectionStrategy(key as BulkSelectionStrategy)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectionStrategy === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selectionStrategy === 'custom' && (
          <div className="flex space-x-2 mb-4">
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              Select All ({filteredCompanies.length})
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              Deselect All
            </button>
            <span className="text-sm text-slate-500 py-1">
              {selectedCompanyIds.size} selected
            </span>
          </div>
        )}

        {/* Research Depth */}
        <div className="flex items-center space-x-4 mb-4">
          <span className="text-sm font-medium text-slate-700">Research Depth:</span>
          <label className="flex items-center">
            <input
              type="radio"
              value="standard"
              checked={researchDepth === 'standard'}
              onChange={() => setResearchDepth('standard')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Standard</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="deep"
              checked={researchDepth === 'deep'}
              onChange={() => setResearchDepth('deep')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Deep (slower, more thorough)</span>
          </label>
        </div>
      </div>

      {/* Company List (for custom selection) */}
      {selectionStrategy === 'custom' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Industry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Research</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.has(company.id)}
                        onChange={() => toggleCompanySelection(company.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{company.companyName}</div>
                      {company.website && (
                        <div className="text-xs text-slate-500">{company.website}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.industry && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {company.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.score !== undefined ? (
                        <span className={`font-medium ${
                          company.score >= 70 ? 'text-green-600' :
                          company.score >= 50 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {company.score}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.companyResearch ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Estimate & Start Button */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-slate-400 mr-2" />
                <span className="font-semibold text-slate-900">{selectedCount} companies</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-slate-700">
                  Est. {formatCost(costEstimate.minCost)} - {formatCost(costEstimate.maxCost)}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-slate-700">
                  Est. {costEstimate.minTimeMinutes} - {costEstimate.maxTimeMinutes} min
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={startResearch}
            disabled={selectedCount === 0 || loading}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Bulk Research
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
          <div>
            <div className="font-medium text-red-800">Error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Progress Tab
  const renderProgressTab = () => {
    if (!currentSession) {
      return (
        <div className="text-center py-12 text-slate-500">
          No active research session. Start a bulk research from the Selection tab.
        </div>
      );
    }

    const percentComplete = currentSession.totalCount > 0
      ? Math.round((currentSession.processedCount / currentSession.totalCount) * 100)
      : 0;

    return (
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {currentSession.status === 'researching' && (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-3" />
              )}
              {currentSession.status === 'paused' && (
                <Pause className="w-6 h-6 text-amber-600 mr-3" />
              )}
              {currentSession.status === 'research_complete' && (
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              )}
              <h3 className="text-lg font-semibold text-slate-900">
                {currentSession.status === 'researching' && 'Research in Progress'}
                {currentSession.status === 'paused' && 'Research Paused'}
                {currentSession.status === 'research_complete' && 'Research Complete'}
                {currentSession.status === 'ready' && 'Starting...'}
              </h3>
            </div>

            <div className="flex space-x-2">
              {currentSession.status === 'researching' && (
                <button
                  onClick={pauseResearch}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
              )}
              {currentSession.status === 'paused' && (
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>{currentSession.processedCount} of {currentSession.totalCount} companies</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Success</div>
              <div className="text-xl font-semibold text-green-600">{currentSession.successCount}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Failed</div>
              <div className="text-xl font-semibold text-red-600">{currentSession.failureCount}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Cost</div>
              <div className="text-xl font-semibold text-slate-900">{formatCost(currentSession.actualCost)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-500">Saved to GHL</div>
              <div className="text-xl font-semibold text-slate-900">{currentSession.savedToGhlCount}</div>
            </div>
          </div>
        </div>

        {/* Current Company */}
        {progress && currentSession.status === 'researching' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center mb-2">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin mr-2" />
              <span className="text-sm text-slate-500">Currently researching:</span>
            </div>
            <div className="font-semibold text-slate-900">{progress.currentCompanyName}</div>
            <div className="mt-2 text-sm text-slate-500">
              Estimated time remaining: {formatDuration(progress.estimatedRemainingMs)}
            </div>
          </div>
        )}

        {/* Errors Log */}
        {currentSession.errors.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              Errors ({currentSession.errors.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {currentSession.errors.map((err, idx) => (
                <div key={idx} className="bg-red-50 rounded p-3 text-sm">
                  <div className="font-medium text-red-800">{err.companyName}</div>
                  <div className="text-red-600">{err.error}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Results Tab
  const renderResultsTab = () => {
    if (!currentSession || Object.keys(currentSession.results).length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          No research results yet. Start a bulk research from the Selection tab.
        </div>
      );
    }

    const results: BulkResearchResult[] = Object.values(currentSession.results);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Results Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-700">Successful</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">{successful.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm text-red-700">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">{failed.length}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-slate-600 mr-2" />
                <span className="text-sm text-slate-700">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatCost(currentSession.actualCost)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-slate-600 mr-2" />
                <span className="text-sm text-slate-700">Total Time</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatDuration(currentSession.totalElapsedMs)}</div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Saved to GHL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map(result => (
                  <tr key={result.companyId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{result.companyName}</td>
                    <td className="px-4 py-3">
                      {result.success ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCost(result.cost)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(result.executionTimeMs)}</td>
                    <td className="px-4 py-3">
                      {result.savedToGhl ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Email Tab (placeholder for now)
  const renderEmailTab = () => {
    if (!currentSession || currentSession.successCount === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          Complete bulk research first to generate emails.
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Batch Email Generation</h3>
          <p className="text-slate-500 mb-4">
            Generate personalized emails for {currentSession.successCount} researched companies.
          </p>
          <button
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
            onClick={() => alert('Batch email generation coming soon!')}
          >
            Generate Emails
          </button>
        </div>
      </div>
    );
  };

  // Main render
  if (!hasGHLConfig) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bulk Research</h1>
          <p className="text-slate-500 mt-1">Process 100-1,000 companies at once.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
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

      {renderTabs()}

      {activeTab === 'selection' && renderSelectionTab()}
      {activeTab === 'progress' && renderProgressTab()}
      {activeTab === 'results' && renderResultsTab()}
      {activeTab === 'email' && renderEmailTab()}
    </div>
  );
};

export default BulkResearchPage;
