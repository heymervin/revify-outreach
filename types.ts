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
}

export interface RichResearchOutput {
  company_profile: CompanyProfile;
  recent_signals: RecentSignal[];
  pain_point_hypotheses: PainPointHypothesis[];
  persona_angles: PersonaAngles;
  outreach_priority: OutreachPriority;
  research_confidence: ResearchConfidence;
}

// ===== Research Session (supports both legacy and rich formats) =====

export interface ResearchSession {
  id: string;
  timestamp: number;
  companyName: string;
  website: string;
  industry: string;
  // Format discriminator
  format?: 'legacy' | 'rich';
  // Legacy format fields
  brief?: string;
  hypotheses?: string[];
  sentimentScore?: number; // 0-100
  keyTrends?: { name: string; value: number }[];
  // Rich format data
  richData?: RichResearchOutput;
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