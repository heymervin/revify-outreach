// Database types for Revify Outreach Enterprise

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  role: 'owner' | 'admin' | 'member';
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  provider: 'openai' | 'gemini' | 'anthropic' | 'tavily' | 'ghl';
  encrypted_key: string;
  key_hint?: string;
  is_valid: boolean;
  last_used_at?: string;
  last_validated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GHLConfig {
  id: string;
  organization_id: string;
  location_id: string;
  location_name?: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
  custom_field_mappings: Record<string, string>;
  sync_settings: Record<string, any>;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  default_ai_provider: string;
  default_research_depth: 'quick' | 'standard' | 'deep';
  default_email_tone: string;
  ui_preferences: {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
  };
  notification_settings: {
    email: boolean;
    lowCredits: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  credits_limit: number;
  credits_used: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  organization_id: string;
  user_id?: string;
  action_type: 'research' | 'email' | 'bulk_research' | 'ghl_sync';
  provider?: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  estimated_cost: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  organization_id: string;
  user_id?: string;
  company_name: string;
  company_website?: string;
  company_domain?: string;
  industry?: string;
  research_type: 'quick' | 'standard' | 'deep';
  ai_provider?: string;
  ai_model?: string;
  confidence_score?: number;
  signals_found: number;
  pain_points_found: number;
  ghl_company_id?: string;
  ghl_pushed_at?: string;
  credits_used: number;
  duration_ms?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

// Research Output Types (matching existing app)
export interface CompanyProfile {
  confirmed_name: string;
  industry: string;
  sub_segment?: string;
  estimated_revenue?: string;
  employee_count?: string;
  business_model?: string;
  headquarters?: string;
  market_position?: string;
}

export interface RecentSignal {
  signal_type: string;
  description: string;
  source: string;
  date?: string;
  relevance_to_revology: string;
  source_url?: string;
  date_precision?: string;
  credibility_score: number;
}

export interface PainPointHypothesis {
  hypothesis: string;
  evidence: string;
  revology_solution_fit: string;
}

export interface PersonaAngle {
  primary_hook: string;
  supporting_point: string;
  question_to_pose: string;
}

export interface PersonaAngles {
  cfo_finance: PersonaAngle;
  pricing_rgm: PersonaAngle;
  sales_commercial: PersonaAngle;
  ceo_gm: PersonaAngle;
  technology_analytics: PersonaAngle;
}

export interface OutreachPriority {
  recommended_personas: string[];
  timing_notes: string;
  cautions: string[];
}

export interface ResearchConfidence {
  overall_score: number;
  gaps: string[];
  financial_confidence: number;
  signal_freshness: number;
  source_quality: number;
  search_coverage: number;
}

export interface ResearchOutput {
  company_profile: CompanyProfile;
  recent_signals: RecentSignal[];
  pain_point_hypotheses: PainPointHypothesis[];
  persona_angles: PersonaAngles;
  outreach_priority: OutreachPriority;
  research_confidence: ResearchConfidence;
}

// API Request/Response Types
export interface ResearchRequest {
  company_name: string;
  company_website?: string;
  industry?: string;
  research_type: 'quick' | 'standard' | 'deep';
}

export interface ResearchResponse {
  success: boolean;
  session_id: string;
  research: ResearchOutput;
  credits_used: number;
  duration_ms: number;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
