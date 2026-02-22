import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getActiveGHLAccount, getGHLAccountById } from '@/lib/ghl';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { session_id, research_data, contact_data, business_id, ghl_account_id } = body;

    // Use pinned account if provided (from research session), otherwise resolve dynamically
    const ghlAccount = ghl_account_id
      ? await getGHLAccountById(ghl_account_id, userData.organization_id)
      : await getActiveGHLAccount(user.id, userData.organization_id);

    if (!ghlAccount?.location_id || !ghlAccount.access_token) {
      return NextResponse.json(
        { error: 'GHL account not configured. Please add a GHL account in Settings.' },
        { status: 400 }
      );
    }

    const ghlApiKey = ghlAccount.access_token;

    if (!business_id) {
      return NextResponse.json(
        { error: 'Business ID is required to push research to GHL' },
        { status: 400 }
      );
    }

    // Build properties payload for GHL Custom Objects API
    // Only send company_research field which stores the full research data
    const properties: Record<string, string> = {
      company_research: JSON.stringify(research_data || {}),
    };

    const businessPayload = {
      properties,
    };

    const locationId = ghlAccount.location_id;
    console.log('[GHL Push] Updating business record:', business_id);
    console.log('[GHL Push] Payload:', JSON.stringify(businessPayload, null, 2));

    // Update business record in GHL using Custom Objects API
    // locationId must be a query parameter, not in the body
    const response = await fetch(`${GHL_API_BASE}/objects/business/records/${business_id}?locationId=${locationId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        Version: API_VERSION,
      },
      body: JSON.stringify(businessPayload),
    });

    console.log('[GHL Push] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GHL Push] API error:', response.status, errorData);
      throw new Error(errorData.message || errorData.error || `Failed to update business in GHL (${response.status})`);
    }

    const ghlBusiness = await response.json();
    console.log('[GHL Push] Success:', ghlBusiness);

    // Update research session with GHL reference and pinned account
    if (session_id) {
      await supabase
        .from('research_sessions')
        .update({
          ghl_company_id: business_id,
          ghl_pushed_at: new Date().toISOString(),
          ghl_account_id: ghlAccount.id,
        })
        .eq('id', session_id);
    }

    // Log the action
    await supabase.from('usage_records').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      action_type: 'ghl_sync',
      metadata: {
        business_id: business_id,
        company_name: research_data?.company_profile?.confirmed_name,
        ghl_account_id: ghlAccount.id,
      },
    });

    return NextResponse.json({
      success: true,
      business_id: business_id,
      record: ghlBusiness,
      message: 'Research pushed to GHL business successfully',
    });
  } catch (error) {
    console.error('[GHL Push] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to push to GHL' },
      { status: 500 }
    );
  }
}
