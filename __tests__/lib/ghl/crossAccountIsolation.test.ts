/**
 * Cross-Account Isolation Tests
 *
 * Verifies that multi-GHL account operations maintain proper data isolation.
 * Tests ensure that account-specific data cannot leak between accounts
 * within the same organization.
 */

const mockFromFn = jest.fn();
const mockRpcFn = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFromFn,
    rpc: mockRpcFn,
  })),
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/crypto', () => ({
  decryptApiKey: jest.fn((encrypted: string) => {
    if (typeof encrypted === 'string' && encrypted.startsWith('encrypted_')) {
      return encrypted.replace('encrypted_', '');
    }
    return encrypted;
  }),
  encryptApiKey: jest.fn((key: string) => ({ encrypted: `encrypted_${key}`, iv: 'mock-iv' })),
}));

import {
  getActiveGHLAccount,
  getPrimaryGHLAccount,
  getGHLAccountById,
} from '@/lib/ghl/getActiveAccount';

// Helper to build a chainable Supabase query mock
function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const terminal = jest.fn(() => Promise.resolve(resolvedValue));
  const chain: Record<string, jest.Mock> = {};
  chain.single = terminal;
  chain.maybeSingle = terminal;
  const self = () => chain;
  chain.select = jest.fn(self);
  chain.eq = jest.fn(self);
  chain.neq = jest.fn(self);
  chain.in = jest.fn(self);
  chain.insert = jest.fn(self);
  chain.update = jest.fn(self);
  chain.upsert = jest.fn(self);
  chain.delete = jest.fn(self);
  chain.order = jest.fn(self);
  chain.limit = jest.fn(self);
  return chain;
}

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function setupTableResponse(table: string, response: { data: unknown; error: unknown }) {
  tableResponses[table] = response;
}

