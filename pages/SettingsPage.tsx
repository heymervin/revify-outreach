import React, { useState } from 'react';
import { Settings, Key, Bot, FileText, Search, RotateCcw, BarChart3, Trash2, Database } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import ApiKeysSection from '../components/settings/ApiKeysSection';
import ModelSelectionSection from '../components/settings/ModelSelectionSection';
import PromptTemplatesSection from '../components/settings/PromptTemplatesSection';
import { GHLConfig } from '../types';

type SettingsTab = 'api-keys' | 'models' | 'prompts' | 'tavily' | 'ghl' | 'usage';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-keys');
  const {
    resetToDefaults,
    lastUpdated,
    tavily,
    ghl,
    apiKeys,
    updateTavilyConfig,
    updateGHLConfig,
    updateApiKey,
    usageRecords,
    getUsageStats,
    clearUsageHistory
  } = useSettings();

  const tabs = [
    { id: 'api-keys' as const, label: 'API Keys', icon: Key },
    { id: 'models' as const, label: 'Models', icon: Bot },
    { id: 'prompts' as const, label: 'Prompts', icon: FileText },
    { id: 'tavily' as const, label: 'Web Search', icon: Search },
    { id: 'ghl' as const, label: 'GoHighLevel', icon: Database },
    { id: 'usage' as const, label: 'Usage', icon: BarChart3 },
  ];

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults? API keys will be preserved.')) {
      resetToDefaults();
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-brand-600" />
            Settings
          </h1>
          <p className="text-slate-500 mt-1">
            Configure AI providers, models, and prompt templates.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Defaults
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-brand-700 border-brand-600 bg-brand-50/50'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'api-keys' && <ApiKeysSection />}
          {activeTab === 'models' && <ModelSelectionSection />}
          {activeTab === 'prompts' && <PromptTemplatesSection />}
          {activeTab === 'tavily' && (
            <TavilySection
              tavily={tavily}
              apiKeys={apiKeys}
              updateTavilyConfig={updateTavilyConfig}
              updateApiKey={updateApiKey}
            />
          )}
          {activeTab === 'ghl' && (
            <GHLSection
              ghl={ghl}
              apiKeys={apiKeys}
              updateGHLConfig={updateGHLConfig}
              updateApiKey={updateApiKey}
            />
          )}
          {activeTab === 'usage' && (
            <UsageSection
              usageRecords={usageRecords}
              getUsageStats={getUsageStats}
              clearUsageHistory={clearUsageHistory}
            />
          )}
        </div>
      </div>

      {/* Last Updated */}
      <p className="mt-4 text-xs text-slate-400 text-center">
        Settings auto-save to browser storage. Last updated: {new Date(lastUpdated).toLocaleString()}
      </p>
    </div>
  );
};

interface TavilySectionProps {
  tavily: {
    enabled: boolean;
    searchDepth: 'basic' | 'advanced';
    includeInResearch: boolean;
  };
  apiKeys: {
    tavily?: string;
  };
  updateTavilyConfig: (config: Partial<{ enabled: boolean; searchDepth: 'basic' | 'advanced'; includeInResearch: boolean }>) => void;
  updateApiKey: (provider: 'tavily', key: string) => void;
}

const TavilySection: React.FC<TavilySectionProps> = ({ tavily, apiKeys, updateTavilyConfig, updateApiKey }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tavily Web Search</h3>
        <p className="text-sm text-slate-500">
          Enhance research with real-time web search results using Tavily API.
        </p>
      </div>

      {/* API Key */}
      <div className="p-4 border border-slate-200 rounded-lg bg-white">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Tavily API Key
        </label>
        <input
          type="password"
          value={apiKeys.tavily || ''}
          onChange={(e) => updateApiKey('tavily', e.target.value)}
          placeholder="tvly-..."
          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
        />
        <p className="mt-2 text-xs text-slate-500">
          Get your API key at{' '}
          <a
            href="https://tavily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            tavily.com
          </a>
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div>
          <h4 className="text-sm font-medium text-slate-900">Enable Web Search</h4>
          <p className="text-xs text-slate-500">Include web search results in research prompts</p>
        </div>
        <button
          onClick={() => updateTavilyConfig({ enabled: !tavily.enabled })}
          disabled={!apiKeys.tavily}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            tavily.enabled ? 'bg-brand-600' : 'bg-slate-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
            tavily.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Search Depth */}
      {tavily.enabled && apiKeys.tavily && (
        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <label className="block text-sm font-medium text-slate-700 mb-2">Search Depth</label>
          <select
            value={tavily.searchDepth}
            onChange={(e) => updateTavilyConfig({ searchDepth: e.target.value as 'basic' | 'advanced' })}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
          >
            <option value="basic">Basic (faster, lower cost)</option>
            <option value="advanced">Advanced (deeper, higher cost)</option>
          </select>
          <p className="mt-2 text-xs text-slate-500">
            Advanced search provides more comprehensive results but uses more API credits.
          </p>
        </div>
      )}

      {!apiKeys.tavily && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Add your Tavily API key above to enable web search functionality.
          </p>
        </div>
      )}
    </div>
  );
};

