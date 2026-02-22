# Multi-GHL Account Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable organizations to manage multiple GoHighLevel accounts with global account switching and per-user "last used" persistence.

**Architecture:** New `ghl_accounts` table replacing single-account `ghl_config`, helper functions for account retrieval with fallback logic, global account selector in header, and Settings UI for account management.

**Tech Stack:** Next.js 14, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, React Server Components

---

## Task 1: Database Migration - Create Tables and Indexes

**Files:**
- Create: `lib/supabase/migrations/010_multi_ghl_accounts.sql`

**Step 1: Write migration SQL**

Create the migration file with table creation, indexes, RLS policies, and data migration:

```sql
-- lib/supabase/migrations/010_multi_ghl_accounts.sql

-- =============================================
-- MULTI-GHL ACCOUNTS MIGRATION
-- =============================================

-- 1. Create ghl_accounts table
CREATE TABLE IF NOT EXISTS ghl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  custom_field_mappings JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_primary ON ghl_accounts(organization_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_ghl_org ON ghl_accounts(organization_id);

-- 3. Create trigger for updated_at
CREATE TRIGGER update_ghl_accounts_updated_at
  BEFORE UPDATE ON ghl_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Enable RLS
ALTER TABLE ghl_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view org GHL accounts"
  ON ghl_accounts FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage GHL accounts"
  ON ghl_accounts FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 6. Migrate existing ghl_config data to ghl_accounts
INSERT INTO ghl_accounts (
  organization_id,
  account_name,
  location_id,
  location_name,
  access_token_encrypted,
  refresh_token_encrypted,
  token_expires_at,
  custom_field_mappings,
  sync_settings,
  is_primary,
  last_sync_at,
  created_at
)
SELECT
  organization_id,
  'Main Account' as account_name,
  location_id,
  location_name,
  access_token_encrypted,
  refresh_token_encrypted,
  token_expires_at,
  custom_field_mappings,
  sync_settings,
  true as is_primary,
  last_sync_at,
  created_at
FROM ghl_config
WHERE location_id IS NOT NULL AND location_id != '';

-- 7. Add selected_ghl_account_id to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS selected_ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

-- 8. Auto-select primary account for all existing users
UPDATE user_settings us
SET selected_ghl_account_id = (
  SELECT ga.id
  FROM ghl_accounts ga
  JOIN users u ON u.organization_id = ga.organization_id
  WHERE u.id = us.user_id AND ga.is_primary = true
  LIMIT 1
)
WHERE selected_ghl_account_id IS NULL;

-- 9. Add comment
COMMENT ON TABLE ghl_accounts IS 'Multiple GoHighLevel account configurations per organization';

-- Note: Keep ghl_config table for rollback safety - will drop in future migration
```

**Step 2: Test migration locally**

Run in Supabase SQL Editor (local):
```bash
# Copy migration SQL and run in local Supabase SQL Editor
# Verify tables created with: \dt ghl_accounts
```

**Step 3: Verify migration results**

```sql
-- Check that table was created
SELECT COUNT(*) FROM ghl_accounts;

-- Verify data migrated from ghl_config
SELECT account_name, location_id, is_primary FROM ghl_accounts;

-- Check user_settings column added
SELECT selected_ghl_account_id FROM user_settings LIMIT 1;
```

Expected: All existing ghl_config rows migrated with account_name = 'Main Account' and is_primary = true

**Step 4: Commit migration**

```bash
git add lib/supabase/migrations/010_multi_ghl_accounts.sql
git commit -m "feat(db): add multi-GHL accounts table and migration

- Create ghl_accounts table with RLS policies
- Migrate existing ghl_config data as 'Main Account'
- Add selected_ghl_account_id to user_settings
- Auto-select primary account for existing users"
```

---

## Task 2: Backend Helper - Get Active GHL Account

**Files:**
- Create: `lib/ghl/getActiveAccount.ts`
- Create: `lib/ghl/types.ts`

**Step 1: Write types for GHL accounts**

```typescript
// lib/ghl/types.ts

export interface GHLAccount {
  id: string;
  organization_id: string;
  account_name: string;
  location_id: string;
  location_name: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  custom_field_mappings: Record<string, unknown>;
  sync_settings: Record<string, unknown>;
  is_primary: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GHLAccountWithTokens extends GHLAccount {
  access_token: string | null; // Decrypted
  refresh_token: string | null; // Decrypted
}
```

**Step 2: Write helper to get primary account**

