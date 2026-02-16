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
