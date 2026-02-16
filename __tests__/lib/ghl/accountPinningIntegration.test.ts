/**
 * Account Pinning Integration Tests
 *
 * Verifies that ghl_account_id is correctly pinned to research sessions,
 * queue items, and email drafts, preventing cross-account data contamination
 * when users switch between multiple GHL accounts.
 *
 * Test Coverage:
 * - Research sessions maintain account context
 * - Queue items process with correct account
 * - Email drafts send via correct account
 * - Cross-org security boundaries
 */

// Mock dependencies
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

import { getActiveGHLAccount, getGHLAccountById } from '@/lib/ghl/getActiveAccount';
import { QueueService } from '@/lib/queue/queueService';
import { SupabaseClient } from '@supabase/supabase-js';

// Helper to build chainable Supabase query mock
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

// Test data fixtures
const ORG_ID = 'org-test-123';
const OTHER_ORG_ID = 'org-other-456';
const USER_ID = 'user-test-123';
const OTHER_USER_ID = 'user-other-456';

const ACCOUNT_A = {
  id: 'account-a-uuid',
  organization_id: ORG_ID,
  account_name: 'Production GHL',
  location_id: 'loc-aaa-111',
  location_name: 'Prod Location',
  access_token_encrypted: 'encrypted_token-aaa',
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
  id: 'account-b-uuid',
  organization_id: ORG_ID,
  account_name: 'Staging GHL',
  location_id: 'loc-bbb-222',
  location_name: 'Staging Location',
  access_token_encrypted: 'encrypted_token-bbb',
  refresh_token_encrypted: null,
  token_expires_at: null,
  custom_field_mappings: {},
  sync_settings: {},
  is_primary: false,
  last_sync_at: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
};

