// Mock modules BEFORE any imports
const mockFromFn = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFromFn,
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

  // Terminal methods
  chain.single = terminal;

  // Chainable methods - each returns the chain
  const self = () => chain;
  chain.select = jest.fn(self);
  chain.eq = jest.fn(self);
  chain.neq = jest.fn(self);
  chain.insert = jest.fn(self);
  chain.update = jest.fn(self);
  chain.delete = jest.fn(self);
  chain.order = jest.fn(self);

  return chain;
}

// Per-table response store
const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function setupTableResponse(table: string, response: { data: unknown; error: unknown }) {
  tableResponses[table] = response;
}

describe('GHL Account Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);

    // Setup mockFromFn to return chainable mock based on table name
    mockFromFn.mockImplementation((table: string) => {
      const response = tableResponses[table] || { data: null, error: null };
      return mockChain(response);
    });
  });

  describe('getPrimaryGHLAccount', () => {
    it('should return the primary account for an organization', async () => {
      setupTableResponse('ghl_accounts', {
        data: {
          id: 'account-1',
          organization_id: 'org-1',
          account_name: 'Primary Account',
          location_id: 'loc-123',
          location_name: 'Main Location',
          access_token_encrypted: 'encrypted_my-token',
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: true,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getPrimaryGHLAccount('org-1');

      expect(result).not.toBeNull();
      expect(result?.account_name).toBe('Primary Account');
      expect(result?.access_token).toBe('my-token');
      expect(result?.refresh_token).toBeNull();
      expect(mockFromFn).toHaveBeenCalledWith('ghl_accounts');
    });

    it('should return null when no primary account exists', async () => {
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await getPrimaryGHLAccount('org-nonexistent');
      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: '500', message: 'Database error' },
      });

      const result = await getPrimaryGHLAccount('org-1');
      expect(result).toBeNull();
    });
  });

  describe('getGHLAccountById', () => {
    it('should return account by ID with decrypted tokens', async () => {
      setupTableResponse('ghl_accounts', {
        data: {
          id: 'account-2',
          organization_id: 'org-1',
          account_name: 'Secondary Account',
          location_id: 'loc-456',
          location_name: null,
          access_token_encrypted: 'encrypted_secret-token',
          refresh_token_encrypted: 'encrypted_refresh-token',
          token_expires_at: '2026-12-31T00:00:00Z',
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: false,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getGHLAccountById('account-2', 'org-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('account-2');
      expect(result?.access_token).toBe('secret-token');
      expect(result?.refresh_token).toBe('refresh-token');
    });

    it('should return null for non-existent account', async () => {
      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await getGHLAccountById('nonexistent-id', 'org-1');
      expect(result).toBeNull();
    });

    it('should handle account with no encrypted tokens', async () => {
      setupTableResponse('ghl_accounts', {
        data: {
          id: 'account-3',
          organization_id: 'org-1',
          account_name: 'No Token Account',
          location_id: 'loc-789',
          location_name: null,
          access_token_encrypted: null,
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: false,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getGHLAccountById('account-3', 'org-1');

      expect(result).not.toBeNull();
      expect(result?.access_token).toBeNull();
      expect(result?.refresh_token).toBeNull();
    });
  });

  describe('getActiveGHLAccount', () => {
    it('should return user-selected account when available', async () => {
      setupTableResponse('user_settings', {
        data: { selected_ghl_account_id: 'selected-account' },
        error: null,
      });

      setupTableResponse('ghl_accounts', {
        data: {
          id: 'selected-account',
          organization_id: 'org-1',
          account_name: 'User Selected Account',
          location_id: 'loc-selected',
          location_name: null,
          access_token_encrypted: 'encrypted_selected-token',
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: false,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getActiveGHLAccount('user-1', 'org-1');

      expect(result).not.toBeNull();
      expect(result?.account_name).toBe('User Selected Account');
      expect(result?.access_token).toBe('selected-token');
    });

    it('should fallback to primary account when no selection exists', async () => {
      setupTableResponse('user_settings', {
        data: { selected_ghl_account_id: null },
        error: null,
      });

      setupTableResponse('ghl_accounts', {
        data: {
          id: 'primary-account',
          organization_id: 'org-1',
          account_name: 'Primary Fallback',
          location_id: 'loc-primary',
          location_name: null,
          access_token_encrypted: 'encrypted_primary-token',
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: true,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getActiveGHLAccount('user-1', 'org-1');

      expect(result).not.toBeNull();
      // Falls through to primary because selected_ghl_account_id is null
      expect(result?.is_primary).toBe(true);
    });

    it('should fallback to primary when user_settings has no row', async () => {
      setupTableResponse('user_settings', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      setupTableResponse('ghl_accounts', {
        data: {
          id: 'primary-account',
          organization_id: 'org-1',
          account_name: 'Primary After Error',
          location_id: 'loc-primary',
          location_name: null,
          access_token_encrypted: null,
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: true,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getActiveGHLAccount('user-1', 'org-1');

      expect(result).not.toBeNull();
      expect(result?.account_name).toBe('Primary After Error');
    });

    it('should return null when no accounts exist at all', async () => {
      setupTableResponse('user_settings', {
        data: { selected_ghl_account_id: null },
        error: null,
      });

      setupTableResponse('ghl_accounts', {
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await getActiveGHLAccount('user-1', 'org-1');
      expect(result).toBeNull();
    });
  });

  describe('Token decryption edge cases', () => {
    it('should handle decryption errors gracefully', async () => {
      // Override decryptApiKey to throw for this test
      const { decryptApiKey } = require('@/lib/crypto');
      (decryptApiKey as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      setupTableResponse('ghl_accounts', {
        data: {
          id: 'account-bad-token',
          organization_id: 'org-1',
          account_name: 'Bad Token Account',
          location_id: 'loc-bad',
          location_name: null,
          access_token_encrypted: 'corrupted_data',
          refresh_token_encrypted: null,
          token_expires_at: null,
          custom_field_mappings: {},
          sync_settings: {},
          is_primary: true,
          last_sync_at: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getPrimaryGHLAccount('org-1');

      // The try/catch in decryptAccountTokens should return null tokens
      expect(result).not.toBeNull();
      expect(result?.access_token).toBeNull();
      expect(result?.refresh_token).toBeNull();
    });
  });
});
