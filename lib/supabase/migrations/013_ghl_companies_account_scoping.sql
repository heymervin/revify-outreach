-- =============================================
-- GHL COMPANIES: Add account scoping
-- =============================================
-- Different GHL accounts in the same org can have companies with the
-- same ghl_id. Add ghl_account_id to prevent cross-account collisions.

-- 1. Add ghl_account_id column (nullable initially for migration)
ALTER TABLE ghl_companies
  ADD COLUMN IF NOT EXISTS ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE CASCADE;

-- 2. Backfill: set ghl_account_id to the org's primary account
UPDATE ghl_companies gc
SET ghl_account_id = (
  SELECT ga.id
  FROM ghl_accounts ga
  WHERE ga.organization_id = gc.organization_id
    AND ga.is_primary = true
  LIMIT 1
)
WHERE gc.ghl_account_id IS NULL;

-- 3. Drop old unique constraint and create new one with account scoping
ALTER TABLE ghl_companies
  DROP CONSTRAINT IF EXISTS ghl_companies_organization_id_ghl_id_key;

ALTER TABLE ghl_companies
  ADD CONSTRAINT ghl_companies_org_account_ghl_id_key
  UNIQUE (organization_id, ghl_account_id, ghl_id);

-- 4. Add index for account-scoped queries
CREATE INDEX IF NOT EXISTS idx_ghl_companies_account
  ON ghl_companies(ghl_account_id);

-- 5. Comment
COMMENT ON COLUMN ghl_companies.ghl_account_id IS 'The GHL account this company was synced from';
