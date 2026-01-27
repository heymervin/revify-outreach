import React, { useState } from 'react';
import { Search, Loader2, Globe, Building2, Factory, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { executeResearchV3 } from '../../services/researchServiceV3';
import { ResearchInputV3 } from '../../types/researchTypesV3';
import { v4 as uuidv4 } from 'uuid';

const ResearchFormV3: React.FC = () => {
  const { addSession } = useApp();
  const { addUsageRecord, ...settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: ''
  });

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.industry.trim()) {
      setError('Industry is required');
      return;
    }

    // Check for required API keys
    if (!settings.apiKeys?.openai) {
      setError('OpenAI API key required for V3 research. Add it in Settings.');
      return;
    }
    if (!settings.apiKeys?.tavily) {
      setError('Tavily API key required for V3 research. Add it in Settings.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const input: ResearchInputV3 = {
        companyName: formData.companyName.trim(),
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim()
      };

      const result = await executeResearchV3(
        input,
        settings.apiKeys.openai,
        settings.apiKeys.tavily
      );

      // Save to session history
      addSession({
        id: uuidv4(),
        timestamp: Date.now(),
        companyName: input.companyName,
        website: input.website || '',
        industry: input.industry,
        format: 'v3',
        v3Data: result
      });

      // Record token usage (approximate)
      addUsageRecord({
        provider: 'openai',
        model: 'gpt-4o',
        taskType: 'research',
        usage: {
          inputTokens: 3000,
          outputTokens: 1500,
          totalTokens: 4500
        }
      });

      // Clear form on success
      setFormData({ companyName: '', website: '', industry: '' });

    } catch (err) {
      console.error('V3 Research failed:', err);
      setError(err instanceof Error ? err.message : 'Research failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">V3 Strict Research</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            New
          </span>
        </div>
        <p className="text-slate-500 text-sm">
          Company-focused research with source validation. No hallucinations - only verified data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Company Name */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
              <Building2 className="w-4 h-4 mr-1.5 text-slate-400" />
              Company Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="e.g., FoodWell"
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-colors disabled:bg-slate-100"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
              <Factory className="w-4 h-4 mr-1.5 text-slate-400" />
              Industry <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              placeholder="e.g., Food Manufacturing"
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-colors disabled:bg-slate-100"
            />
          </div>

          {/* Website */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
              <Globe className="w-4 h-4 mr-1.5 text-slate-400" />
              Website <span className="text-slate-400 ml-1">(recommended)</span>
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="e.g., foodwell.pl"
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm transition-colors disabled:bg-slate-100"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm flex items-center">
              <span className="w-1 h-1 bg-red-500 rounded-full mr-2" />
              {error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Searches {previousYear}-{currentYear} • Validates all sources • OpenAI + Tavily
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Researching...
              </>
            ) : (
              <>
                <Search className="-ml-1 mr-2 h-4 w-4" />
                Start V3 Research
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResearchFormV3;
