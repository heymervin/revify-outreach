// ===== V2 Type Re-exports =====
export * from './types/researchV2Types';

// Note: V3 types are NOT re-exported here to avoid type conflicts.
// Import V3 types directly from './types/researchTypesV3' where needed.

// ===== Rich Research Output Types =====

export interface CompanyProfile {
  confirmed_name: string;
  industry: string;
  sub_segment: string;
  estimated_revenue: string;
  employee_count: string;
  business_model: string;
  headquarters: string;
  market_position: string;
}

export interface RecentSignal {
  signal_type: 'financial' | 'strategic' | 'pricing' | 'leadership' | 'technology' | 'industry';
  description: string;
  source: string;
  date: string;
  relevance_to_revology: string;
  // Enhanced fields (optional for backward compatibility)
  source_url?: string;
  date_precision?: 'exact' | 'month' | 'quarter' | 'year' | 'unknown';
  credibility_score?: number; // 0-1 scale
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
  cautions: string;
}

export interface ResearchConfidence {
  overall_score: number; // 1-5
  gaps: string[];
  // Enhanced metrics (optional for backward compatibility)
  financial_confidence?: number; // 0-1 confidence in financial data
  signal_freshness?: number; // 0-1 based on how recent signals are
  source_quality?: number; // 0-1 average credibility of sources
  search_coverage?: number; // 0-1 based on stages completed
}

export interface RichResearchOutput {
  company_profile: CompanyProfile;
  recent_signals: RecentSignal[];
  pain_point_hypotheses: PainPointHypothesis[];
  persona_angles: PersonaAngles;
  outreach_priority: OutreachPriority;
  research_confidence: ResearchConfidence;
  metadata?: ResearchMetadata; // Optional pipeline metadata
}

// ===== Research Pipeline Types =====

export type ResearchStageName =
  | 'website_content'
  | 'company_basics'
  | 'recent_signals'
  | 'financial_activity'
  | 'technology_signals'
  | 'competitive_context';

export interface SourceReference {
  url: string;
  title: string;
  domain: string;
  credibility_score: number; // 0-1 scale
  publication_date?: string;
  date_precision: 'exact' | 'month' | 'quarter' | 'year' | 'unknown';
  snippet: string;
  relevance_score: number; // Tavily's relevance score
}

export interface StageResult {
  stage: ResearchStageName;
  queries_executed: string[];
  sources: SourceReference[];
  raw_content: string; // Aggregated content for this stage
  execution_time_ms: number;
  success: boolean;
  error?: string;
}

export interface ResearchMetadata {
  pipeline_version: string; // e.g., "1.0.0"
  total_tavily_calls: number;
  total_sources_found: number;
  stages_completed: ResearchStageName[];
  stages_failed: ResearchStageName[];
  total_execution_time_ms: number;
  search_queries: string[]; // All queries executed
  timestamp: number;
}

export interface PipelineResult {
  stageResults: StageResult[];
  metadata: Omit<ResearchMetadata, 'timestamp'>;
}

// ===== Research Session (supports both legacy and rich formats) =====

export interface ResearchSession {
  id: string;
  timestamp: number;
  companyName: string;
  website: string;
  industry: string;
  // Format discriminator
  format?: 'legacy' | 'rich' | 'rich_v2' | 'v3';
  // Legacy format fields
  brief?: string;
  hypotheses?: string[];
  sentimentScore?: number; // 0-100
  keyTrends?: { name: string; value: number }[];
  // Rich format data (supports V1 and V2)
  richData?: RichResearchOutput | import('./types/researchV2Types').RichResearchOutputV2;
  // V3 format uses separate field to avoid type conflicts
  v3Data?: import('./types/researchTypesV3').ResearchOutputV3;
  // V2 additions
  researchAngle?: import('./types/researchV2Types').ResearchAngleId;
  researchDepth?: import('./types/researchV2Types').ResearchDepth;
}

export interface GeneratedEmail {
  id: string;
  sessionId: string;
  persona: PersonaType;
  subject: string;
  body: string;
  timestamp: number;
}

