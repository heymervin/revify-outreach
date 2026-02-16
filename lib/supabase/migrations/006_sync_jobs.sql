-- Sync job tracking for background processing
-- Migration: 006_sync_jobs.sql

-- Create the sync jobs table
CREATE TABLE IF NOT EXISTS ghl_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_page INTEGER DEFAULT 0,
  total_pages INTEGER,
  companies_synced INTEGER DEFAULT 0,
  total_companies INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding active jobs by organization
CREATE INDEX IF NOT EXISTS idx_sync_jobs_org_status ON ghl_sync_jobs(organization_id, status);

-- Index for finding stale running jobs (for cleanup)
CREATE INDEX IF NOT EXISTS idx_sync_jobs_running_started ON ghl_sync_jobs(status, started_at) WHERE status = 'running';

-- Enable RLS
ALTER TABLE ghl_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view and manage their org's sync jobs
CREATE POLICY "Users can view their org sync jobs"
  ON ghl_sync_jobs FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert their org sync jobs"
  ON ghl_sync_jobs FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update their org sync jobs"
  ON ghl_sync_jobs FOR UPDATE
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete their org sync jobs"
  ON ghl_sync_jobs FOR DELETE
  USING (organization_id = get_user_org_id());

-- Function to get the most recent sync job for an organization
CREATE OR REPLACE FUNCTION get_latest_sync_job(org_id UUID)
RETURNS TABLE(
  id UUID,
  status TEXT,
  current_page INTEGER,
  total_pages INTEGER,
  companies_synced INTEGER,
  total_companies INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.status,
    j.current_page,
    j.total_pages,
    j.companies_synced,
    j.total_companies,
    j.error_message,
    j.started_at,
    j.completed_at,
    j.created_at
  FROM ghl_sync_jobs j
  WHERE j.organization_id = org_id
  ORDER BY j.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old completed/failed jobs (keep last 10)
CREATE OR REPLACE FUNCTION cleanup_old_sync_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM ghl_sync_jobs
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, organization_id,
             ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at DESC) as rn
      FROM ghl_sync_jobs
    ) ranked
    WHERE rn <= 10
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON TABLE ghl_sync_jobs IS 'Tracks background sync jobs for GHL companies cache';
COMMENT ON COLUMN ghl_sync_jobs.status IS 'Job status: pending (queued), running (in progress), completed (success), failed (error)';
COMMENT ON COLUMN ghl_sync_jobs.current_page IS 'Current page being processed (for progress tracking)';
COMMENT ON COLUMN ghl_sync_jobs.total_pages IS 'Total number of pages to process (estimated from total count)';
