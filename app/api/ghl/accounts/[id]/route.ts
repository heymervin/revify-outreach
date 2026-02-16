import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
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

    const body = await request.json();
    const { account_name, location_id, is_primary, access_token } = body;

    const adminClient = createAdminClient();

    // If setting as primary, unset other primary accounts first
    if (is_primary === true) {
      await adminClient
        .from('ghl_accounts')
        .update({ is_primary: false })
        .eq('organization_id', userData.organization_id)
        .neq('id', accountId);
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (account_name !== undefined) updates.account_name = account_name;
    if (location_id !== undefined) updates.location_id = location_id;
    if (is_primary !== undefined) updates.is_primary = is_primary;
    if (access_token) {
      const encrypted = encryptApiKey(access_token);
      updates.access_token_encrypted = encrypted.encrypted;
    }

    const { data: updatedAccount, error: updateError } = await adminClient
      .from('ghl_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('organization_id', userData.organization_id)
      .select('id, account_name, location_id, location_name, is_primary, last_sync_at')
      .single();

    if (updateError) {
      console.error('[GHL Accounts API] Error updating account:', updateError);
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
    }

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('[GHL Accounts API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
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

    const adminClient = createAdminClient();

    // Check if this is the only account
    const { data: allAccounts } = await adminClient
      .from('ghl_accounts')
      .select('id, is_primary')
      .eq('organization_id', userData.organization_id);

    if (!allAccounts || allAccounts.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only account' },
        { status: 400 }
      );
    }

    // Check if deleting primary account
    const accountToDelete = allAccounts.find((a) => a.id === accountId);
    const wasPrimary = accountToDelete?.is_primary;

    // Delete the account
    const { error: deleteError } = await adminClient
      .from('ghl_accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', userData.organization_id);

    if (deleteError) {
      console.error('[GHL Accounts API] Error deleting account:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // If deleted account was primary, promote oldest remaining account
    if (wasPrimary) {
      const remaining = allAccounts.filter((a) => a.id !== accountId);
      if (remaining.length > 0) {
        await adminClient
          .from('ghl_accounts')
          .update({ is_primary: true })
          .eq('id', remaining[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[GHL Accounts API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
