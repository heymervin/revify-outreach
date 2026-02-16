-- =============================================
-- CONSOLIDATED MIGRATION: Multi-GHL Accounts (SAFE VERSION)
-- Skips tables that don't exist yet
-- =============================================

-- =============================================
-- MIGRATION 1: Create ghl_accounts table
-- =============================================

-- 1. Create ghl_accounts table
CREATE TABLE IF NOT EXISTS ghl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL CHECK (length(trim(account_name)) > 0),
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
DROP TRIGGER IF EXISTS update_ghl_accounts_updated_at ON ghl_accounts;
CREATE TRIGGER update_ghl_accounts_updated_at
  BEFORE UPDATE ON ghl_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Enable RLS
ALTER TABLE ghl_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Users can view org GHL accounts" ON ghl_accounts;
DROP POLICY IF EXISTS "Admins can insert GHL accounts" ON ghl_accounts;
DROP POLICY IF EXISTS "Admins can modify GHL accounts" ON ghl_accounts;
DROP POLICY IF EXISTS "Admins can delete GHL accounts" ON ghl_accounts;

CREATE POLICY "Users can view org GHL accounts"
  ON ghl_accounts FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can insert GHL accounts"
  ON ghl_accounts FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can modify GHL accounts"
  ON ghl_accounts FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete GHL accounts"
  ON ghl_accounts FOR DELETE
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 6. Migrate existing ghl_config data to ghl_accounts (if ghl_config exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ghl_config') THEN
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
      gc.organization_id,
      'Main Account' as account_name,
      gc.location_id,
      gc.location_name,
      gc.access_token_encrypted,
      gc.refresh_token_encrypted,
      gc.token_expires_at,
      gc.custom_field_mappings,
      gc.sync_settings,
      true as is_primary,
      gc.last_sync_at,
      gc.created_at
    FROM ghl_config gc
    WHERE gc.location_id IS NOT NULL AND gc.location_id != ''
      AND NOT EXISTS (
        SELECT 1 FROM ghl_accounts ga
        WHERE ga.organization_id = gc.organization_id
          AND ga.location_id = gc.location_id
      );
  END IF;
END $$;

-- 7. Add selected_ghl_account_id to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings'
    AND column_name = 'selected_ghl_account_id'
  ) THEN
    ALTER TABLE user_settings
      ADD COLUMN selected_ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- =============================================
-- MIGRATION 2: Sync Jobs Account Pinning (SKIP IF TABLE MISSING)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ghl_sync_jobs') THEN
    -- Add column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ghl_sync_jobs' AND column_name = 'ghl_account_id'
    ) THEN
      ALTER TABLE ghl_sync_jobs
        ADD COLUMN ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
    END IF;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_account ON ghl_sync_jobs(ghl_account_id);

    -- Backfill
    UPDATE ghl_sync_jobs sj
    SET ghl_account_id = (
      SELECT ga.id
      FROM ghl_accounts ga
      WHERE ga.organization_id = sj.organization_id
        AND ga.is_primary = true
      LIMIT 1
    )
    WHERE sj.ghl_account_id IS NULL;
  END IF;
END $$;

-- =============================================
-- MIGRATION 3: Set Primary GHL Account RPC
-- =============================================

CREATE OR REPLACE FUNCTION set_primary_ghl_account(
  p_account_id UUID,
  p_organization_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ghl_accounts
  SET is_primary = (id = p_account_id)
  WHERE organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No GHL accounts found for organization %', p_organization_id;
  END IF;
END;
$$;

-- =============================================
-- MIGRATION 4: GHL Companies Account Scoping (SKIP IF TABLE MISSING)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ghl_companies') THEN
    -- Add column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ghl_companies' AND column_name = 'ghl_account_id'
    ) THEN
      ALTER TABLE ghl_companies
        ADD COLUMN ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE CASCADE;
    END IF;

    -- Backfill
    UPDATE ghl_companies gc
    SET ghl_account_id = (
      SELECT ga.id
      FROM ghl_accounts ga
      WHERE ga.organization_id = gc.organization_id
        AND ga.is_primary = true
      LIMIT 1
    )
    WHERE gc.ghl_account_id IS NULL;

    -- Drop old constraint and add new one
    ALTER TABLE ghl_companies
      DROP CONSTRAINT IF EXISTS ghl_companies_organization_id_ghl_id_key;

    ALTER TABLE ghl_companies
      ADD CONSTRAINT ghl_companies_org_account_ghl_id_key
      UNIQUE (organization_id, ghl_account_id, ghl_id);

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_ghl_companies_account
      ON ghl_companies(ghl_account_id);
  END IF;
END $$;

-- =============================================
-- MIGRATION 5: Account Pinning Core Tables (SKIP IF TABLES MISSING)
-- =============================================

-- research_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'research_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'research_sessions' AND column_name = 'ghl_account_id'
    ) THEN
      ALTER TABLE research_sessions
        ADD COLUMN ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_research_sessions_ghl_account
      ON research_sessions(ghl_account_id);

    UPDATE research_sessions rs
    SET ghl_account_id = (
      SELECT ga.id FROM ghl_accounts ga
      WHERE ga.organization_id = rs.organization_id AND ga.is_primary = true
      LIMIT 1
    )
    WHERE rs.ghl_account_id IS NULL;
  END IF;
END $$;

-- email_drafts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_drafts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'email_drafts' AND column_name = 'ghl_account_id'
    ) THEN
      ALTER TABLE email_drafts
        ADD COLUMN ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_email_drafts_ghl_account
      ON email_drafts(ghl_account_id);

    UPDATE email_drafts ed
    SET ghl_account_id = COALESCE(
      (SELECT rs.ghl_account_id FROM research_sessions rs WHERE rs.id = ed.research_id),
      (
        SELECT ga.id FROM ghl_accounts ga
        JOIN users u ON u.organization_id = ga.organization_id
        WHERE u.id = ed.user_id AND ga.is_primary = true
        LIMIT 1
      )
    )
    WHERE ed.ghl_account_id IS NULL;
  END IF;
END $$;

-- research_queue
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'research_queue') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'research_queue' AND column_name = 'ghl_account_id'
    ) THEN
      ALTER TABLE research_queue
        ADD COLUMN ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_research_queue_ghl_account
      ON research_queue(ghl_account_id);

    UPDATE research_queue rq
    SET ghl_account_id = (
      SELECT ga.id FROM ghl_accounts ga
      WHERE ga.organization_id = rq.organization_id AND ga.is_primary = true
      LIMIT 1
    )
    WHERE rq.ghl_account_id IS NULL;
  END IF;
END $$;

-- =============================================
-- DONE! Migrations completed (skipped tables that don't exist).
-- =============================================
