import { NextRequest, NextResponse } from 'next/server';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'tavily' | 'apollo';

interface ValidationRequest {
  provider: AIProvider;
  key: string;
}

/**
 * Validate an API key by making a minimal test request to the provider
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { valid: false, error: 'Provider and key are required' },
        { status: 400 }
      );
    }

    // Basic format validation
    const formatValid = validateKeyFormat(provider, key);
    if (!formatValid) {
      return NextResponse.json(
        { valid: false, error: `Invalid key format for ${provider}` },
        { status: 400 }
      );
    }

    // Validate with actual API call
    const result = await validateWithProvider(provider, key);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed. Please try again.' },
      { status: 500 }
    );
  }
}

function validateKeyFormat(provider: AIProvider, key: string): boolean {
  switch (provider) {
    case 'openai':
      return key.startsWith('sk-');
    case 'anthropic':
      return key.startsWith('sk-ant-');
    case 'gemini':
      return key.startsWith('AIza');
    case 'tavily':
      return key.startsWith('tvly-');
    case 'apollo':
      return key.length >= 20; // Apollo keys have no specific prefix
    default:
      return true;
  }
}

async function validateWithProvider(
  provider: AIProvider,
  key: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai':
        return await validateOpenAI(key);
      case 'anthropic':
        return await validateAnthropic(key);
      case 'gemini':
        return await validateGemini(key);
      case 'tavily':
        return await validateTavily(key);
      case 'apollo':
        return await validateApollo(key);
      default:
        return { valid: false, error: 'Unknown provider' };
    }
  } catch (error) {
    console.error(`${provider} validation error:`, error);
    return { valid: false, error: 'Failed to validate key. Please check and try again.' };
  }
}

async function validateOpenAI(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return { valid: false, error: 'Could not verify key' };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}

async function validateAnthropic(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Anthropic doesn't have a simple validation endpoint
    // We'll try a minimal message request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429 || response.status === 400) {
      // Rate limited or bad request format, but key might be valid
      // Check the error message
      const data = await response.json().catch(() => ({}));
      if (data.error?.type === 'authentication_error') {
        return { valid: false, error: 'Invalid API key' };
      }
      // Other errors might mean the key is valid but there's another issue
      return { valid: true };
    }

    return { valid: false, error: 'Could not verify key' };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}

async function validateGemini(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Test with a minimal request to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
      { method: 'GET' }
    );

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 400 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: 'Could not verify key' };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}

async function validateTavily(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Tavily validation - try a minimal search
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: key,
        query: 'test',
        max_results: 1,
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || data.error?.includes('Invalid')) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return { valid: false, error: 'Could not verify key' };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}

async function validateApollo(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.apollo.io/v1/auth/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': key,
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.is_logged_in === true) {
        return { valid: true };
      }
      return { valid: false, error: 'API key is not authenticated' };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429) {
      return { valid: true };
    }

    return { valid: false, error: 'Could not verify key' };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}
