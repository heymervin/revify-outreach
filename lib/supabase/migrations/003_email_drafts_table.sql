-- Migration: Create email_drafts table
-- This table was referenced but never created in the initial schema

-- Create the email_drafts table
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  research_id UUID REFERENCES research_sessions(id) ON DELETE SET NULL,
  ghl_contact_id TEXT,
  ghl_message_id TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  original_body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON email_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_research ON email_drafts(research_id);

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Trigger to auto-update updated_at
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE email_drafts IS 'Email drafts and sent messages for outreach';
