import { useMemo, useState } from 'react';
import {
  Filter,
  RefreshCw,
  ListChecks,
  Play,
  Building2,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { GHLCompanyOption } from '../../services/ghlService';
import {
  BulkSelectionStrategy,
  SELECTION_STRATEGY_LABELS,
  calculateBulkCostEstimate,
  formatCost,
} from '../../types/bulkResearchTypes';
import { applySelectionStrategy } from '../../services/bulkResearchService';

interface SelectionTabProps {
  companies: GHLCompanyOption[];
  filteredCompanies: GHLCompanyOption[];
  loading: boolean;
  error: string | null;
  availableIndustries: string[];
  selectionStrategy: BulkSelectionStrategy;
  selectedCompanyIds: Set<string>;
  researchDepth: 'standard' | 'deep';
  minScore: string;
  selectedIndustries: string[];
  hasWebsiteOnly: boolean;
  noExistingResearch: boolean;
  onLoadCompanies: () => void;
  onSelectionStrategyChange: (strategy: BulkSelectionStrategy) => void;
  onToggleCompany: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onResearchDepthChange: (depth: 'standard' | 'deep') => void;
  onMinScoreChange: (value: string) => void;
  onSelectedIndustriesChange: (industries: string[]) => void;
  onHasWebsiteOnlyChange: (value: boolean) => void;
  onNoExistingResearchChange: (value: boolean) => void;
  onStartResearch: () => void;
}

const SelectionTab = ({
  companies,
  filteredCompanies,
  loading,
  error,
  availableIndustries,
  selectionStrategy,
  selectedCompanyIds,
  researchDepth,
  minScore,
  selectedIndustries,
  hasWebsiteOnly,
  noExistingResearch,
  onLoadCompanies,
  onSelectionStrategyChange,
  onToggleCompany,
  onSelectAll,
  onDeselectAll,
  onResearchDepthChange,
  onMinScoreChange,
  onSelectedIndustriesChange,
  onHasWebsiteOnlyChange,
  onNoExistingResearchChange,
  onStartResearch,
}: SelectionTabProps) => {
  const [tableSearch, setTableSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedCompanies = useMemo(() => {
    if (selectionStrategy === 'custom') {
      return filteredCompanies.filter(c => selectedCompanyIds.has(c.id));
    }
    return applySelectionStrategy(filteredCompanies, selectionStrategy);
  }, [filteredCompanies, selectionStrategy, selectedCompanyIds]);

  const selectedCount = selectedCompanies.length;
  const costEstimate = useMemo(
    () => calculateBulkCostEstimate(selectedCount, researchDepth),
    [selectedCount, researchDepth]
  );

  const hasActiveFilters = !!(minScore || selectedIndustries.length > 0 || hasWebsiteOnly || noExistingResearch);

  const toggleIndustry = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      onSelectedIndustriesChange(selectedIndustries.filter(i => i !== industry));
    } else {
      onSelectedIndustriesChange([...selectedIndustries, industry]);
    }
  };

  // Filter table rows by search text
  const tableFilteredCompanies = useMemo(() => {
    if (!tableSearch.trim()) return filteredCompanies;
    const query = tableSearch.toLowerCase().trim();
    return filteredCompanies.filter(c =>
      c.companyName.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.website?.toLowerCase().includes(query)
    );
  }, [filteredCompanies, tableSearch]);

  // Strategy groupings for cleaner layout
  const countStrategies: BulkSelectionStrategy[] = [
    'first_5', 'first_10', 'first_25', 'first_50', 'first_100', 'first_250', 'first_500', 'all_filtered',
  ];
  const scoreStrategies: BulkSelectionStrategy[] = [
    'top_10_by_score', 'top_25_by_score', 'top_50_by_score', 'top_100_by_score',
  ];

  const handleStartClick = () => {
    if (selectedCount > 20) {
      setShowConfirm(true);
    } else {
      onStartResearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="w-5 h-5 text-slate-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          </div>
          <button
            onClick={onLoadCompanies}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center text-sm"
            aria-label="Refresh company list"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Score + Checkboxes row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Min Score</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => onMinScoreChange(e.target.value)}
              placeholder="e.g., 55"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              aria-label="Minimum score filter"
            />
          </div>

          <div className="flex items-end gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasWebsiteOnly}
                onChange={(e) => onHasWebsiteOnlyChange(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">Has website</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={noExistingResearch}
                onChange={(e) => onNoExistingResearchChange(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">No existing research</span>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  onMinScoreChange('');
                  onSelectedIndustriesChange([]);
                  onHasWebsiteOnlyChange(false);
                  onNoExistingResearchChange(false);
                }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex items-center"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Industry chips */}
        {availableIndustries.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
            <div className="flex flex-wrap gap-1.5">
              {availableIndustries.map(ind => {
                const isSelected = selectedIndustries.includes(ind);
                return (
                  <button
                    key={ind}
                    onClick={() => toggleIndustry(ind)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {ind}
                    {isSelected && <X className="w-3 h-3 ml-1 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{filteredCompanies.length}</span> of{' '}
            <span className="font-medium text-slate-700">{companies.length}</span> companies
            {hasActiveFilters && (
              <span className="ml-2 text-emerald-600">
                ({companies.length - filteredCompanies.length} filtered out)
              </span>
            )}
          </div>
        </div>

        {/* Empty filter state */}
        {filteredCompanies.length === 0 && companies.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-amber-800">No companies match your filters.</span>
              <span className="text-amber-700 ml-1">Try adjusting the min score, industries, or checkbox filters.</span>
            </div>
          </div>
        )}
      </div>

      {/* Selection Strategy */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center mb-4">
          <ListChecks className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Selection</h3>
        </div>

        {/* By count */}
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">By count</div>
          <div className="flex flex-wrap gap-1.5">
            {countStrategies.map(key => (
              <button
                key={key}
                onClick={() => onSelectionStrategyChange(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectionStrategy === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {SELECTION_STRATEGY_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* By score */}
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">By score</div>
          <div className="flex flex-wrap gap-1.5">
            {scoreStrategies.map(key => (
              <button
                key={key}
                onClick={() => onSelectionStrategyChange(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectionStrategy === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {SELECTION_STRATEGY_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Manual</div>
          <button
            onClick={() => onSelectionStrategyChange('custom')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectionStrategy === 'custom'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {SELECTION_STRATEGY_LABELS['custom']}
          </button>
        </div>

        {/* Custom selection controls */}
        {selectionStrategy === 'custom' && (
          <div className="flex items-center gap-2 mb-4 pt-3 border-t border-slate-100">
            <button
              onClick={onSelectAll}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              Select All ({filteredCompanies.length})
            </button>
            <button
              onClick={onDeselectAll}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            >
              Deselect All
            </button>
            <span className="text-sm text-slate-500 ml-2">
              {selectedCompanyIds.size} selected
            </span>
          </div>
        )}

        {/* Research Depth */}
        <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700">Research Depth:</span>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="standard"
              checked={researchDepth === 'standard'}
              onChange={() => onResearchDepthChange('standard')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Standard</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="deep"
              checked={researchDepth === 'deep'}
              onChange={() => onResearchDepthChange('deep')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Deep</span>
          </label>
        </div>
      </div>

      {/* Selected Companies Preview (for non-custom strategies) */}
      {selectionStrategy !== 'custom' && selectedCount > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center">
              <Eye className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-sm font-medium text-slate-700">
                Preview: {selectedCount} companies selected
              </span>
            </div>
            {showPreview ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showPreview && (
            <div className="border-t border-slate-200 max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Industry</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCompanies.slice(0, 100).map((company, idx) => (
                    <tr key={company.id} className="text-sm">
                      <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2 text-slate-900">{company.companyName}</td>
                      <td className="px-4 py-2">
                        {company.industry && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            {company.industry}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedCount > 100 && (
                <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                  Showing first 100 of {selectedCount} companies
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Company List (custom selection) */}
      {selectionStrategy === 'custom' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Search within table */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {tableSearch ? `${tableFilteredCompanies.length} matches` : `${filteredCompanies.length} companies`}
            </div>
          </div>

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
                {tableFilteredCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.has(company.id)}
                        onChange={() => onToggleCompany(company.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label={`Select ${company.companyName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 text-sm">{company.companyName}</div>
                      {company.website && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">{company.website}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.industry && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {company.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {company.score !== undefined ? (
                        <span className={`font-medium text-sm ${
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
                        <CheckCircle className="w-4 h-4 text-green-500" aria-label="Has research" />
                      ) : (
                        <span className="text-slate-400" aria-label="No research">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {tableFilteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      {tableSearch ? 'No companies match your search.' : 'No companies available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Estimate & Start */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-6 flex-wrap gap-y-2">
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
            onClick={handleStartClick}
            disabled={selectedCount === 0 || loading}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Bulk Research
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Bulk Research</h3>
            <p className="text-sm text-slate-600 mb-4">
              You are about to research <span className="font-semibold">{selectedCount} companies</span> using{' '}
              <span className="font-semibold">{researchDepth}</span> depth.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Estimated API cost:</span>
                <span className="font-medium text-slate-900">
                  {formatCost(costEstimate.minCost)} - {formatCost(costEstimate.maxCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Estimated time:</span>
                <span className="font-medium text-slate-900">
                  {costEstimate.minTimeMinutes} - {costEstimate.maxTimeMinutes} min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Research engine:</span>
                <span className="font-medium text-slate-900">V3.2 Hybrid</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              API costs will be charged to the configured API keys. You can pause and resume at any time.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onStartResearch();
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
              >
                Start Research
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-red-800">Error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionTab;