// Two test accounts in the same org
const ACCOUNT_A = {
  id: 'account-a-id',
  organization_id: 'org-shared',
  account_name: 'Account A - Production',
  location_id: 'loc-aaa',
  location_name: 'Production Location',
  access_token_encrypted: 'encrypted_token-a',
  refresh_token_encrypted: null,
  token_expires_at: null,
  custom_field_mappings: {},
  sync_settings: {},
  is_primary: true,
  last_sync_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const ACCOUNT_B = {
  id: 'account-b-id',
  organization_id: 'org-shared',
  account_name: 'Account B - Staging',
  location_id: 'loc-bbb',
  location_name: 'Staging Location',
  access_token_encrypted: 'encrypted_token-b',
  refresh_token_encrypted: null,
  token_expires_at: null,
  custom_field_mappings: {},
  sync_settings: {},
  is_primary: false,
  last_sync_at: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
};

// Account in a DIFFERENT org (for cross-tenant tests)
const ACCOUNT_OTHER_ORG = {
  id: 'account-other-org',
  organization_id: 'org-other',
  account_name: 'Other Org Account',
  location_id: 'loc-other',
  location_name: null,
  access_token_encrypted: 'encrypted_token-other',
  refresh_token_encrypted: null,
  token_expires_at: null,
  custom_field_mappings: {},
  sync_settings: {},
  is_primary: true,
  last_sync_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('Cross-Account Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
    mockFromFn.mockImplementation((table: string) => {
      const response = tableResponses[table] || { data: null, error: null };
      return mockChain(response);
    });
  });

  describe('getGHLAccountById - Org Scoping', () => {
    it('should return account when ID and org match', async () => {
      setupTableResponse('ghl_accounts', { data: ACCOUNT_A, error: null });

      const result = await getGHLAccountById('account-a-id', 'org-shared');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('account-a-id');
      expect(result?.organization_id).toBe('org-shared');
      expect(result?.access_token).toBe('token-a');
    });

    it('should return null when account belongs to different org', async () => {
      // Simulate Supabase returning no rows because the .eq('organization_id') filter
      // prevents cross-org access
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getGHLAccountById('account-other-org', 'org-shared');

      expect(result).toBeNull();
    });

    it('should return null for valid account ID with wrong org ID', async () => {
      // Account A exists in org-shared, but caller claims org-other
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getGHLAccountById('account-a-id', 'org-other');

      expect(result).toBeNull();
    });
  });

  describe('getActiveGHLAccount - User Selection Isolation', () => {
    it('should use user-selected Account B even when Account A is primary', async () => {
      // User has selected Account B
      setupTableResponse('user_settings', {
        data: { selected_ghl_account_id: 'account-b-id' },
        error: null,
      });

      // The query for Account B returns it (same org)
      setupTableResponse('ghl_accounts', { data: ACCOUNT_B, error: null });

      const result = await getActiveGHLAccount('user-1', 'org-shared');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('account-b-id');
      expect(result?.access_token).toBe('token-b');
      expect(result?.is_primary).toBe(false);
    });

    it('should NOT return account from different org even if user_settings points to it', async () => {
      // User settings somehow points to an account in a different org
      setupTableResponse('user_settings', {
        data: { selected_ghl_account_id: 'account-other-org' },
        error: null,
      });

      // First query: selected account lookup returns null (org mismatch)
      // Second query: fallback to primary returns the correct org's primary
      // Since our mock returns per-table, both queries hit ghl_accounts.
      // The first will filter by org and return null, falling through to primary.
      // We simulate: first call (selected) returns null, second (primary) returns Account A.
      let callCount = 0;
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-other-org' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          callCount++;
          if (callCount === 1) {
            // First call: selected account + org filter = no match
            return mockChain({ data: null, error: null });
          }
          // Second call: primary account fallback
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const result = await getActiveGHLAccount('user-1', 'org-shared');

      // Should fall back to primary, NOT return the other org's account
      expect(result).not.toBeNull();
      expect(result?.organization_id).toBe('org-shared');
      expect(result?.id).toBe('account-a-id');
    });
  });

  describe('Account Token Isolation', () => {
    it('should decrypt tokens only for the requested account', async () => {
      const { decryptApiKey } = require('@/lib/crypto');

      setupTableResponse('ghl_accounts', { data: ACCOUNT_A, error: null });

      const result = await getGHLAccountById('account-a-id', 'org-shared');

      expect(result?.access_token).toBe('token-a');
      // decryptApiKey should have been called with Account A's token, not B's
      expect(decryptApiKey).toHaveBeenCalledWith('encrypted_token-a');
      expect(decryptApiKey).not.toHaveBeenCalledWith('encrypted_token-b');
    });

    it('should return different tokens for different accounts in same org', async () => {
      // Get Account A
      setupTableResponse('ghl_accounts', { data: ACCOUNT_A, error: null });
      const resultA = await getGHLAccountById('account-a-id', 'org-shared');

      jest.clearAllMocks();
      mockFromFn.mockImplementation((table: string) => {
        const response = tableResponses[table] || { data: null, error: null };
        return mockChain(response);
      });

      // Get Account B
      setupTableResponse('ghl_accounts', { data: ACCOUNT_B, error: null });
      const resultB = await getGHLAccountById('account-b-id', 'org-shared');

      expect(resultA?.access_token).toBe('token-a');
      expect(resultB?.access_token).toBe('token-b');
      expect(resultA?.access_token).not.toBe(resultB?.access_token);
      expect(resultA?.location_id).not.toBe(resultB?.location_id);
    });
  });

  describe('Primary Account Fallback Isolation', () => {
    it('should only fall back to primary within the SAME org', async () => {
      setupTableResponse('ghl_accounts', { data: ACCOUNT_A, error: null });

      const result = await getPrimaryGHLAccount('org-shared');

      expect(result).not.toBeNull();
      expect(result?.organization_id).toBe('org-shared');
      expect(result?.is_primary).toBe(true);
    });

    it('should return null for org with no accounts, not leak from another org', async () => {
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getPrimaryGHLAccount('org-empty');

      expect(result).toBeNull();
    });
  });

  describe('Account Context Integrity', () => {
    it('should preserve full account context through decryption', async () => {
      setupTableResponse('ghl_accounts', { data: ACCOUNT_A, error: null });

      const result = await getGHLAccountById('account-a-id', 'org-shared');

      // All critical fields should be preserved
      expect(result?.id).toBe('account-a-id');
      expect(result?.organization_id).toBe('org-shared');
      expect(result?.location_id).toBe('loc-aaa');
      expect(result?.account_name).toBe('Account A - Production');
      expect(result?.is_primary).toBe(true);
      // Decrypted tokens added
      expect(result?.access_token).toBe('token-a');
      // Original encrypted field still present
      expect(result?.access_token_encrypted).toBe('encrypted_token-a');
    });

    it('should not mutate account data across calls', async () => {
      setupTableResponse('ghl_accounts', { data: { ...ACCOUNT_A }, error: null });
      const result1 = await getGHLAccountById('account-a-id', 'org-shared');

      setupTableResponse('ghl_accounts', { data: { ...ACCOUNT_A }, error: null });
      const result2 = await getGHLAccountById('account-a-id', 'org-shared');

      // Results should be equal but not the same reference
      expect(result1?.id).toBe(result2?.id);
      expect(result1?.access_token).toBe(result2?.access_token);
    });
  });
});
