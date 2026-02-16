-- GHL Companies Cache Table
-- Caches companies from GHL for fast server-side search/filter
-- Migration: 005_ghl_companies_cache.sql

-- Create the companies cache table
CREATE TABLE IF NOT EXISTS ghl_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ghl_id TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  score INTEGER,
  email TEXT,
  phone TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, ghl_id)
);

-- Indexes for fast search/filter
CREATE INDEX IF NOT EXISTS idx_ghl_companies_org ON ghl_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_ghl_companies_name_search ON ghl_companies USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_ghl_companies_score ON ghl_companies(organization_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ghl_companies_industry ON ghl_companies(organization_id, industry);
CREATE INDEX IF NOT EXISTS idx_ghl_companies_website ON ghl_companies(organization_id) WHERE website IS NOT NULL;

-- Enable RLS
ALTER TABLE ghl_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org companies"
  ON ghl_companies FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert their org companies"
  ON ghl_companies FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update their org companies"
  ON ghl_companies FOR UPDATE
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete their org companies"
  ON ghl_companies FOR DELETE
  USING (organization_id = get_user_org_id());

-- Add companies_synced_at column to ghl_config for tracking company sync freshness
-- (distinct from general last_sync_at which may track other GHL syncs)
ALTER TABLE ghl_config ADD COLUMN IF NOT EXISTS companies_synced_at TIMESTAMPTZ;
ALTER TABLE ghl_config ADD COLUMN IF NOT EXISTS companies_count INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON TABLE ghl_companies IS 'Cached GHL companies for fast server-side search and filtering';
COMMENT ON COLUMN ghl_config.companies_synced_at IS 'Last time companies were synced from GHL';
COMMENT ON COLUMN ghl_config.companies_count IS 'Total number of companies cached from GHL';
