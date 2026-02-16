export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'tavily';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  provider: AIProvider;
}

/**
 * Validates an API key by making a test request to the validation endpoint
 */
export async function validateApiKey(
  provider: AIProvider,
  key: string
): Promise<ValidationResult> {
  if (!key.trim()) {
    return {
      valid: false,
      error: 'API key is required',
      provider,
    };
  }

  try {
    const response = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        error: data.error || 'Validation failed',
        provider,
      };
    }

    return {
      valid: data.valid,
      error: data.error,
      provider,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Network error. Please try again.',
      provider,
    };
  }
}

/**
 * Validates multiple API keys in parallel
 */
export async function validateMultipleKeys(
  keys: Partial<Record<AIProvider, string>>
): Promise<Record<AIProvider, ValidationResult>> {
  const results: Record<AIProvider, ValidationResult> = {} as Record<AIProvider, ValidationResult>;

  const validations = Object.entries(keys)
    .filter(([_, value]) => value && value.trim())
    .map(async ([provider, key]) => {
      const result = await validateApiKey(provider as AIProvider, key as string);
      results[provider as AIProvider] = result;
    });

  await Promise.all(validations);

  return results;
}

/**
 * Get the expected key format pattern for validation hints
 */
export function getKeyFormatHint(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'Should start with "sk-"';
    case 'anthropic':
      return 'Should start with "sk-ant-"';
    case 'gemini':
      return 'Should start with "AIza"';
    case 'tavily':
      return 'Should start with "tvly-"';
    default:
      return '';
  }
}

/**
 * Basic format validation (client-side, quick check)
 */
export function validateKeyFormat(provider: AIProvider, key: string): boolean {
  if (!key.trim()) return false;

  switch (provider) {
    case 'openai':
      return key.startsWith('sk-');
    case 'anthropic':
      return key.startsWith('sk-ant-');
    case 'gemini':
      return key.startsWith('AIza');
    case 'tavily':
      return key.startsWith('tvly-');
    default:
      return true;
  }
}
