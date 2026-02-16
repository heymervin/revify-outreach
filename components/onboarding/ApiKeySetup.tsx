'use client';

import { useState } from 'react';
import { Eye, EyeOff, Check, X, ExternalLink, Loader2, Key } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'tavily';

interface ApiKeyConfig {
  provider: AIProvider;
  label: string;
  placeholder: string;
  helpText: string;
  helpUrl: string;
  required?: boolean;
  recommended?: boolean;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    provider: 'openai',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpText: 'Get your key from OpenAI dashboard',
    helpUrl: 'https://platform.openai.com/api-keys',
    recommended: true,
  },
  {
    provider: 'anthropic',
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-...',
    helpText: 'Get your key from Anthropic console',
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    provider: 'gemini',
    label: 'Google Gemini API Key',
    placeholder: 'AIza...',
    helpText: 'Get your key from Google AI Studio',
    helpUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    provider: 'tavily',
    label: 'Tavily API Key',
    placeholder: 'tvly-...',
    helpText: 'Required for deep research with web search',
    helpUrl: 'https://tavily.com/',
  },
];

interface ApiKeyInputProps {
  config: ApiKeyConfig;
  value: string;
  onChange: (value: string) => void;
  onValidate?: () => void;
  validationStatus?: 'idle' | 'validating' | 'valid' | 'invalid';
  validationError?: string;
}

function ApiKeyInput({
  config,
  value,
  onChange,
  onValidate,
  validationStatus = 'idle',
  validationError,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card padding="md" className="mb-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{config.label}</span>
          {config.recommended && (
            <Badge variant="success" size="sm">Recommended</Badge>
          )}
          {config.required && (
            <Badge variant="danger" size="sm">Required</Badge>
          )}
        </div>
        <a
          href={config.helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
        >
          Get key
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
            error={validationStatus === 'invalid' ? validationError : undefined}
          />
        </div>
        {onValidate && value && (
          <Button
            variant="secondary"
            size="md"
            onClick={onValidate}
            disabled={validationStatus === 'validating' || !value.trim()}
          >
            {validationStatus === 'validating' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : validationStatus === 'valid' ? (
              <Check className="w-4 h-4 text-success-500" />
            ) : validationStatus === 'invalid' ? (
              <X className="w-4 h-4 text-danger-500" />
            ) : (
              'Test'
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-2">{config.helpText}</p>
    </Card>
  );
}

interface ApiKeySetupProps {
  apiKeys: Record<AIProvider, string>;
  onApiKeysChange: (keys: Record<AIProvider, string>) => void;
  validationStatuses?: Partial<Record<AIProvider, 'idle' | 'validating' | 'valid' | 'invalid'>>;
  validationErrors?: Partial<Record<AIProvider, string>>;
  onValidateKey?: (provider: AIProvider) => void;
}

export function ApiKeySetup({
  apiKeys,
  onApiKeysChange,
  validationStatuses = {},
  validationErrors = {},
  onValidateKey,
}: ApiKeySetupProps) {
  const handleKeyChange = (provider: AIProvider, value: string) => {
    onApiKeysChange({
      ...apiKeys,
      [provider]: value,
    });
  };

  const hasAnyKey = Object.values(apiKeys).some((key) => key.trim());

  return (
    <div>
      {/* Info banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-teal-800">
              Add at least one AI provider key to enable research
            </p>
            <p className="text-sm text-teal-600 mt-1">
              We recommend starting with OpenAI for the best results. Your keys are stored securely.
            </p>
          </div>
        </div>
      </div>

      {/* API Key inputs */}
      {API_KEY_CONFIGS.map((config) => (
        <ApiKeyInput
          key={config.provider}
          config={config}
          value={apiKeys[config.provider] || ''}
          onChange={(value) => handleKeyChange(config.provider, value)}
          onValidate={onValidateKey ? () => onValidateKey(config.provider) : undefined}
          validationStatus={validationStatuses[config.provider]}
          validationError={validationErrors[config.provider]}
        />
      ))}

      {/* Status summary */}
      {hasAnyKey && (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
          {Object.entries(validationStatuses).filter(([_, status]) => status === 'valid').length > 0 ? (
            <div className="flex items-center gap-2 text-success-600">
              <Check className="w-4 h-4" />
              <span>
                {Object.entries(validationStatuses).filter(([_, status]) => status === 'valid').length} key(s) validated successfully
              </span>
            </div>
          ) : (
            <span>Click &quot;Test&quot; to validate your keys before continuing</span>
          )}
        </div>
      )}
    </div>
  );
}

export { API_KEY_CONFIGS };
export type { ApiKeyConfig };
