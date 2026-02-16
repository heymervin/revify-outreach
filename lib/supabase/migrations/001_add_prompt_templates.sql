-- Migration: Add Prompt Templates
-- Run this in Supabase SQL Editor if you already have the base tables

-- Prompt Templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('research', 'email')),
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default per org per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_default ON prompt_templates(organization_id, type)
  WHERE is_default = true;

-- Add columns to user_settings for selected prompts (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'selected_research_prompt_id') THEN
    ALTER TABLE user_settings ADD COLUMN selected_research_prompt_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'selected_email_prompt_id') THEN
    ALTER TABLE user_settings ADD COLUMN selected_email_prompt_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view org prompts" ON prompt_templates;
CREATE POLICY "Users can view org prompts"
  ON prompt_templates FOR SELECT
  USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage prompts" ON prompt_templates;
CREATE POLICY "Admins can manage prompts"
  ON prompt_templates FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Update trigger
DROP TRIGGER IF EXISTS update_prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comment
COMMENT ON TABLE prompt_templates IS 'Custom prompt templates for research and email generation';
