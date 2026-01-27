import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { AIProvider, AVAILABLE_MODELS } from '../../types';

const ModelSelectionSection: React.FC = () => {
  const { modelSelection, updateModelSelection, hasValidApiKey } = useSettings();

  const getAvailableProviders = (): AIProvider[] => {
    return (['gemini', 'openai', 'anthropic'] as AIProvider[]).filter(p => hasValidApiKey(p));
  };

  const availableProviders = getAvailableProviders();

  const providerDisplayNames: Record<AIProvider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
  };

  if (availableProviders.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-2">No API keys configured</p>
        <p className="text-sm text-slate-400">Please add at least one API key in the API Keys tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Model Selection</h3>
        <p className="text-sm text-slate-500">
          Choose which AI provider and model to use for each task type.
        </p>
      </div>

      {/* Research Model */}
      <div className="p-5 border border-slate-200 rounded-lg bg-white">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mr-3">
            <span className="text-lg">🔍</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Research Task</h4>
            <p className="text-xs text-slate-500">Used for company analysis and market research</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
            <select
              value={modelSelection.researchProvider}
              onChange={(e) => {
                const provider = e.target.value as AIProvider;
                const firstModel = AVAILABLE_MODELS[provider].find(m => m.capabilities.includes('research'))?.id
                  || AVAILABLE_MODELS[provider][0]?.id;
                updateModelSelection({
                  researchProvider: provider,
                  researchModel: firstModel
                });
              }}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            >
              {availableProviders.map(p => (
                <option key={p} value={p}>{providerDisplayNames[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
            <select
              value={modelSelection.researchModel}
              onChange={(e) => updateModelSelection({ researchModel: e.target.value })}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            >
              {AVAILABLE_MODELS[modelSelection.researchProvider]
                .filter(m => m.capabilities.includes('research'))
                .map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Email Model */}
      <div className="p-5 border border-slate-200 rounded-lg bg-white">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mr-3">
            <span className="text-lg">✉️</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Email Generation Task</h4>
            <p className="text-xs text-slate-500">Used for generating personalized outreach emails</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
            <select
              value={modelSelection.emailProvider}
              onChange={(e) => {
                const provider = e.target.value as AIProvider;
                const firstModel = AVAILABLE_MODELS[provider].find(m => m.capabilities.includes('email'))?.id
                  || AVAILABLE_MODELS[provider][0]?.id;
                updateModelSelection({
                  emailProvider: provider,
                  emailModel: firstModel
                });
              }}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            >
              {availableProviders.map(p => (
                <option key={p} value={p}>{providerDisplayNames[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
            <select
              value={modelSelection.emailModel}
              onChange={(e) => updateModelSelection({ emailModel: e.target.value })}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            >
              {AVAILABLE_MODELS[modelSelection.emailProvider]
                .filter(m => m.capabilities.includes('email'))
                .map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionSection;
