-- =============================================
-- ACCOUNT PINNING: Add ghl_account_id to core tables
-- =============================================
-- Tracks which GHL account each operation was initiated from,
-- preventing cross-account data contamination when users switch accounts.

-- 1. research_sessions
ALTER TABLE research_sessions
  ADD COLUMN IF NOT EXISTS ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_research_sessions_ghl_account
  ON research_sessions(ghl_account_id);

-- Backfill: set to org's primary account
UPDATE research_sessions rs
SET ghl_account_id = (
  SELECT ga.id FROM ghl_accounts ga
  WHERE ga.organization_id = rs.organization_id AND ga.is_primary = true
  LIMIT 1
)
WHERE rs.ghl_account_id IS NULL;

-- 2. email_drafts
ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_drafts_ghl_account
  ON email_drafts(ghl_account_id);

-- Backfill: derive from the research session's account, or user's org primary
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

-- 3. research_queue
ALTER TABLE research_queue
  ADD COLUMN IF NOT EXISTS ghl_account_id UUID REFERENCES ghl_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_research_queue_ghl_account
  ON research_queue(ghl_account_id);

-- Backfill: set to org's primary account
UPDATE research_queue rq
SET ghl_account_id = (
  SELECT ga.id FROM ghl_accounts ga
  WHERE ga.organization_id = rq.organization_id AND ga.is_primary = true
  LIMIT 1
)
WHERE rq.ghl_account_id IS NULL;

-- Comments
COMMENT ON COLUMN research_sessions.ghl_account_id IS 'GHL account active when research was initiated';
COMMENT ON COLUMN email_drafts.ghl_account_id IS 'GHL account for sending this draft';
COMMENT ON COLUMN research_queue.ghl_account_id IS 'GHL account active when item was queued';
