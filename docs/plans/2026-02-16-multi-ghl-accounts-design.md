# Multi-GHL Account Support Design

**Date:** 2026-02-16
**Status:** Approved
**Author:** Claude + Mervin

## Overview

Enable organizations to connect and manage multiple GoHighLevel (GHL) accounts, with a global account selector that remembers the last used account per user.

## Requirements

- **Ownership:** Organization-level shared accounts (all users see all accounts)
- **Scale:** 2-5 accounts per organization with simple naming
- **Switching:** Global account selector in header (affects all features)
- **Default:** Remember last used account per user
- **Migration:** Automatically migrate existing single GHL account as "Main Account"

## Database Schema

### New Table: `ghl_accounts`

```sql
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

-- Only one primary account per org
CREATE UNIQUE INDEX idx_ghl_primary ON ghl_accounts(organization_id)
  WHERE is_primary = true;

-- Index for lookups
CREATE INDEX idx_ghl_org ON ghl_accounts(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_ghl_accounts_updated_at
  BEFORE UPDATE ON ghl_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Update: `user_settings`

```sql
ALTER TABLE user_settings
  ADD COLUMN selected_ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
```

### RLS Policies

```sql
-- Users can view org GHL accounts
CREATE POLICY "Users can view org GHL accounts"
  ON ghl_accounts FOR SELECT
  USING (organization_id = get_user_org_id());

-- Admins can manage GHL accounts
CREATE POLICY "Admins can manage GHL accounts"
  ON ghl_accounts FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

## UI Components

### 1. Header Account Selector

**Component:** `<GHLAccountSelector />`
**Location:** Global header/navigation (next to user menu)

**Features:**
- Shows current account name + dropdown icon
- Dropdown lists all org GHL accounts
- Clicking account switches globally
- Empty state: "No GHL accounts - Add one in Settings"
- Auto-selects last used or primary account on load

**Behavior:**
- On switch: POST to `/api/ghl/accounts/select` with account_id
- Updates `user_settings.selected_ghl_account_id`
- Reloads current page to reflect new account

### 2. Settings Page - GHL Section

**Layout:** Card-based list of accounts

**Each Account Card Shows:**
- Account name (editable inline or via modal)
- Location ID
- Location name (fetched from GHL)
- Last synced timestamp
- "Primary" badge if is_primary = true
- Actions: Edit, Delete, Set as Primary

**Add Account Flow:**
1. Click "Add GHL Account" button
2. Modal/form opens with:
   - Account name input (required)
   - Location ID input (required)
   - Test Connection button (validates with GHL API)
   - Save button
3. On save: POST to `/api/ghl/accounts`
4. First account auto-becomes primary

## API Routes

### New Routes

**GET `/api/ghl/accounts`**
- Returns all GHL accounts for user's organization
- Response: `{ accounts: Array<{ id, account_name, location_id, location_name, is_primary, last_sync_at }> }`
- Excludes encrypted tokens

**POST `/api/ghl/accounts`**
- Creates new GHL account
- Body: `{ account_name, location_id, access_token? }`
- Validates location_id with GHL API
- Encrypts tokens before storing
- If first account, sets is_primary = true

**PATCH `/api/ghl/accounts/:id`**
- Updates account (name, location_id, or set as primary)
- Body: `{ account_name?, location_id?, is_primary? }`
- If setting as primary, unsets other primary accounts

**DELETE `/api/ghl/accounts/:id`**
- Deletes account
- Cannot delete if it's the only account
- If deleting primary, auto-promotes oldest account to primary
- Updates users who had this selected to use primary

**POST `/api/ghl/accounts/select`**
- Sets selected account for current user
- Body: `{ account_id }`
- Updates `user_settings.selected_ghl_account_id`

### Updated Routes

All routes that fetch GHL config must use the helper function:

```typescript
// lib/ghl/getActiveAccount.ts
export async function getActiveGHLAccount(userId: string, orgId: string) {
  // 1. Get user's selected account
  const userSettings = await getUserSettings(userId);

  // 2. If selected account exists and belongs to org, use it
  if (userSettings.selected_ghl_account_id) {
    const account = await getGHLAccount(userSettings.selected_ghl_account_id);
    if (account?.organization_id === orgId) return account;
  }

  // 3. Fallback to primary account
  return await getPrimaryGHLAccount(orgId);
}
```