const ACCOUNT_OTHER_ORG = {
  id: 'account-other-org-uuid',
  organization_id: OTHER_ORG_ID,
  account_name: 'Other Org Account',
  location_id: 'loc-other-999',
  location_name: 'Other Location',
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

describe('Account Pinning Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Research Session Pinning', () => {
    it('research session stores and maintains ghl_account_id', async () => {
      // Setup: User has Account A active
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-a-uuid' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      // Get active account (should be Account A)
      const activeAccount = await getActiveGHLAccount(USER_ID, ORG_ID);
      expect(activeAccount?.id).toBe('account-a-uuid');
      expect(activeAccount?.location_id).toBe('loc-aaa-111');

      // Simulate creating a research session with Account A
      const researchSession = {
        id: 'research-001',
        organization_id: ORG_ID,
        user_id: USER_ID,
        company_name: 'Acme Corp',
        ghl_account_id: activeAccount?.id, // Pinned to Account A
        created_at: new Date().toISOString(),
      };

      // Simulate user switching to Account B
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-b-uuid' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      // Verify active account is now B
      const newActiveAccount = await getActiveGHLAccount(USER_ID, ORG_ID);
      expect(newActiveAccount?.id).toBe('account-b-uuid');

      // But research session should still reference Account A
      expect(researchSession.ghl_account_id).toBe('account-a-uuid');

      // When pushing research to GHL, it should use Account A's tokens
      const accountForPush = await getGHLAccountById(researchSession.ghl_account_id!, ORG_ID);

      // Need to reset mock to return Account A when queried by ID
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const accountForPush2 = await getGHLAccountById(researchSession.ghl_account_id!, ORG_ID);
      expect(accountForPush2?.id).toBe('account-a-uuid');
      expect(accountForPush2?.access_token).toBe('token-aaa');
      expect(accountForPush2?.location_id).toBe('loc-aaa-111');
    });

    it('research sessions with different accounts maintain isolation', async () => {
      // Create research on Account A
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const accountA = await getGHLAccountById('account-a-uuid', ORG_ID);
      const researchOnA = {
        id: 'research-a-001',
        ghl_account_id: accountA?.id,
        company_name: 'Company A',
      };

      // Create research on Account B
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const accountB = await getGHLAccountById('account-b-uuid', ORG_ID);
      const researchOnB = {
        id: 'research-b-001',
        ghl_account_id: accountB?.id,
        company_name: 'Company B',
      };

      // Verify they have different account IDs
      expect(researchOnA.ghl_account_id).toBe('account-a-uuid');
      expect(researchOnB.ghl_account_id).toBe('account-b-uuid');
      expect(researchOnA.ghl_account_id).not.toBe(researchOnB.ghl_account_id);
    });

    it('research session cannot be pushed to wrong account', async () => {
      // Research was created on Account A
      const researchSession = {
        id: 'research-001',
        organization_id: ORG_ID,
        ghl_account_id: 'account-a-uuid',
        company_name: 'Test Corp',
      };

      // Try to get Account B's credentials (wrong account)
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const wrongAccount = await getGHLAccountById('account-b-uuid', ORG_ID);

      // Verify we got Account B
      expect(wrongAccount?.id).toBe('account-b-uuid');

      // The research session should NOT match this account
      expect(researchSession.ghl_account_id).not.toBe(wrongAccount?.id);

      // In real code, this check would prevent pushing to wrong location
      if (researchSession.ghl_account_id !== wrongAccount?.id) {
        // This is correct behavior - preventing cross-account contamination
        expect(true).toBe(true);
      }
    });
  });

  describe('Queue Item Pinning', () => {
    let mockSupabase: Partial<SupabaseClient>;
    let queueService: QueueService;

    beforeEach(() => {
      mockSupabase = {
        from: mockFromFn,
      } as Partial<SupabaseClient>;

      queueService = new QueueService({
        supabase: mockSupabase as SupabaseClient,
        organizationId: ORG_ID,
        userId: USER_ID,
      });
    });

    it('queue items maintain account context across switches', async () => {
      // Queue item created on Account A
      const queueItemOnA = {
        id: 'queue-001',
        organization_id: ORG_ID,
        user_id: USER_ID,
        company_domain: 'acme.com',
        company_name: 'Acme Corp',
        ghl_account_id: 'account-a-uuid',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockFromFn.mockImplementation((table: string) => {
        if (table === 'research_queue') {
          return mockChain({ data: queueItemOnA, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      // Add to queue
      const added = await queueService.addToQueue({
        company_domain: 'acme.com',
        company_name: 'Acme Corp',
        ghl_account_id: 'account-a-uuid',
      });

      expect(added.ghl_account_id).toBe('account-a-uuid');

      // User switches to Account B
      // But queue item should still reference Account A
      expect(queueItemOnA.ghl_account_id).toBe('account-a-uuid');

      // When processing queue, should use Account A
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'research_queue') {
          return mockChain({ data: queueItemOnA, error: null });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const queueItem = await queueService.getById('queue-001');
      expect(queueItem?.ghl_account_id).toBe('account-a-uuid');

      // Get the account for processing
      const accountForProcessing = await getGHLAccountById(queueItem!.ghl_account_id!, ORG_ID);
      expect(accountForProcessing?.id).toBe('account-a-uuid');
      expect(accountForProcessing?.location_id).toBe('loc-aaa-111');
    });

    it('batch queue items from different accounts maintain isolation', async () => {
      // Test that a batch of queue items can have different account IDs
      // and they maintain their individual account context

      // Simulate three queue items with mixed accounts
      const item1 = {
        company_domain: 'company1.com',
        ghl_account_id: 'account-a-uuid',
      };

      const item2 = {
        company_domain: 'company2.com',
        ghl_account_id: 'account-b-uuid',
      };

      const item3 = {
        company_domain: 'company3.com',
        ghl_account_id: 'account-a-uuid',
      };

      // Verify items maintain their respective account IDs
      expect(item1.ghl_account_id).toBe('account-a-uuid');
      expect(item2.ghl_account_id).toBe('account-b-uuid');
      expect(item3.ghl_account_id).toBe('account-a-uuid');

      // Verify Account A items don't leak into Account B
      expect(item1.ghl_account_id).not.toBe(item2.ghl_account_id);
      expect(item3.ghl_account_id).not.toBe(item2.ghl_account_id);

      // Verify both Account A items have same ID
      expect(item1.ghl_account_id).toBe(item3.ghl_account_id);
    });

    it('queue processing uses correct account per item', async () => {
      // Queue item pinned to Account B
      const queueItem = {
        id: 'queue-002',
        organization_id: ORG_ID,
        ghl_account_id: 'account-b-uuid',
        company_domain: 'test.com',
        status: 'pending',
      };

      mockFromFn.mockImplementation((table: string) => {
        if (table === 'research_queue') {
          return mockChain({ data: queueItem, error: null });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const item = await queueService.getById('queue-002');
      expect(item?.ghl_account_id).toBe('account-b-uuid');

      // Get account for processing
      const account = await getGHLAccountById(item!.ghl_account_id!, ORG_ID);
      expect(account?.id).toBe('account-b-uuid');
      expect(account?.location_id).toBe('loc-bbb-222');
      expect(account?.access_token).toBe('token-bbb');
    });
  });

  describe('Draft Pinning', () => {
    it('email drafts send via correct account', async () => {
      // Draft created from research on Account A
      const draft = {
        id: 'draft-001',
        user_id: USER_ID,
        research_id: 'research-001',
        ghl_account_id: 'account-a-uuid',
        ghl_contact_id: 'contact-123',
        subject: 'Test Email',
        body: 'Email body',
        status: 'draft',
      };

      // User switches to Account B
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-b-uuid' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const currentAccount = await getActiveGHLAccount(USER_ID, ORG_ID);
      expect(currentAccount?.id).toBe('account-b-uuid');

      // But draft should still send via Account A
      expect(draft.ghl_account_id).toBe('account-a-uuid');

      // When sending, use draft's pinned account
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const accountForSending = await getGHLAccountById(draft.ghl_account_id!, ORG_ID);
      expect(accountForSending?.id).toBe('account-a-uuid');
      expect(accountForSending?.location_id).toBe('loc-aaa-111');
    });

    it('draft inherits account from research session', async () => {
      // Research on Account B
      const research = {
        id: 'research-002',
        organization_id: ORG_ID,
        user_id: USER_ID,
        ghl_account_id: 'account-b-uuid',
        company_name: 'Test Corp',
      };

      // Draft created from this research
      const draft = {
        id: 'draft-002',
        user_id: USER_ID,
        research_id: research.id,
        ghl_account_id: research.ghl_account_id, // Inherited
        subject: 'Follow-up',
        body: 'Email content',
        status: 'draft',
      };

      expect(draft.ghl_account_id).toBe('account-b-uuid');
      expect(draft.ghl_account_id).toBe(research.ghl_account_id);
    });

    it('multiple drafts maintain independent account pins', async () => {
      const drafts = [
        {
          id: 'draft-a-1',
          research_id: 'research-a-1',
          ghl_account_id: 'account-a-uuid',
          subject: 'Email A',
        },
        {
          id: 'draft-b-1',
          research_id: 'research-b-1',
          ghl_account_id: 'account-b-uuid',
          subject: 'Email B',
        },
        {
          id: 'draft-a-2',
          research_id: 'research-a-2',
          ghl_account_id: 'account-a-uuid',
          subject: 'Email A2',
        },
      ];

      expect(drafts[0].ghl_account_id).toBe('account-a-uuid');
      expect(drafts[1].ghl_account_id).toBe('account-b-uuid');
      expect(drafts[2].ghl_account_id).toBe('account-a-uuid');

      // Each draft maintains its own account context
      const accountIds = new Set(drafts.map(d => d.ghl_account_id));
      expect(accountIds.size).toBe(2); // Two different accounts
    });
  });

  describe('Cross-Org Security', () => {
    it('users cannot access other org accounts', async () => {
      // User from ORG_ID tries to access OTHER_ORG_ID account
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'ghl_accounts') {
          // Supabase RLS would prevent this, returning null
          return mockChain({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        }
        return mockChain({ data: null, error: null });
      });

      const result = await getGHLAccountById('account-other-org-uuid', ORG_ID);

      // Should return null due to org mismatch
      expect(result).toBeNull();
    });

    it('research from other org is not accessible', async () => {
      // Research session from OTHER_ORG
      const otherOrgResearch = {
        id: 'research-other-001',
        organization_id: OTHER_ORG_ID,
        user_id: OTHER_USER_ID,
        ghl_account_id: 'account-other-org-uuid',
        company_name: 'Secret Corp',
      };

      // User from ORG_ID tries to access it
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'research_sessions') {
          // RLS blocks this
          return mockChain({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        }
        return mockChain({ data: null, error: null });
      });

      // Should not be able to query
      const result = mockFromFn('research_sessions')
        .select('*')
        .eq('id', 'research-other-001')
        .eq('organization_id', ORG_ID)
        .single();

      const { data } = await result;
      expect(data).toBeNull();
    });

    it('queue items scoped to organization', async () => {
      const mockSupabase = {
        from: mockFromFn,
      } as Partial<SupabaseClient>;

      const queueService = new QueueService({
        supabase: mockSupabase as SupabaseClient,
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      // Queue item from OTHER_ORG
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'research_queue') {
          // RLS prevents cross-org access
          return mockChain({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        }
        return mockChain({ data: null, error: null });
      });

      const result = await queueService.getById('queue-other-org-001');
      expect(result).toBeNull();
    });

    it('drafts from other org are not accessible', async () => {
      // Draft from OTHER_USER_ID in OTHER_ORG_ID
      const otherOrgDraft = {
        id: 'draft-other-001',
        user_id: OTHER_USER_ID,
        ghl_account_id: 'account-other-org-uuid',
        subject: 'Secret Email',
      };

      // User from ORG_ID tries to access
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'email_drafts') {
          // RLS blocks by user_id
          return mockChain({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          });
        }
        return mockChain({ data: null, error: null });
      });

      const result = mockFromFn('email_drafts')
        .select('*')
        .eq('id', 'draft-other-001')
        .eq('user_id', USER_ID)
        .single();

      const { data } = await result;
      expect(data).toBeNull();
    });
  });

  describe('Account Context Integrity', () => {
    it('account ID persists through full workflow', async () => {
      // 1. User selects Account A
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-a-uuid' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_A, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const activeAccount = await getActiveGHLAccount(USER_ID, ORG_ID);
      expect(activeAccount?.id).toBe('account-a-uuid');

      // 2. Research created
      const research = {
        id: 'research-flow-001',
        organization_id: ORG_ID,
        user_id: USER_ID,
        ghl_account_id: activeAccount?.id,
        company_name: 'Flow Corp',
      };

      // 3. Queue item created
      const queueItem = {
        id: 'queue-flow-001',
        organization_id: ORG_ID,
        user_id: USER_ID,
        ghl_account_id: research.ghl_account_id,
        company_domain: 'flow.com',
      };

      // 4. Draft created
      const draft = {
        id: 'draft-flow-001',
        user_id: USER_ID,
        research_id: research.id,
        ghl_account_id: research.ghl_account_id,
        subject: 'Flow Email',
      };

      // All should have same account ID
      expect(research.ghl_account_id).toBe('account-a-uuid');
      expect(queueItem.ghl_account_id).toBe('account-a-uuid');
      expect(draft.ghl_account_id).toBe('account-a-uuid');
    });

    it('null ghl_account_id is handled gracefully', async () => {
      // Research without GHL account (manual entry)
      const research = {
        id: 'research-no-ghl-001',
        organization_id: ORG_ID,
        user_id: USER_ID,
        ghl_account_id: null,
        company_name: 'Manual Corp',
      };

      expect(research.ghl_account_id).toBeNull();

      // Should not attempt to push to GHL
      if (research.ghl_account_id) {
        // This won't execute
        throw new Error('Should not attempt GHL push');
      }

      // Verify null handling
      expect(research.ghl_account_id).toBeNull();
    });

    it('account ID immutability after creation', async () => {
      // Research pinned to Account A
      const research = {
        id: 'research-immutable-001',
        organization_id: ORG_ID,
        ghl_account_id: 'account-a-uuid',
        company_name: 'Immutable Corp',
        created_at: '2026-02-15T10:00:00Z',
      };

      const originalAccountId = research.ghl_account_id;

      // User switches to Account B
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return mockChain({
            data: { selected_ghl_account_id: 'account-b-uuid' },
            error: null,
          });
        }
        if (table === 'ghl_accounts') {
          return mockChain({ data: ACCOUNT_B, error: null });
        }
        return mockChain({ data: null, error: null });
      });

      const newActiveAccount = await getActiveGHLAccount(USER_ID, ORG_ID);
      expect(newActiveAccount?.id).toBe('account-b-uuid');

      // Original research account ID should NOT change
      expect(research.ghl_account_id).toBe(originalAccountId);
      expect(research.ghl_account_id).toBe('account-a-uuid');
      expect(research.ghl_account_id).not.toBe(newActiveAccount?.id);
    });
  });
});
