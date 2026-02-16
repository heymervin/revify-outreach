// lib/ghl/getActiveAccount.ts

import { createAdminClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { GHLAccount, GHLAccountWithTokens } from './types';

/**
 * Get the primary GHL account for an organization
 */
export async function getPrimaryGHLAccount(
  organizationId: string
): Promise<GHLAccountWithTokens | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ghl_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_primary', true)
    .single();

  if (error || !data) {
    console.error('[GHL] Failed to fetch primary account:', error);
    return null;
  }

  return decryptAccountTokens(data);
}

/**
 * Get a specific GHL account by ID, scoped to an organization.
 * Requires organizationId to prevent cross-tenant data access.
 */
export async function getGHLAccountById(
  accountId: string,
  organizationId: string
): Promise<GHLAccountWithTokens | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ghl_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    console.error('[GHL] Failed to fetch account by ID:', accountId, error);
    return null;
  }

  return decryptAccountTokens(data);
}

/**
 * Decrypt account tokens
 */
function decryptAccountTokens(account: GHLAccount): GHLAccountWithTokens {
  try {
    return {
      ...account,
      access_token: account.access_token_encrypted
        ? decryptApiKey(account.access_token_encrypted)
        : null,
      refresh_token: account.refresh_token_encrypted
        ? decryptApiKey(account.refresh_token_encrypted)
        : null,
    };
  } catch (error) {
    console.error('[GHL] Failed to decrypt tokens for account:', account.id, error);
    return { ...account, access_token: null, refresh_token: null };
  }
}

/**
 * Get the active GHL account for a user
 * Priority: 1) User's selected account, 2) Organization's primary account
 */
export async function getActiveGHLAccount(
  userId: string,
  organizationId: string
): Promise<GHLAccountWithTokens | null> {
  const supabase = createAdminClient();

  // 1. Get user's selected account from user_settings
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('selected_ghl_account_id')
    .eq('user_id', userId)
    .single();

  // 2. If user has a selected account, try to use it
  if (userSettings?.selected_ghl_account_id) {
    // Atomically fetch and validate selected account
    const { data: selectedAccount } = await supabase
      .from('ghl_accounts')
      .select('*')
      .eq('id', userSettings.selected_ghl_account_id)
      .eq('organization_id', organizationId)
      .single();

    if (selectedAccount) {
      return decryptAccountTokens(selectedAccount);
    }
  }

  // 3. Fallback to primary account
  return getPrimaryGHLAccount(organizationId);
}