```typescript
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
 * Get a specific GHL account by ID
 */
export async function getGHLAccountById(
  accountId: string
): Promise<GHLAccountWithTokens | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ghl_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !data) {
    return null;
  }

  return decryptAccountTokens(data);
}

/**
 * Decrypt account tokens
 */
function decryptAccountTokens(account: GHLAccount): GHLAccountWithTokens {
  return {
    ...account,
    access_token: account.access_token_encrypted
      ? decryptApiKey(account.access_token_encrypted)
      : null,
    refresh_token: account.refresh_token_encrypted
      ? decryptApiKey(account.refresh_token_encrypted)
      : null,
  };
}
```

**Step 3: Write main helper to get active account**

```typescript
// lib/ghl/getActiveAccount.ts (continued)

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
    const account = await getGHLAccountById(userSettings.selected_ghl_account_id);

    // Verify account belongs to user's org
    if (account && account.organization_id === organizationId) {
      return account;
    }
  }

  // 3. Fallback to primary account
  return getPrimaryGHLAccount(organizationId);
}
```

**Step 4: Export all functions**

```typescript
// lib/ghl/index.ts

export * from './types';
export * from './getActiveAccount';
```

**Step 5: Commit helpers**

```bash
git add lib/ghl/
git commit -m "feat(lib): add GHL account retrieval helpers

- Add types for GHL accounts
- Add getPrimaryGHLAccount helper
- Add getGHLAccountById helper
- Add getActiveGHLAccount with fallback logic"
```

---

## Task 3: API Routes - List GHL Accounts

**Files:**
- Create: `app/api/ghl/accounts/route.ts`

**Step 1: Write GET endpoint to list accounts**

```typescript
// app/api/ghl/accounts/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
```

**Step 2: Test GET endpoint**

```bash
# Start dev server
npm run dev

# Test in browser or curl
curl http://localhost:3000/api/ghl/accounts
```

Expected: Returns array of GHL accounts (should have migrated "Main Account")

**Step 3: Commit GET endpoint**

```bash
git add app/api/ghl/accounts/route.ts
git commit -m "feat(api): add GET /api/ghl/accounts endpoint

Lists all GHL accounts for user's organization"
```

---

## Task 4: API Routes - Create GHL Account

**Files:**
- Modify: `app/api/ghl/accounts/route.ts`

**Step 1: Add POST endpoint**

```typescript
// app/api/ghl/accounts/route.ts (add after GET)

import { encryptApiKey, getKeyHint } from '@/lib/crypto';
import { createAdminClient } from '@/lib/supabase/server';

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

    // Check if user is admin or owner
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

    // Use admin client to insert (for encryption and bypassing RLS if needed)
    const adminClient = createAdminClient();

    // Create the account
    const { data: newAccount, error: insertError } = await adminClient
      .from('ghl_accounts')
      .insert({
        organization_id: userData.organization_id,
        account_name,
        location_id,
        access_token_encrypted: encryptedAccessToken,
        is_primary: isFirstAccount, // First account becomes primary
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
```

**Step 2: Test POST endpoint**

```bash
# Test creating account
curl -X POST http://localhost:3000/api/ghl/accounts \
  -H "Content-Type: application/json" \
  -d '{"account_name":"Test Account","location_id":"test123"}'
```

Expected: Returns created account with is_primary = false (if not first account)

**Step 3: Commit POST endpoint**

```bash
git add app/api/ghl/accounts/route.ts
git commit -m "feat(api): add POST /api/ghl/accounts endpoint

- Create new GHL account
- Auto-set first account as primary
- Encrypt access tokens
- Require admin/owner role"
```

---

## Task 5: API Routes - Update and Delete GHL Account

**Files:**
- Create: `app/api/ghl/accounts/[id]/route.ts`

**Step 1: Write PATCH endpoint**

```typescript
// app/api/ghl/accounts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const accountId = params.id;

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

    // Update the account
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
```

**Step 2: Write DELETE endpoint**

```typescript
// app/api/ghl/accounts/[id]/route.ts (add after PATCH)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const accountId = params.id;

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
      const oldestAccount = allAccounts
        .filter((a) => a.id !== accountId)
        .sort((a, b) => a.id.localeCompare(b.id))[0];

      if (oldestAccount) {
        await adminClient
          .from('ghl_accounts')
          .update({ is_primary: true })
          .eq('id', oldestAccount.id);
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
```

**Step 3: Test PATCH and DELETE**

