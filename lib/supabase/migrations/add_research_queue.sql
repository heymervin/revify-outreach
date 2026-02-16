-- Research Queue Table
-- Unified queue for single and bulk research operations

CREATE TABLE IF NOT EXISTS research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Company info
  company_domain TEXT NOT NULL,
  company_name TEXT,
  company_website TEXT,
  industry TEXT,

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'complete', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  position INTEGER, -- Position in queue (auto-calculated)

  -- Research configuration
  research_type TEXT DEFAULT 'standard' CHECK (research_type IN ('quick', 'standard', 'deep')),

  -- Results link
  research_id UUID REFERENCES research_sessions(id),
  research_result JSONB, -- Cached result for quick access

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'ghl', 'api')),
  ghl_company_id TEXT, -- Original GHL company ID if imported
  batch_id UUID, -- For grouping CSV/bulk imports

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_pending_company_per_org UNIQUE (organization_id, company_domain, status)
    WHERE status IN ('pending', 'researching')
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_research_queue_user ON research_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_research_queue_org ON research_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_research_queue_status ON research_queue(status);
CREATE INDEX IF NOT EXISTS idx_research_queue_priority ON research_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_research_queue_batch ON research_queue(batch_id) WHERE batch_id IS NOT NULL;

-- Row Level Security
ALTER TABLE research_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their organization's queue
CREATE POLICY "Users can view their organization's queue"
  ON research_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can insert to their organization's queue
CREATE POLICY "Users can insert to their organization's queue"
  ON research_queue FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their organization's queue
CREATE POLICY "Users can update their organization's queue"
  ON research_queue FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete from their organization's queue
CREATE POLICY "Users can delete from their organization's queue"
  ON research_queue FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_research_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS research_queue_updated_at ON research_queue;
CREATE TRIGGER research_queue_updated_at
  BEFORE UPDATE ON research_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_research_queue_updated_at();

-- Function to calculate queue position
CREATE OR REPLACE FUNCTION get_queue_position(queue_id UUID)
RETURNS INTEGER AS $$
DECLARE
  pos INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO pos
  FROM research_queue
  WHERE status IN ('pending', 'researching')
    AND (priority > (SELECT priority FROM research_queue WHERE id = queue_id)
         OR (priority = (SELECT priority FROM research_queue WHERE id = queue_id)
             AND created_at < (SELECT created_at FROM research_queue WHERE id = queue_id)));
  RETURN pos;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE research_queue IS 'Unified queue for research operations (single and bulk)';
COMMENT ON COLUMN research_queue.priority IS 'Higher values = processed first (0 is default)';
COMMENT ON COLUMN research_queue.position IS 'Calculated position in processing queue';
COMMENT ON COLUMN research_queue.batch_id IS 'Groups items from same CSV import or bulk operation';
