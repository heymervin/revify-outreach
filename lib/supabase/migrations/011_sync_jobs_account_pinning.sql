-- Migration: 011_sync_jobs_account_pinning.sql
-- Pin GHL account to sync jobs so background processing uses the correct account

-- Add ghl_account_id column to sync jobs
ALTER TABLE ghl_sync_jobs
  ADD COLUMN IF NOT EXISTS ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

-- Index for finding jobs by account
CREATE INDEX IF NOT EXISTS idx_sync_jobs_account ON ghl_sync_jobs(ghl_account_id);

-- Backfill existing jobs with primary account (best-effort)
UPDATE ghl_sync_jobs sj
SET ghl_account_id = (
  SELECT ga.id
  FROM ghl_accounts ga
  WHERE ga.organization_id = sj.organization_id
    AND ga.is_primary = true
  LIMIT 1
)
WHERE sj.ghl_account_id IS NULL;

COMMENT ON COLUMN ghl_sync_jobs.ghl_account_id IS 'Pinned GHL account at job creation time - background processing uses this instead of dynamic resolution';
