import { useMemo } from 'react';
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
} from 'lucide-react';
import { GHLCompanyOption } from '../../services/ghlService';
import {
  BulkFilterConfig,
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Min Score</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => onMinScoreChange(e.target.value)}
              placeholder="e.g., 55"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="Minimum score filter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <select
              multiple
              value={selectedIndustries}
              onChange={(e) => {
                const selected: string[] = [];
                for (const opt of e.target.selectedOptions) {
                  selected.push(opt.value);
                }
                onSelectedIndustriesChange(selected);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              size={3}
              aria-label="Industry filter"
            >
              {availableIndustries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasWebsiteOnly}
                onChange={(e) => onHasWebsiteOnlyChange(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">Has website only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={noExistingResearch}
                onChange={(e) => onNoExistingResearchChange(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">No existing research</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={onLoadCompanies}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center"
              aria-label="Refresh company list"
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
              onClick={() => onSelectionStrategyChange(key as BulkSelectionStrategy)}
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
            <span className="text-sm text-slate-500 py-1">
              {selectedCompanyIds.size} selected
            </span>
          </div>
        )}

        <div className="flex items-center space-x-4 mb-4">
          <span className="text-sm font-medium text-slate-700">Research Depth:</span>
          <label className="flex items-center">
            <input
              type="radio"
              value="standard"
              checked={researchDepth === 'standard'}
              onChange={() => onResearchDepthChange('standard')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Standard</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="deep"
              checked={researchDepth === 'deep'}
              onChange={() => onResearchDepthChange('deep')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="ml-2 text-sm text-slate-700">Deep (slower, more thorough)</span>
          </label>
        </div>
      </div>

      {/* Company List (custom selection) */}
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
                        onChange={() => onToggleCompany(company.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label={`Select ${company.companyName}`}
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
                        <CheckCircle className="w-4 h-4 text-green-500" aria-label="Has research" />
                      ) : (
                        <span className="text-slate-400" aria-label="No research">-</span>
                      )}
                    </td>
                  </tr>
                ))}
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
            onClick={onStartResearch}
            disabled={selectedCount === 0 || loading}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Bulk Research
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
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