```bash
# Test updating account name
curl -X PATCH http://localhost:3000/api/ghl/accounts/{id} \
  -H "Content-Type: application/json" \
  -d '{"account_name":"Updated Name"}'

# Test deleting account (should fail if only one)
curl -X DELETE http://localhost:3000/api/ghl/accounts/{id}
```

**Step 4: Commit update/delete endpoints**

```bash
git add app/api/ghl/accounts/[id]/route.ts
git commit -m "feat(api): add PATCH/DELETE /api/ghl/accounts/[id]

- Update account name, location_id, or set as primary
- Delete account with primary promotion logic
- Prevent deleting last account"
```

---

## Task 6: API Routes - Select GHL Account

**Files:**
- Create: `app/api/ghl/accounts/select/route.ts`

**Step 1: Write POST endpoint to set selected account**

```typescript
// app/api/ghl/accounts/select/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
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

    // Update user_settings with selected account
    const { error: updateError } = await adminClient
      .from('user_settings')
      .update({ selected_ghl_account_id: account_id })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[GHL Select API] Error updating user settings:', updateError);
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
```

**Step 2: Test select endpoint**

```bash
curl -X POST http://localhost:3000/api/ghl/accounts/select \
  -H "Content-Type: application/json" \
  -d '{"account_id":"uuid-here"}'
```

Expected: Updates user_settings.selected_ghl_account_id

**Step 3: Commit select endpoint**

```bash
git add app/api/ghl/accounts/select/route.ts
git commit -m "feat(api): add POST /api/ghl/accounts/select

Updates user's selected GHL account in user_settings"
```

---

## Task 7: Update Existing GHL Routes - Companies Route

**Files:**
- Modify: `app/api/ghl/companies/route.ts`

**Step 1: Import getActiveGHLAccount helper**

```typescript
// app/api/ghl/companies/route.ts (top of file)

import { getActiveGHLAccount } from '@/lib/ghl';
```

**Step 2: Replace GHL config fetch with active account**

Find the section that fetches GHL config (around lines 86-115) and replace with:

```typescript
// OLD CODE (remove):
// const { data: ghlConfig } = await adminClient
//   .from('ghl_config')
//   .select('*')
//   .eq('organization_id', organizationId)
//   .single();

// NEW CODE:
const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

if (!ghlAccount?.location_id) {
  return NextResponse.json(
    { error: 'GHL not configured. Please add a GHL account in Settings.' },
    { status: 400 }
  );
}

const locationId = ghlAccount.location_id;

// Check if access token exists
if (!ghlAccount.access_token) {
  return NextResponse.json(
    { error: 'GHL access token not configured. Please update your GHL account in Settings.' },
    { status: 400 }
  );
}

const ghlApiKey = ghlAccount.access_token;
```

**Step 3: Update GHL API key references**

Find all references to `ghlApiKey` and ensure they use the new variable from step 2.

Remove these lines (no longer needed):
```typescript
// DELETE:
// const ghlApiKey = decryptApiKey(apiKeyData.encrypted_key);
// const locationId = ghlConfig.location_id.trim();
```

**Step 4: Test companies route**

```bash
# Start dev server
npm run dev

# Test fetching companies
curl http://localhost:3000/api/ghl/companies?limit=10
```

Expected: Returns companies from the selected GHL account

**Step 5: Commit companies route update**

```bash
git add app/api/ghl/companies/route.ts
git commit -m "refactor(api): update companies route to use active GHL account

Use getActiveGHLAccount helper instead of direct ghl_config fetch"
```

---

## Task 8: Update Existing GHL Routes - Push Route

**Files:**
- Modify: `app/api/ghl/push/route.ts`

**Step 1: Import helper and update GHL config fetch**

```typescript
// app/api/ghl/push/route.ts (at top)

import { getActiveGHLAccount } from '@/lib/ghl';
```

**Step 2: Replace GHL config fetch**

Find the GHL config fetch section and replace with:

```typescript
// Replace old ghl_config fetch with:
const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

if (!ghlAccount?.location_id || !ghlAccount.access_token) {
  return NextResponse.json(
    { error: 'GHL account not configured' },
    { status: 400 }
  );
}

const ghlApiKey = ghlAccount.access_token;
const locationId = ghlAccount.location_id;
```

**Step 3: Test push route**

```bash
# Test pushing research to GHL (need valid research_id and company_id)
curl -X POST http://localhost:3000/api/ghl/push \
  -H "Content-Type: application/json" \
  -d '{"research_id":"uuid","company_id":"ghl-company-id"}'
```