export enum PersonaType {
  CEO = 'CEO',
  CFO = 'CFO',
  VP_SALES = 'VP_SALES',
  CTO = 'CTO',
  MARKETING_LEAD = 'MARKETING_LEAD'
}

// Rich format persona keys
export type RichPersonaKey = 'cfo_finance' | 'pricing_rgm' | 'sales_commercial' | 'ceo_gm' | 'technology_analytics';

// Display names for all persona types
export const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  // Rich format personas
  cfo_finance: 'CFO / Finance',
  pricing_rgm: 'Pricing / RGM',
  sales_commercial: 'Sales / Commercial',
  ceo_gm: 'CEO / GM',
  technology_analytics: 'Technology / Analytics',
  // Legacy personas
  CEO: 'CEO',
  CFO: 'CFO',
  VP_SALES: 'VP Sales',
  CTO: 'CTO',
  MARKETING_LEAD: 'Marketing Lead',
};

export const RICH_PERSONA_KEYS: RichPersonaKey[] = [
  'cfo_finance',
  'pricing_rgm',
  'sales_commercial',
  'ceo_gm',
  'technology_analytics',
];

export interface ResearchInput {
  companyName: string;
  website: string;
  industry: string;
}

export type AppState = {
  sessions: ResearchSession[];
  currentSessionId: string | null;
  emails: GeneratedEmail[];
};

// ===== AI Provider Types =====

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface ProviderModel {
  id: string;
  name: string;
  provider: AIProvider;
  capabilities: ('research' | 'email' | 'general')[];
}

export const AVAILABLE_MODELS: Record<AIProvider, ProviderModel[]> = {
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', capabilities: ['research', 'email', 'general'] },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', capabilities: ['research', 'email', 'general'] },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', capabilities: ['email', 'general'] },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', capabilities: ['research', 'email', 'general'] },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', capabilities: ['research', 'email', 'general'] },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', capabilities: ['research', 'email', 'general'] },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', capabilities: ['research', 'email', 'general'] },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', capabilities: ['research', 'email', 'general'] },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', capabilities: ['email', 'general'] },
  ],
};

// ===== API Keys Configuration =====

export interface APIKeysConfig {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  tavily?: string;
}

// ===== Model Selection Configuration =====

export interface ModelSelectionConfig {
  researchProvider: AIProvider;
  researchModel: string;
  emailProvider: AIProvider;
  emailModel: string;
}

// ===== Prompt Templates =====

export interface PromptTemplate {
  id: string;
  name: string;
  type: 'research' | 'email';
  content: string;
  variables: string[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// ===== Tavily Configuration =====

export interface TavilyConfig {
  enabled: boolean;
  searchDepth: 'basic' | 'advanced';
  includeInResearch: boolean;
}

// ===== Complete Settings State =====

export interface SettingsState {
  apiKeys: APIKeysConfig;
  modelSelection: ModelSelectionConfig;
  promptTemplates: PromptTemplate[];
  tavily: TavilyConfig;
  lastUpdated: number;
}

// ===== Token Usage Tracking =====

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface UsageRecord {
  id: string;
  timestamp: number;
  provider: AIProvider;
  model: string;
  taskType: 'research' | 'email';
  usage: TokenUsage;
  estimatedCost?: number;
}

export interface UsageStats {
  records: UsageRecord[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCost: number;
}

// Cost per 1M tokens (approximate, may vary)
export const TOKEN_COSTS: Record<AIProvider, { input: number; output: number }> = {
  gemini: { input: 0.075, output: 0.30 },      // Gemini 2.0 Flash
  openai: { input: 2.50, output: 10.00 },      // GPT-4o
  anthropic: { input: 3.00, output: 15.00 },   // Claude 3.5 Sonnet
};

// ===== Default Settings =====

export const DEFAULT_SETTINGS: SettingsState = {
  apiKeys: {},
  modelSelection: {
    researchProvider: 'gemini',
    researchModel: 'gemini-2.0-flash',
    emailProvider: 'gemini',
    emailModel: 'gemini-2.0-flash',
  },
  promptTemplates: [],
  tavily: {
    enabled: false,
    searchDepth: 'basic',
    includeInResearch: true,
  },
  lastUpdated: Date.now(),
};