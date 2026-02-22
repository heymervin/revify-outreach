import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
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

    const adminClient = createAdminClient();

    // Verify account exists and belongs to user's org
    const { data: account } = await adminClient
      .from('ghl_accounts')
      .select('id, organization_id')
      .eq('id', account_id)
      .single();

    if (!account || account.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Upsert user_settings to handle users who may not have a row yet
    const { error: upsertError } = await adminClient
      .from('user_settings')
      .upsert(
        { user_id: user.id, selected_ghl_account_id: account_id },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[GHL Select API] Error updating user settings:', upsertError);
      return NextResponse.json({ error: 'Failed to update selection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, account_id });
  } catch (error) {
    console.error('[GHL Select API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
