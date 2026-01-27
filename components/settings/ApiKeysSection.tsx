import React, { useState } from 'react';
import { Eye, EyeOff, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { AIProvider } from '../../types';

const providers: { id: AIProvider | 'tavily'; name: string; placeholder: string; docsUrl: string }[] = [
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...', docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'tavily', name: 'Tavily (Web Search)', placeholder: 'tvly-...', docsUrl: 'https://tavily.com' },
];

const ApiKeysSection: React.FC = () => {
  const { apiKeys, updateApiKey, hasValidApiKey } = useSettings();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (provider: string) => {
    setVisibleKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">API Keys</h3>
        <p className="text-sm text-slate-500">
          Configure API keys for each AI provider. Keys are stored securely in your browser's local storage.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mr-3" />
          <div className="text-sm text-amber-800">
            <strong>Security Note:</strong> API keys are stored only in your browser and never sent to any server. Never share your API keys.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => (
          <div key={provider.id} className="p-4 border border-slate-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                {provider.name}
              </label>
              {hasValidApiKey(provider.id as keyof typeof apiKeys) && (
                <span className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3 mr-1" />
                  Configured
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type={visibleKeys[provider.id] ? 'text' : 'password'}
                  value={apiKeys[provider.id as keyof typeof apiKeys] || ''}
                  onChange={(e) => updateApiKey(provider.id as keyof typeof apiKeys, e.target.value)}
                  placeholder={provider.placeholder}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(provider.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {visibleKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 flex items-center">
              Get your key at{' '}
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline ml-1 inline-flex items-center"
              >
                {new URL(provider.docsUrl).hostname}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiKeysSection;
