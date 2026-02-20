-- Migration: 019_ghl_contacts.sql
-- One-time import table for GHL contacts enriched with business_id

CREATE TABLE IF NOT EXISTS ghl_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ghl_account_id   UUID REFERENCES ghl_accounts(id) ON DELETE CASCADE,
  ghl_id           TEXT NOT NULL,
  business_id      TEXT,               -- nullable: not all contacts are linked to a business
  first_name       TEXT,
  last_name        TEXT,
  email            TEXT,
  company_name     TEXT,
  job_function     TEXT,
  seniority_level  TEXT,
  job_title        TEXT,
  synced_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (organization_id, ghl_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_org
  ON ghl_contacts(organization_id);

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_business
  ON ghl_contacts(organization_id, business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_email
  ON ghl_contacts(organization_id, email)
  WHERE email IS NOT NULL;

-- RLS
ALTER TABLE ghl_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ghl_contacts' AND policyname = 'Users can view their org contacts'
  ) THEN
    CREATE POLICY "Users can view their org contacts"
      ON ghl_contacts FOR SELECT
      USING (organization_id = get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ghl_contacts' AND policyname = 'Users can insert their org contacts'
  ) THEN
    CREATE POLICY "Users can insert their org contacts"
      ON ghl_contacts FOR INSERT
      WITH CHECK (organization_id = get_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ghl_contacts' AND policyname = 'Users can update their org contacts'
  ) THEN
    CREATE POLICY "Users can update their org contacts"
      ON ghl_contacts FOR UPDATE
      USING (organization_id = get_user_org_id());
  END IF;
END $$;

COMMENT ON TABLE ghl_contacts IS 'GHL contacts imported once from CSV, enriched with business_id from GHL API';
COMMENT ON COLUMN ghl_contacts.business_id IS 'GHL business record ID linking contact to a company (nullable)';
