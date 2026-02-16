import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

// GET /api/models/config - Get model configuration
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get model configuration
    const { data: config, error } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    // Return default config if none exists
    if (!config) {
      return NextResponse.json({
        config: {
          news_signals_model: 'serp-api',
          quick_research_model: 'gemini-3-flash-preview',
          standard_research_model: 'gemini-3-flash-preview',
          deep_research_model: 'gemini-3-pro-preview',
          email_drafting_model: 'gemini-3-pro-preview',
          web_scraping_service: 'tavily',
          has_serp_api_key: false,
        },
      });
    }

    return NextResponse.json({
      config: {
        ...config,
        serp_api_key_encrypted: undefined, // Don't expose encrypted key
        has_serp_api_key: !!config.serp_api_key_encrypted,
      },
    });
  } catch (error) {
    console.error('[Models Config API] Failed to fetch config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch model configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/models/config - Update model configuration
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and role
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Only admins can update model config
    if (!['admin', 'owner'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      news_signals_model,
      quick_research_model,
      standard_research_model,
      deep_research_model,
      email_drafting_model,
      web_scraping_service,
      serp_api_key,
    } = body;

    // Prepare update data
    const updateData: Record<string, any> = {};

    if (news_signals_model) updateData.news_signals_model = news_signals_model;
    if (quick_research_model) updateData.quick_research_model = quick_research_model;
    if (standard_research_model) updateData.standard_research_model = standard_research_model;
    if (deep_research_model) updateData.deep_research_model = deep_research_model;
    if (email_drafting_model) updateData.email_drafting_model = email_drafting_model;
    if (web_scraping_service) updateData.web_scraping_service = web_scraping_service;

    // Encrypt SERP API key if provided
    if (serp_api_key && serp_api_key.trim()) {
      const encrypted = encryptApiKey(serp_api_key.trim());
      updateData.serp_api_key_encrypted = encrypted.encrypted;
    }

    // Upsert configuration
    const { data: config, error } = await supabase
      .from('model_configurations')
      .upsert(
        {
          organization_id: userData.organization_id,
          ...updateData,
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        serp_api_key_encrypted: undefined,
        has_serp_api_key: !!config.serp_api_key_encrypted,
      },
      message: 'Model configuration updated successfully',
    });
  } catch (error) {
    console.error('[Models Config API] Failed to update config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update model configuration' },
      { status: 500 }
    );
  }
}
