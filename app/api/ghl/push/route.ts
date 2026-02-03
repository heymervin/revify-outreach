import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

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

    const body = await request.json();
    const { session_id, research_data, contact_data } = body;

    // Create or update contact in GHL
    const contactPayload = {
      locationId: ghlConfig.location_id,
      firstName: contact_data?.firstName || research_data?.company_profile?.confirmed_name,
      lastName: contact_data?.lastName || '',
      email: contact_data?.email || '',
      phone: contact_data?.phone || '',
      companyName: research_data?.company_profile?.confirmed_name,
      website: research_data?.company_profile?.website,
      tags: ['revify-research'],
      customFields: [
        {
          key: 'research_industry',
          value: research_data?.company_profile?.industry || '',
        },
        {
          key: 'research_revenue',
          value: research_data?.company_profile?.estimated_revenue || '',
        },
        {
          key: 'research_employees',
          value: research_data?.company_profile?.employee_count || '',
        },
        {
          key: 'research_confidence',
          value: String(research_data?.research_confidence?.overall_score || 0),
        },
        {
          key: 'research_signals',
          value: JSON.stringify(research_data?.recent_signals?.slice(0, 3) || []),
        },
        {
          key: 'research_pain_points',
          value: JSON.stringify(research_data?.pain_point_hypotheses?.slice(0, 3) || []),
        },
        {
          key: 'research_date',
          value: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKeyData.encrypted_key}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify(contactPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to push to GHL');
    }

    const ghlContact = await response.json();

    // Update research session with GHL reference
    if (session_id) {
      await supabase
        .from('research_sessions')
        .update({
          ghl_company_id: ghlContact.contact?.id,
          ghl_pushed_at: new Date().toISOString(),
        })
        .eq('id', session_id);
    }

    // Log the action
    await supabase.from('usage_records').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      action_type: 'ghl_sync',
      metadata: {
        contact_id: ghlContact.contact?.id,
        company_name: research_data?.company_profile?.confirmed_name,
      },
    });

    return NextResponse.json({
      success: true,
      contact_id: ghlContact.contact?.id,
      message: 'Research pushed to GHL successfully',
    });
  } catch (error) {
    console.error('GHL push error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to push to GHL' },
      { status: 500 }
    );
  }
}