**Step 4: Commit push route update**

```bash
git add app/api/ghl/push/route.ts
git commit -m "refactor(api): update push route to use active GHL account"
```

---

## Task 9: Update Existing GHL Routes - Contacts Route

**Files:**
- Modify: `app/api/ghl/contacts/route.ts`

**Step 1: Import helper and update**

```typescript
// app/api/ghl/contacts/route.ts (at top)

import { getActiveGHLAccount } from '@/lib/ghl';
```

**Step 2: Replace GHL config fetch**

```typescript
// Replace old ghl_config fetch with:
const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

if (!ghlAccount?.location_id || !ghlAccount.access_token) {
  return NextResponse.json(
    { error: 'GHL account not configured' },
    { status: 400 }
  );
}

const ghlApiKey = ghlAccount.access_token;
const locationId = ghlAccount.location_id;
```

**Step 3: Commit contacts route update**

```bash
git add app/api/ghl/contacts/route.ts
git commit -m "refactor(api): update contacts route to use active GHL account"
```

---

## Task 10: UI Component - GHL Account Selector

**Files:**
- Create: `components/ghl/GHLAccountSelector.tsx`

**Step 1: Write account selector component**

```typescript
// components/ghl/GHLAccountSelector.tsx

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';

interface GHLAccount {
  id: string;
  account_name: string;
  location_id: string;
  is_primary: boolean;
}

export function GHLAccountSelector() {
  const [accounts, setAccounts] = useState<GHLAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GHLAccount | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      setLoading(true);
      const res = await fetch('/api/ghl/accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');

      const data = await res.json();
      setAccounts(data.accounts || []);

      // Auto-select primary or first account
      const primary = data.accounts?.find((a: GHLAccount) => a.is_primary);
      setSelectedAccount(primary || data.accounts?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch GHL accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectAccount(account: GHLAccount) {
    try {
      // Update selection on server
      const res = await fetch('/api/ghl/accounts/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      });

      if (!res.ok) throw new Error('Failed to update selection');

      // Update local state
      setSelectedAccount(account);
      setIsOpen(false);

      // Reload page to fetch data from new account
      window.location.reload();
    } catch (error) {
      console.error('Failed to select account:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg animate-pulse">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <a
        href="/settings"
        className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <Building2 className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">Add GHL Account</span>
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-w-[180px]"
      >
        <Building2 className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-700 flex-1 text-left truncate">
          {selectedAccount?.account_name || 'Select Account'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                >
                  <Check
                    className={`w-4 h-4 flex-shrink-0 ${
                      selectedAccount?.id === account.id
                        ? 'text-teal-600'
                        : 'text-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {account.account_name}
                      </span>
                      {account.is_primary && (
                        <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 truncate block">
                      {account.location_id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-2">
              <a
                href="/settings"
                className="block w-full px-3 py-2 text-sm text-center text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
              >
                Manage Accounts
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Export component**

```typescript
// components/ghl/index.ts

export { GHLAccountSelector } from './GHLAccountSelector';
```

**Step 3: Commit component**

```bash
git add components/ghl/
git commit -m "feat(ui): add GHL account selector component

- Dropdown to switch between GHL accounts
- Shows primary badge
- Auto-selects primary account
- Reloads page on switch"
```

---

## Task 11: Integrate Account Selector in Sidebar

**Files:**
- Modify: `components/ui/Sidebar.tsx`

**Step 1: Import GHL account selector**

```typescript
// components/ui/Sidebar.tsx (at top)

import { GHLAccountSelector } from '@/components/ghl';
```

**Step 2: Add selector to desktop sidebar**

Find the credits widget section (around line 97) and add the account selector above it:

```typescript
// Add before the credits widget:

      {/* GHL Account Selector */}
      <div className="p-4 border-t border-slate-100">
        <GHLAccountSelector />
      </div>

      {/* Credits Widget */}
      <div className="p-4 border-t border-slate-100">
        ...
```

**Step 3: Test sidebar integration**

```bash
npm run dev
# Navigate to /dashboard and verify selector appears in sidebar
```

Expected: GHL account selector appears above credits widget

**Step 4: Commit sidebar integration**

```bash
git add components/ui/Sidebar.tsx
git commit -m "feat(ui): integrate GHL account selector in sidebar

Add account selector above credits widget in desktop sidebar"
```

---

## Task 12: Settings Page - GHL Account Management UI

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`
- Create: `components/settings/GHLAccountsSection.tsx`

**Step 1: Create GHL accounts section component**

```typescript
// components/settings/GHLAccountsSection.tsx

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Star, StarOff, Edit2, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface GHLAccount {
  id: string;
  account_name: string;
  location_id: string;
  location_name: string | null;
  is_primary: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export function GHLAccountsSection() {
  const [accounts, setAccounts] = useState<GHLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [accountName, setAccountName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      setLoading(true);
      const res = await fetch('/api/ghl/accounts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount() {
    try {
      const res = await fetch('/api/ghl/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: accountName, location_id: locationId }),
      });

      if (!res.ok) throw new Error('Failed to create account');

      // Reset form and refresh
      setAccountName('');
      setLocationId('');
      setShowAddForm(false);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to add account:', error);
      alert('Failed to add account. Please check your inputs.');
    }
  }

  async function handleUpdateName(id: string) {
    try {
      const res = await fetch(`/api/ghl/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_name: editName }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setEditingId(null);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      const res = await fetch(`/api/ghl/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      });

      if (!res.ok) throw new Error('Failed to set primary');
      fetchAccounts();
    } catch (error) {
      console.error('Failed to set primary:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const res = await fetch(`/api/ghl/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete account');
    }
  }

  if (loading) {
    return <Card><div className="p-6">Loading accounts...</div></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">GHL Accounts</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage your GoHighLevel account connections
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <Card padding="md">
          <div className="space-y-4">
            <Input
              label="Account Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Main Account, Client XYZ"
            />
            <Input
              label="Location ID"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="abc123xyz789"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleAddAccount}
                disabled={!accountName || !locationId}
              >
                Save Account
              </Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-slate-500 text-center py-8">
            No GHL accounts connected. Add your first account to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id} padding="md">
              <div className="flex items-center gap-4">
                {/* Primary Star */}
                <button
                  onClick={() => !account.is_primary && handleSetPrimary(account.id)}
                  className={`flex-shrink-0 ${
                    account.is_primary ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'
                  }`}
                  title={account.is_primary ? 'Primary account' : 'Set as primary'}
                >
                  {account.is_primary ? (
                    <Star className="w-5 h-5 fill-current" />
                  ) : (
                    <StarOff className="w-5 h-5" />
                  )}
                </button>

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  {editingId === account.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                      />
                      <button
                        onClick={() => handleUpdateName(account.id)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:bg-slate-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">
                          {account.account_name}
                        </h4>
                        {account.is_primary && (
                          <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Location ID: {account.location_id}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editingId !== account.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(account.id);
                        setEditName(account.account_name);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      disabled={accounts.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Integrate in settings page**

Find the settings page and add the GHL accounts section:

```typescript
// app/(dashboard)/settings/page.tsx

import { GHLAccountsSection } from '@/components/settings/GHLAccountsSection';

// Add in the page component where GHL config was shown:

<GHLAccountsSection />
```

**Step 3: Test settings UI**

```bash
npm run dev
# Navigate to /settings
# Test: Add account, edit name, set primary, delete account
```

**Step 4: Commit settings UI**

```bash
git add components/settings/GHLAccountsSection.tsx app/(dashboard)/settings/page.tsx
git commit -m "feat(ui): add GHL account management in Settings

- List all GHL accounts with primary indicator
- Add new accounts with name + location ID
- Edit account names inline
- Set account as primary
- Delete accounts (with prevention of last account deletion)"
```

---

## Task 13: Testing & Validation

**Files:**
- Create: `__tests__/lib/ghl/getActiveAccount.test.ts`

**Step 1: Write tests for getActiveGHLAccount**

```typescript
// __tests__/lib/ghl/getActiveAccount.test.ts

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getActiveGHLAccount, getPrimaryGHLAccount, getGHLAccountById } from '@/lib/ghl/getActiveAccount';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData[table], error: null })),
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockData[table], error: null })),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/crypto', () => ({
  decryptApiKey: jest.fn((key: string) => key.replace('encrypted_', '')),
}));

const mockData: Record<string, any> = {};

describe('getActiveGHLAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return selected account if user has one', async () => {
    mockData.user_settings = { selected_ghl_account_id: 'account-1' };
    mockData.ghl_accounts = {
      id: 'account-1',
      organization_id: 'org-1',
      account_name: 'Selected Account',
      location_id: 'loc-123',
      access_token_encrypted: 'encrypted_token',
    };

    const result = await getActiveGHLAccount('user-1', 'org-1');
    expect(result?.account_name).toBe('Selected Account');
  });

  it('should fallback to primary account if selected account not found', async () => {
    mockData.user_settings = { selected_ghl_account_id: null };
    mockData.ghl_accounts = {
      id: 'primary-1',
      organization_id: 'org-1',
      account_name: 'Primary Account',
      is_primary: true,
    };

    const result = await getActiveGHLAccount('user-1', 'org-1');
    expect(result?.account_name).toBe('Primary Account');
  });
});
```

**Step 2: Run tests**

```bash
npm test -- getActiveAccount
```

Expected: All tests pass

**Step 3: Commit tests**

```bash
git add __tests__/lib/ghl/
git commit -m "test: add tests for getActiveGHLAccount helper"
```

---

## Task 14: Documentation & Cleanup

**Files:**
- Create: `docs/GHL_MULTI_ACCOUNT_GUIDE.md`
- Modify: `README.md`

**Step 1: Write user guide**

```markdown
<!-- docs/GHL_MULTI_ACCOUNT_GUIDE.md -->

# Multi-GHL Account Guide

## Overview

Revify Outreach supports multiple GoHighLevel accounts per organization. This allows you to:
- Manage multiple client accounts
- Separate production and testing environments
- Switch between accounts seamlessly

## Setup

### Adding Your First Account

1. Navigate to **Settings** → **GHL Accounts**
2. Click **Add Account**
3. Enter:
   - **Account Name**: Friendly name (e.g., "Main Account", "Client XYZ")
   - **Location ID**: Your GHL location ID
4. Click **Save Account**

Your first account automatically becomes the **Primary** account.

### Adding Additional Accounts

Repeat the process above. You can add up to 5 accounts per organization.

## Using Accounts

### Switching Accounts

Use the **GHL Account Selector** in the sidebar to switch between accounts.

When you switch accounts:
- All features (Research, Bulk, Email) use the selected account
- Your selection is remembered for next time
- The page reloads to fetch data from the new account

### Primary Account

The **Primary** account is used as the default when:
- No account has been selected yet
- Your previously selected account is deleted

To set an account as primary:
1. Go to **Settings** → **GHL Accounts**
2. Click the **star icon** next to the account

### Managing Accounts

**Edit Account Name:**
- Click the edit icon next to the account
- Update the name and click the checkmark

**Delete Account:**
- Click the trash icon next to the account
- Confirm deletion
- Note: Cannot delete the only remaining account

## Migration

Existing single-account configurations are automatically migrated to "Main Account" with primary status.
```

**Step 2: Update README with multi-account info**

Add to README.md:

```markdown
## Features

- Multiple GHL account support per organization
- Global account switching with persistence
- ...
```

**Step 3: Commit documentation**

```bash
git add docs/GHL_MULTI_ACCOUNT_GUIDE.md README.md
git commit -m "docs: add multi-GHL account user guide"
```

---

## Task 15: Final Integration Testing

**Step 1: Test complete flow end-to-end**

Manual testing checklist:
- [ ] Run migration on local database
- [ ] Verify existing account migrated as "Main Account"
- [ ] Add a second GHL account via Settings
- [ ] Switch accounts using sidebar selector
- [ ] Verify Research page uses selected account
- [ ] Verify Bulk page uses selected account
- [ ] Delete non-primary account (should work)
- [ ] Try to delete last account (should fail)
- [ ] Set different account as primary
- [ ] Log out and back in (should remember last used account)

**Step 2: Run all tests**

```bash
npm test
npm run build
```

Expected: All tests pass, build succeeds

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-GHL account support

Full implementation including:
- Database migration from single to multi-account
- Backend helpers with fallback logic
- API routes for account CRUD and selection
- UI components for account selector and management
- Settings page integration
- Updated existing GHL routes
- Tests and documentation

Breaking changes: None (backward compatible via migration)"
```

---

## Deployment Checklist

- [ ] Merge to main branch
- [ ] Run database migration on staging
- [ ] Test on staging environment
- [ ] Run migration on production
- [ ] Monitor for errors in first 24 hours
- [ ] After 1 week of stability, can drop `ghl_config` table

---

## Rollback Plan

If critical issues found after deployment:

1. Revert code to previous commit
2. Drop `ghl_accounts` table: `DROP TABLE ghl_accounts;`
3. Remove column: `ALTER TABLE user_settings DROP COLUMN selected_ghl_account_id;`
4. Code will fall back to `ghl_config` table (still exists)
