// ============================================
// RESEARCH ENGINE V3 - TIERED RESEARCH TYPES
// ============================================
// Supports Quick (1 credit), Standard (2 credits), Deep (5 credits)

// ===== Research Tier =====

export type ResearchTier = 'quick' | 'standard' | 'deep';

export const RESEARCH_CREDITS: Record<ResearchTier, number> = {
  quick: 1,
  standard: 2,
  deep: 5,
};

// ===== Research Prompt Configuration =====

export interface ResearchPromptConfig {
  id: string;
  name: string;
  prompt: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// ===== Research Input =====

export interface ResearchInputV3 {
  companyName: string;
  website?: string;
  industry: string;
  researchDepth: ResearchTier;
  promptId?: string;  // Which prompt template to use (for future customization)
}

// ===== Company Profile =====

export type OwnershipType = 'Public' | 'Private' | 'Subsidiary' | 'PE-Backed';

export interface CompanyProfileV3 {
  confirmed_name: string;
  industry: string;
  sub_segment?: string;
  estimated_revenue?: string;
  revenue_source?: string;  // For deep research: where revenue data came from
  employee_count?: string;
  employee_source?: string;  // For deep research: where employee data came from
  business_model?: string;
  headquarters?: string;
  founded_year?: string;
  ownership_type?: OwnershipType;  // Deep research only
  parent_company?: string;  // Deep research only
  investors?: string[];  // Deep research only
  market_position?: string;
  website?: string;
  citations?: string[];  // Source URLs (deep research)
  source_citations?: string[];  // Legacy field for compatibility
}

// ===== Recent Signals (with mandatory source citation) =====

export type SignalType = 'financial' | 'strategic' | 'pricing' | 'leadership' | 'technology' | 'industry' | 'intent';

export interface RecentSignalV3 {
  type: SignalType;
  signal?: string;  // Legacy field
  headline?: string;  // Deep research uses headline
  detail?: string;  // Deep research uses detail
  description?: string;  // Alternative to detail
  source_url: string;
  source_name: string;
  source?: string;  // Legacy field
  date: string;
  date_precision?: 'day' | 'month' | 'year' | 'approximate';
  relevance?: string;  // Legacy field
  relevance_to_revology?: string;  // Deep research field
  credibility_score?: number;  // 0-1
  is_intent_signal?: boolean;  // For deep research
}

// ===== Intent Signals (Deep Research Only) =====

export type IntentSignalType = 'rfp' | 'vendor_evaluation' | 'technology_initiative' | 'hiring';
export type FitScore = 'perfect' | 'good' | 'moderate';

export interface IntentSignalV3 {
  signal_type: IntentSignalType;
  description: string;
  timeframe?: string;
  source: string;
  fit_score: FitScore;
}

// ===== Hypothesis (Deep Research) =====

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface HypothesisV3 {
  primary_hypothesis: string;
  supporting_evidence: string[];
  confidence: ConfidenceLevel;
}

// ===== Pain Point Hypotheses (Quick/Standard) =====

export type SourceType = 'news' | 'job_posting' | 'website' | 'social' | 'press_release' | 'financial' | 'review';

export interface PainPointSource {
  type: SourceType;
  title: string;
  url?: string;
  date?: string;
}

export interface PainPointHypothesis {
  hypothesis: string;
  evidence: string;
  revology_solution_fit?: string;
  // Enhanced confidence fields
  confidence?: ConfidenceLevel;
  confidence_score?: number; // 0-100
  sources?: PainPointSource[];
}

// ===== Persona Angles =====

export interface PersonaAngleV3 {
  hook: string;
  supporting_point: string;
  question: string;
}

export interface PersonaAnglesV3 {
  cfo_finance: PersonaAngleV3;
  pricing_rgm: PersonaAngleV3;
  sales_commercial: PersonaAngleV3;
  ceo_gm: PersonaAngleV3;
  technology_analytics: PersonaAngleV3;
}

// ===== Outreach Priority =====

export type UrgencyLevel = 'high' | 'medium' | 'low';

export interface OutreachPriorityV3 {
  recommended_personas: string[];
  timing_notes?: string;  // Quick/Standard
  urgency?: UrgencyLevel;  // Deep research
  urgency_reason?: string;  // Deep research
  cautions: string | string[];  // String for legacy, array for deep
}

// ===== Research Source (with validation status) =====

export interface ResearchSourceV3 {
  url: string;
  title: string;
  domain: string;
  is_company_specific: boolean;
  content_snippet?: string;
  validation_status?: 'verified' | 'suspicious' | 'rejected';
  rejection_reason?: string;
}

// ===== Research Metadata =====

export interface ResearchMetadataV3 {
  queries_executed?: number;  // Legacy
  searches_performed?: number;  // Deep research
  sources_found?: number;  // Legacy
  sources_cited?: number;  // Deep research
  sources_validated?: number;
  sources_rejected?: number;
  website_scraped?: boolean;
  execution_time_ms: number;
  prompt_used?: 'default' | 'custom';
  estimated_cost: number;
  years_searched?: number[];
  llm_model?: string;
  models_used?: {  // Deep research
    search: string;
    synthesis: string;
  };
  validation_log?: string[];  // Optional debug log
  // Token tracking for transparency
  input_tokens?: number;
  output_tokens?: number;
}

// ===== Research Confidence (Quick/Standard) =====

export interface ResearchConfidenceV3 {
  overall_score: number;
  gaps?: string[];
  financial_confidence?: number;
  signal_freshness?: number;
  source_quality?: number;
  search_coverage?: number;
}

// ===== Research Output =====

export interface ResearchOutputV3 {
  // Common fields (all tiers)
  company_profile: CompanyProfileV3;
  recent_signals: RecentSignalV3[];

