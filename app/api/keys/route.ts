import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encryptApiKey, getKeyHint } from '@/lib/crypto';
import { validateInput, apiKeySchema } from '@/lib/validation';
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from '@/lib/errors';

// GET /api/keys - List all API keys (hints only) for the organization
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError();
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      throw new NotFoundError('Organization');
    }

    // Get all API keys (hints only - encrypted_key is not exposed)
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('provider, key_hint, is_valid, last_used_at, last_validated_at, created_at, updated_at')
      .eq('organization_id', userData.organization_id);

    if (keysError) {
      throw new Error('Failed to fetch API keys');
    }

    return NextResponse.json({
      success: true,
      keys: keys || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/keys - Save an encrypted API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError();
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      throw new NotFoundError('Organization');
    }

    // Parse and validate request body
    const body = await request.json();
    const { provider, key } = validateInput(apiKeySchema, body);

    // Encrypt the API key
    const { encrypted } = encryptApiKey(key);
    const hint = getKeyHint(key);

    // Upsert the API key
    const { error: upsertError } = await supabase.from('api_keys').upsert(
      {
        organization_id: userData.organization_id,
        provider,
        encrypted_key: encrypted,
        key_hint: hint,
        is_valid: null, // Will be validated on first use
        last_validated_at: null,
      },
      { onConflict: 'organization_id,provider' }
    );

    if (upsertError) {
      console.error('Failed to save API key:', upsertError);
      throw new Error('Failed to save API key');
    }

    return NextResponse.json({
      success: true,
      provider,
      hint,
      message: `${provider} API key saved successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/keys?provider=openai - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError();
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      throw new NotFoundError('Organization');
    }

    // Get provider from query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      throw new ValidationError('Provider is required');
    }

    const validProviders = ['openai', 'gemini', 'anthropic', 'tavily', 'ghl', 'apollo'];
    if (!validProviders.includes(provider)) {
      throw new ValidationError('Invalid provider');
    }

    // Delete the API key
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('organization_id', userData.organization_id)
      .eq('provider', provider);

    if (deleteError) {
      throw new Error('Failed to delete API key');
    }

    return NextResponse.json({
      success: true,
      message: `${provider} API key deleted`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
