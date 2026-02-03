import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
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

    // Get GHL config
    const { data: ghlConfig } = await supabase
      .from('ghl_config')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .single();

    if (!ghlConfig?.location_id) {
      return NextResponse.json(
        { error: 'GHL not configured. Please add your Location ID in Settings.' },
        { status: 400 }
      );
    }

    // Get GHL API key
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', userData.organization_id)
      .eq('provider', 'ghl')
      .single();

    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'GHL API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Fetch companies from GHL
    const response = await fetch(
      `${GHL_API_BASE}/locations/${ghlConfig.location_id}/customValues`,
      {
        headers: {
          Authorization: `Bearer ${apiKeyData.encrypted_key}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from GHL');
    }

    const data = await response.json();

    // Transform to our format
    const companies = (data.customValues || []).map((item: any) => ({
      id: item.id,
      name: item.name || item.businessName,
      website: item.website,
      industry: item.industry,
      email: item.email,
      phone: item.phone,
    }));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('GHL companies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
