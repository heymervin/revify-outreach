import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/drafts - List drafts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'draft';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const { data: drafts, error } = await supabase
      .from('email_drafts')
      .select(`
        id,
        subject,
        body,
        original_body,
        status,
        ghl_contact_id,
        ghl_message_id,
        created_at,
        updated_at,
        research_id,
        research_results (
          company_name,
          confidence_score
        )
      `)
      .eq('user_id', user.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Failed to fetch drafts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

// POST /api/drafts - Create or save draft
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      research_id,
      ghl_contact_id,
      ghl_account_id,
      subject,
      body: emailBody,
      original_body,
      status = 'draft'
    } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Validate ghl_account_id belongs to user's organization
    if (ghl_account_id) {
      const { data: accountCheck } = await supabase
        .from('ghl_accounts')
        .select('id')
        .eq('id', ghl_account_id)
        .eq('organization_id', userData.organization_id)
        .single();

      if (!accountCheck) {
        return NextResponse.json(
          { error: 'Invalid GHL account - account does not belong to your organization' },
          { status: 400 }
        );
      }
    }

    const { data: draft, error } = await supabase
      .from('email_drafts')
      .insert({
        user_id: user.id,
        research_id: research_id || null,
        ghl_contact_id: ghl_contact_id || null,
        ghl_account_id: ghl_account_id || null,
        subject,
        body: emailBody,
        original_body: original_body || emailBody,
        status,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      draft,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('Failed to save draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save draft' },
      { status: 500 }
    );
  }
}
