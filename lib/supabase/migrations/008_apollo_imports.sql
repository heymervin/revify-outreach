-- Migration 008: Apollo import tracking tables

-- Table to track import jobs
CREATE TABLE IF NOT EXISTS apollo_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('companies', 'contacts', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track individual import records
CREATE TABLE IF NOT EXISTS apollo_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES apollo_imports(id) ON DELETE CASCADE NOT NULL,
  apollo_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('company', 'contact')),
  apollo_data JSONB NOT NULL,
  ghl_id TEXT,
  ghl_business_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(import_id, apollo_id, record_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apollo_imports_org ON apollo_imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_apollo_imports_status ON apollo_imports(status);
CREATE INDEX IF NOT EXISTS idx_apollo_import_records_import ON apollo_import_records(import_id);
CREATE INDEX IF NOT EXISTS idx_apollo_import_records_status ON apollo_import_records(status);

-- RLS
ALTER TABLE apollo_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE apollo_import_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org imports"
  ON apollo_imports FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org imports"
  ON apollo_imports FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org imports"
  ON apollo_imports FOR UPDATE
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can view import records via import"
  ON apollo_import_records FOR SELECT
  USING (import_id IN (SELECT id FROM apollo_imports WHERE organization_id = get_user_org_id()));

CREATE POLICY "Users can insert import records via import"
  ON apollo_import_records FOR INSERT
  WITH CHECK (import_id IN (SELECT id FROM apollo_imports WHERE organization_id = get_user_org_id()));
