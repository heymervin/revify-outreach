import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

export async function GET() {
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

    // Fetch all GHL accounts for the organization (RLS will enforce access)
    const { data: accounts, error } = await supabase
      .from('ghl_accounts')
      .select('id, account_name, location_id, location_name, is_primary, last_sync_at, created_at')
      .eq('organization_id', userData.organization_id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GHL Accounts API] Error fetching accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error('[GHL Accounts API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
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

    if (!['admin', 'owner'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { account_name, location_id, access_token } = body;

    if (!account_name || !location_id) {
      return NextResponse.json(
        { error: 'account_name and location_id are required' },
        { status: 400 }
      );
    }

    // Check if this is the first account for the org
    const { data: existingAccounts } = await supabase
      .from('ghl_accounts')
      .select('id')
      .eq('organization_id', userData.organization_id);

    const isFirstAccount = !existingAccounts || existingAccounts.length === 0;

    // Encrypt access token if provided
    let encryptedAccessToken = null;
    if (access_token) {
      const encrypted = encryptApiKey(access_token);
      encryptedAccessToken = encrypted.encrypted;
    }

    // Use admin client to insert (bypasses RLS for service-level operations)
    const adminClient = createAdminClient();

    const { data: newAccount, error: insertError } = await adminClient
      .from('ghl_accounts')
      .insert({
        organization_id: userData.organization_id,
        account_name,
        location_id,
        access_token_encrypted: encryptedAccessToken,
        is_primary: isFirstAccount,
      })
      .select('id, account_name, location_id, location_name, is_primary, created_at')
      .single();

    if (insertError) {
      console.error('[GHL Accounts API] Error creating account:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    console.error('[GHL Accounts API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
