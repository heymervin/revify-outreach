-- Revify Outreach Enterprise - Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Organizations (multi-tenant root)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (encrypted)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'anthropic', 'tavily', 'ghl', 'apollo')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT, -- Last 4 chars for display
  is_valid BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- GHL Configuration
CREATE TABLE IF NOT EXISTS ghl_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  custom_field_mappings JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  default_ai_provider TEXT DEFAULT 'gemini',
  default_research_depth TEXT DEFAULT 'standard',
  default_email_tone TEXT DEFAULT 'professional',
  ui_preferences JSONB DEFAULT '{"theme": "light", "sidebarCollapsed": false}',
  notification_settings JSONB DEFAULT '{"email": true, "lowCredits": true}',
  selected_research_prompt_id UUID,
  selected_email_prompt_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Templates
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

-- Add foreign key for user_settings after prompt_templates exists
ALTER TABLE user_settings
  ADD CONSTRAINT fk_research_prompt FOREIGN KEY (selected_research_prompt_id) REFERENCES prompt_templates(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_email_prompt FOREIGN KEY (selected_email_prompt_id) REFERENCES prompt_templates(id) ON DELETE SET NULL;

-- =============================================
-- USAGE & BILLING
-- =============================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  credits_limit INTEGER DEFAULT 10, -- Monthly credit limit
  credits_used INTEGER DEFAULT 0, -- Current period usage
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Records
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('research', 'email', 'bulk_research', 'ghl_sync')),
  provider TEXT,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  credits_used DECIMAL(10,4) DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_org_created ON usage_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_created ON usage_records(user_id, created_at DESC);

-- =============================================
-- RESEARCH & ACTIVITY
-- =============================================

-- Research Sessions (metadata and full results for email generation)
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_domain TEXT,
  industry TEXT,
  research_type TEXT DEFAULT 'standard' CHECK (research_type IN ('quick', 'standard', 'deep')),
  ai_provider TEXT,
  ai_model TEXT,
  confidence_score DECIMAL(3,2),
  signals_found INTEGER DEFAULT 0,
  pain_points_found INTEGER DEFAULT 0,
  research_output JSONB, -- Full ResearchOutputV3 for email generation
  ghl_company_id TEXT,
  ghl_pushed_at TIMESTAMPTZ,
  credits_used DECIMAL(10,4),
  duration_ms INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_research_org_created ON research_sessions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_company ON research_sessions(company_name, organization_id);

-- Email Drafts
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON email_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_research ON email_drafts(research_id);

-- =============================================
-- OBSERVABILITY
-- =============================================

-- API Logs
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_api_logs_org_created ON api_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint, created_at DESC);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs(organization_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "Owners can update organization"
  ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner'
  ));

-- Users policies
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert themselves"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- API Keys policies
CREATE POLICY "Users can view org API keys"
  ON api_keys FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage API keys"
  ON api_keys FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- GHL Config policies
CREATE POLICY "Users can view org GHL config"
  ON ghl_config FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage GHL config"
  ON ghl_config FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Prompt Templates policies
CREATE POLICY "Users can view org prompts"
  ON prompt_templates FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage prompts"
  ON prompt_templates FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- User Settings policies
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (user_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view org subscription"
  ON subscriptions FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Only system can modify subscriptions"
  ON subscriptions FOR UPDATE
  USING (false); -- Updated via service role only

-- Usage Records policies
CREATE POLICY "Users can view org usage"
  ON usage_records FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert usage"
  ON usage_records FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

-- Research Sessions policies
CREATE POLICY "Users can view org research"
  ON research_sessions FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert research"
  ON research_sessions FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

-- Email Drafts policies
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

-- API Logs policies
CREATE POLICY "Users can view org logs"
  ON api_logs FOR SELECT
  USING (organization_id = get_user_org_id());

-- Audit Logs policies
CREATE POLICY "Users can view org audit logs"
  ON audit_logs FOR SELECT
  USING (organization_id = get_user_org_id());

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ghl_config_updated_at
  BEFORE UPDATE ON ghl_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for the user
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    LOWER(REPLACE(gen_random_uuid()::text, '-', ''))
  )
  RETURNING id INTO new_org_id;

  -- Create user profile
  INSERT INTO users (id, email, full_name, avatar_url, organization_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    new_org_id,
    'owner'
  );

  -- Create default subscription (free tier)
  INSERT INTO subscriptions (organization_id, plan_id, credits_limit)
  VALUES (new_org_id, 'free', 10);

  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_credits_used(org_id UUID, credits DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET credits_used = credits_used + credits
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if org has credits
CREATE OR REPLACE FUNCTION has_credits(org_id UUID, required_credits DECIMAL DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE organization_id = org_id
    AND (credits_used + required_credits) <= credits_limit
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Note: Initial data will be created automatically when users sign up
-- via the handle_new_user() trigger function

COMMENT ON TABLE organizations IS 'Multi-tenant organizations/workspaces';
COMMENT ON TABLE users IS 'User profiles linked to auth.users';
COMMENT ON TABLE api_keys IS 'Encrypted API keys for AI providers and GHL';
COMMENT ON TABLE ghl_config IS 'GoHighLevel integration configuration';
COMMENT ON TABLE user_settings IS 'Per-user preferences and settings';
COMMENT ON TABLE subscriptions IS 'Billing subscriptions and credit limits';
COMMENT ON TABLE usage_records IS 'Detailed usage tracking for analytics';
COMMENT ON TABLE research_sessions IS 'Research session metadata and full results for email generation';
COMMENT ON TABLE api_logs IS 'API request/response logging for observability';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';
COMMENT ON TABLE prompt_templates IS 'Custom prompt templates for research and email generation';
COMMENT ON TABLE email_drafts IS 'Email drafts and sent messages for outreach';