**Routes to Update:**
- `/api/ghl/companies/route.ts` - Fetch companies from active account
- `/api/ghl/push/route.ts` - Push research to active account
- `/api/ghl/contacts/route.ts` - Fetch contacts from active account
- `/api/research/route.ts` - Use active account for GHL sync

## Migration Strategy

**File:** `lib/supabase/migrations/010_multi_ghl_accounts.sql`

```sql
-- 1. Create new table
CREATE TABLE IF NOT EXISTS ghl_accounts (...);

-- 2. Migrate existing ghl_config data
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

-- 3. Add column to user_settings
ALTER TABLE user_settings
  ADD COLUMN selected_ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

-- 4. Auto-select primary account for all existing users
UPDATE user_settings us
SET selected_ghl_account_id = (
  SELECT ga.id
  FROM ghl_accounts ga
  JOIN users u ON u.organization_id = ga.organization_id
  WHERE u.id = us.user_id AND ga.is_primary = true
  LIMIT 1
);

-- 5. Keep ghl_config for rollback safety (drop in future migration)
-- DROP TABLE ghl_config; -- Execute this later after validation
```

## Error Handling

### No Accounts Configured
- Account selector shows: "No GHL accounts"
- Clicking it redirects to Settings with prompt: "Add your first GHL account"

### Selected Account Deleted
- Auto-fallback to primary account
- Show toast: "Account switched to [Primary Account Name]"
- Update user_settings.selected_ghl_account_id

### API Key Invalid
- Show error banner: "GHL authentication failed for [Account Name]"
- Don't auto-switch (let user fix credentials or manually switch)
- Log error in api_logs table

### Primary Account Deleted
- Automatically promote oldest remaining account to primary
- Update all users who had old primary selected
- Show toast to affected users: "Primary account changed to [New Primary]"

### No Primary Account (Edge Case)
- On app load, if no primary found, promote first account
- Ensures always at least one primary per org

## Data Flow

1. **User logs in:**
   - Frontend fetches user_settings including selected_ghl_account_id
   - If null, fetch primary account and auto-select it
   - Store in React context/state

2. **User switches account:**
   - POST to `/api/ghl/accounts/select` with new account_id
   - Backend updates user_settings
   - Frontend updates context/state
   - Reload current page to fetch data from new account

3. **API routes:**
   - All GHL-related routes call `getActiveGHLAccount(userId, orgId)`
   - Use returned account for GHL API calls
   - If no account found, return 400 error with prompt to configure

## Testing Checklist

- [ ] Database migration runs successfully on local dev
- [ ] Existing ghl_config data migrates to ghl_accounts with is_primary = true
- [ ] User settings auto-populate with primary account
- [ ] Can create new GHL account via Settings
- [ ] Can edit account name
- [ ] Can set different account as primary (unsets previous primary)
- [ ] Can delete account (not allowed if only one)
- [ ] Account selector dropdown shows all accounts
- [ ] Switching accounts persists across page reloads
- [ ] "Last used" account remembered on next login
- [ ] All GHL API routes use active account
- [ ] Error handling works for missing/deleted accounts
- [ ] RLS policies prevent cross-org access

## Implementation Order

1. **Database Layer**
   - Create migration file
   - Test migration locally
   - Validate data migrated correctly

2. **Backend Helpers**
   - Create `lib/ghl/getActiveAccount.ts`
   - Create `lib/ghl/accounts.ts` (CRUD functions)

3. **API Routes**
   - Implement `/api/ghl/accounts` (GET, POST, PATCH, DELETE)
   - Implement `/api/ghl/accounts/select` (POST)
   - Update existing GHL routes to use `getActiveGHLAccount()`

4. **UI Components**
   - Create `<GHLAccountSelector />` component
   - Add to header/layout
   - Update Settings page with account management UI

5. **Testing**
   - Test all flows end-to-end
   - Test error scenarios
   - Test migration on staging

6. **Deployment**
   - Run migration on production
   - Monitor for errors
   - Validate existing customers' accounts migrated

## Rollback Plan

- `ghl_config` table kept temporarily after migration
- If critical issues found:
  1. Revert code to read from `ghl_config`
  2. Drop `ghl_accounts` table
  3. Remove `selected_ghl_account_id` column
- After 1-2 weeks of stability, drop `ghl_config` table

## Success Criteria

✅ Users can add multiple GHL accounts in Settings
✅ Global account selector in header works smoothly
✅ Last used account persists across sessions
✅ All GHL features (companies, push, contacts) use selected account
✅ Migration completes without data loss
✅ No breaking changes for existing single-account users
