-- =============================================
-- MODEL CONFIGURATION
-- Per-organization model selection for different operations
-- =============================================

CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Model assignments per operation type
  news_signals_model TEXT DEFAULT 'serp-api' CHECK (news_signals_model IN ('serp-api', 'tavily', 'gemini-3-flash-preview', 'gemini-3-pro-preview')),
  quick_research_model TEXT DEFAULT 'gemini-3-flash-preview' CHECK (quick_research_model IN ('gemini-3-flash-preview', 'gemini-3-pro-preview', 'gpt-4o-mini', 'gpt-4o')),
  standard_research_model TEXT DEFAULT 'gemini-3-flash-preview' CHECK (standard_research_model IN ('gemini-3-flash-preview', 'gemini-3-pro-preview', 'gpt-4o-mini', 'gpt-4o')),
  deep_research_model TEXT DEFAULT 'gemini-3-pro-preview' CHECK (deep_research_model IN ('gemini-3-flash-preview', 'gemini-3-pro-preview', 'gpt-4o', 'gpt-4o-mini')),
  email_drafting_model TEXT DEFAULT 'gemini-3-pro-preview' CHECK (email_drafting_model IN ('gemini-3-flash-preview', 'gemini-3-pro-preview', 'gpt-4o', 'gpt-4o-mini')),
  web_scraping_service TEXT DEFAULT 'tavily' CHECK (web_scraping_service IN ('tavily', 'serp-api', 'firecrawl')),

  -- SERP API configuration
  serp_api_key_encrypted TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one config per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_config_org ON model_configurations(organization_id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_model_config_org_lookup ON model_configurations(organization_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_model_configurations_updated_at ON model_configurations;
CREATE TRIGGER update_model_configurations_updated_at
  BEFORE UPDATE ON model_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org model config" ON model_configurations;
DROP POLICY IF EXISTS "Admins can modify model config" ON model_configurations;

CREATE POLICY "Users can view org model config"
  ON model_configurations FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can modify model config"
  ON model_configurations FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Insert default configurations for existing organizations
INSERT INTO model_configurations (
  organization_id,
  news_signals_model,
  quick_research_model,
  standard_research_model,
  deep_research_model,
  email_drafting_model,
  web_scraping_service
)
SELECT
  id,
  'serp-api',
  'gemini-3-flash-preview',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3-pro-preview',
  'tavily'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM model_configurations mc WHERE mc.organization_id = organizations.id
);

COMMENT ON TABLE model_configurations IS 'AI model and service selection per organization for different research operations';