interface GHLSectionProps {
  ghl: GHLConfig;
  apiKeys: {
    ghl?: string;
  };
  updateGHLConfig: (config: Partial<GHLConfig>) => void;
  updateApiKey: (provider: 'ghl', key: string) => void;
}

const GHLSection: React.FC<GHLSectionProps> = ({ ghl, apiKeys, updateGHLConfig, updateApiKey }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">GoHighLevel Integration</h3>
        <p className="text-sm text-slate-500">
          Connect to GoHighLevel to import contacts and companies directly into your research workflow.
        </p>
      </div>

      {/* API Key */}
      <div className="p-4 border border-slate-200 rounded-lg bg-white">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          GHL API Key (Private Integration Token)
        </label>
        <input
          type="password"
          value={apiKeys.ghl || ''}
          onChange={(e) => updateApiKey('ghl', e.target.value)}
          placeholder="pit-..."
          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
        />
        <p className="mt-2 text-xs text-slate-500">
          Get your Private Integration Token from your GHL sub-account settings under{' '}
          <span className="font-medium">Settings → Integrations → Private Integration</span>
        </p>
      </div>

      {/* Location ID */}
      <div className="p-4 border border-slate-200 rounded-lg bg-white">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Location ID
        </label>
        <input
          type="text"
          value={ghl?.locationId || ''}
          onChange={(e) => updateGHLConfig({ locationId: e.target.value })}
          placeholder="e.g., abc123XYZ..."
          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
        />
        <p className="mt-2 text-xs text-slate-500">
          Find your Location ID in GHL under{' '}
          <span className="font-medium">Settings → Business Profile → Location ID</span>
        </p>
      </div>

      {/* Status */}
      {apiKeys.ghl && ghl?.locationId ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            GHL integration is configured. You can now select companies from GHL in the research form.
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            Add both your GHL API key and Location ID to enable the GHL company selector in research forms.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-800 mb-2">How to get your credentials:</h4>
        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
          <li>Log into your GoHighLevel sub-account</li>
          <li>Go to <span className="font-medium">Settings → Integrations</span></li>
          <li>Click on <span className="font-medium">Private Integrations</span></li>
          <li>Create a new integration or copy an existing token</li>
          <li>For Location ID, go to <span className="font-medium">Settings → Business Profile</span></li>
        </ol>
      </div>
    </div>
  );
};

interface UsageSectionProps {
  usageRecords: any[];
  getUsageStats: () => any;
  clearUsageHistory: () => void;
}

const UsageSection: React.FC<UsageSectionProps> = ({ usageRecords, getUsageStats, clearUsageHistory }) => {
  const stats = getUsageStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCost = (cost: number) => {
    return '$' + cost.toFixed(4);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all usage history? This cannot be undone.')) {
      clearUsageHistory();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Token Usage</h3>
          <p className="text-sm text-slate-500">
            Track your API token usage and estimated costs.
          </p>
        </div>
        {usageRecords.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear History
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Tokens</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(stats.totalTokens)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Input Tokens</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(stats.totalInputTokens)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Output Tokens</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(stats.totalOutputTokens)}</p>
        </div>
        <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
          <p className="text-xs text-brand-600 uppercase tracking-wide font-medium">Est. Cost</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{formatCost(stats.totalEstimatedCost)}</p>
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Recent Activity</h4>
        {usageRecords.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No usage recorded yet.</p>
            <p className="text-slate-400 text-xs mt-1">Usage will appear here after you run research or generate emails.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Provider</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Tokens</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usageRecords.slice(0, 20).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        record.taskType === 'research'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {record.taskType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-medium">{record.provider}</span>
                      <span className="text-slate-400 text-xs ml-1">/ {record.model}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(record.usage.totalTokens)}
                      <span className="text-slate-400 text-xs ml-1">
                        ({formatNumber(record.usage.inputTokens)} in / {formatNumber(record.usage.outputTokens)} out)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium">
                      {formatCost(record.estimatedCost || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usageRecords.length > 20 && (
              <div className="px-4 py-3 bg-slate-50 text-center text-xs text-slate-500">
                Showing 20 of {usageRecords.length} records
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cost Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Estimated costs are approximate and based on published API pricing. Actual costs may vary based on your pricing tier and any applicable discounts.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
