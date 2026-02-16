-- Migration: Update research_results and email_drafts tables
-- Run this if you already created the tables from the initial schema

-- Make ghl_contact_id nullable (it's not always available)
ALTER TABLE research_results ALTER COLUMN ghl_contact_id DROP NOT NULL;

-- Add session_id to link back to research_sessions (optional but useful)
ALTER TABLE research_results ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES research_sessions(id);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_research_user ON research_results(user_id);
CREATE INDEX IF NOT EXISTS idx_research_company ON research_results(company_name);
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON email_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_research ON email_drafts(research_id);

-- RLS Policies for research_results
ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research results"
  ON research_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research results"
  ON research_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for email_drafts
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON email_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON email_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON email_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON email_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on email_drafts
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