  // Quick/Standard: pain_point_hypotheses, research_confidence
  pain_point_hypotheses?: PainPointHypothesis[];
  research_confidence?: ResearchConfidenceV3;

  // Standard/Deep: persona_angles
  persona_angles?: PersonaAnglesV3;

  // Outreach priority
  outreach_priority?: OutreachPriorityV3;

  // Deep research fields
  hypothesis?: string | HypothesisV3;  // String for legacy, object for deep
  intent_signals?: IntentSignalV3[];
  research_gaps?: string[];
  sources?: ResearchSourceV3[];
  metadata?: ResearchMetadataV3;
}

// ===== Display Helpers =====

export const PERSONA_DISPLAY_NAMES_V3: Record<string, string> = {
  cfo_finance: 'CFO / Finance',
  pricing_rgm: 'Pricing / RGM',
  sales_commercial: 'Sales / Commercial',
  ceo_gm: 'CEO / GM',
  technology_analytics: 'Technology / Analytics'
};

export const SIGNAL_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  financial: { label: 'Financial', color: 'green', icon: 'DollarSign' },
  strategic: { label: 'Strategic', color: 'blue', icon: 'Target' },
  pricing: { label: 'Pricing', color: 'amber', icon: 'Tag' },
  leadership: { label: 'Leadership', color: 'purple', icon: 'Users' },
  technology: { label: 'Technology', color: 'cyan', icon: 'Cpu' },
  industry: { label: 'Industry', color: 'slate', icon: 'Building2' },
  intent: { label: 'Intent Signal', color: 'red', icon: 'AlertTriangle' }
};

// ===== Intent Fit Colors =====

export const INTENT_FIT_COLORS: Record<FitScore, string> = {
  perfect: 'bg-red-100 text-red-700 border-red-200',
  good: 'bg-orange-100 text-orange-700 border-orange-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
};

// ===== Urgency Colors =====

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-700',
};

// ===== Confidence Colors =====

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: 'bg-teal-100 text-teal-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
};

// ===== Cost Constants =====

export const COST_CONSTANTS_V3 = {
  tavily: {
    basic: 0.01,
    advanced: 0.02,
    extract: 0.02
  },
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },  // Per 1M tokens
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o-search-preview': { input: 2.50, output: 10.00 },
    'o1': { input: 15.00, output: 60.00 }
  },
  // Simplified per-1K token costs
  GPT4O_INPUT_PER_1K: 0.0025,
  GPT4O_OUTPUT_PER_1K: 0.01,
  O1_INPUT_PER_1K: 0.015,
  O1_OUTPUT_PER_1K: 0.06,
  WEB_SEARCH_PER_CALL: 0.025,
  TAVILY_PER_CALL: 0.01,
};
