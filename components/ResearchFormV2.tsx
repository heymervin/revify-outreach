import React, { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { generateResearchV2 } from '../services/aiService';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { v4 as uuidv4 } from 'uuid';
import type { ResearchDepth } from '../types/researchV2Types';
import AngleSelector, { type AngleSelection } from './research/AngleSelector';
import DepthSelector from './research/DepthSelector';
import { getResearchAngle } from '../data/researchAngles';
import { RESEARCH_DEPTH_CONFIGS } from '../types/researchV2Types';

const ResearchFormV2: React.FC = () => {
  const { addSession } = useApp();
  const { addUsageRecord, ...settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
  });

  const [selectedAngle, setSelectedAngle] = useState<AngleSelection>('margin_analytics');
  const [selectedDepth, setSelectedDepth] = useState<ResearchDepth>('standard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.industry) {
      setError('Company name and Industry are required');
      return;
    }

    // Check for Tavily API key
    if (!settings.apiKeys?.tavily) {
      setError('Tavily API key is required for V2 research. Please add it in Settings.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await generateResearchV2(
        formData.companyName,
        formData.industry,
        formData.website,
        settings,
        {
          angle: selectedAngle,
          depth: selectedDepth,
        }
      );

      addSession({
        id: uuidv4(),
        timestamp: Date.now(),
        ...result.data,
      });

      // Record token usage
      addUsageRecord({
        provider: result.provider,
        model: result.model,
        taskType: 'research',
        usage: result.usage,
      });

      setFormData({ companyName: '', website: '', industry: '' });
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to generate research. Please check your API keys in Settings.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isAllAngles = selectedAngle === 'all';
  const angleInfo = isAllAngles ? null : getResearchAngle(selectedAngle);
  const depthConfig = RESEARCH_DEPTH_CONFIGS[selectedDepth];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">V2 Research Session</h2>
        </div>
        <p className="text-slate-500 text-sm">
          Enhanced research with targeted angles, hypothesis matching, and evidence chains.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Research Angle Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Research Angle
          </label>
          <AngleSelector
            selected={selectedAngle}
            onSelect={setSelectedAngle}
            disabled={loading}
          />
          {isAllAngles ? (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-medium">Coverage:</span> All 4 service lines (Margin Analytics, Sales Growth, Promotion Effectiveness, Analytics Transformation)
            </p>
          ) : angleInfo && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-medium">Service Line:</span> {angleInfo.service_line}
            </p>
          )}
        </div>

        {/* Research Depth Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Research Depth
          </label>
          <DepthSelector
            selected={selectedDepth}
            onSelect={setSelectedDepth}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-medium">Configuration:</span> Up to{' '}
            {depthConfig.max_tavily_calls} search queries,{' '}
            {depthConfig.results_per_query} results each
          </p>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, companyName: e.target.value }))
              }
              placeholder="e.g. Acme Corp"
              disabled={loading}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Industry <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, industry: e.target.value }))
              }
              placeholder="e.g. Food & Beverage, Manufacturing"
              disabled={loading}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Website (Optional)
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://example.com"
              disabled={loading}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border disabled:bg-slate-100"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Requires Tavily API key for web search
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Researching...
              </>
            ) : (
              <>
                <Search className="-ml-1 mr-2 h-4 w-4" />
                Start V2 Research
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResearchFormV2;
