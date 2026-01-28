// Research Engine V3.1 Types
// Pure OpenAI implementation with web search

export interface ResearchInputV3_1 {
  companyName: string;
  website?: string;
  industry: string;
  researchDepth: 'standard' | 'deep';
}

export interface PersonaAngleV3_1 {
  hook: string;
  supporting_point: string;
  question: string;
}

export interface RecentSignalV3_1 {
  type: 'financial' | 'strategic' | 'pricing' | 'leadership' | 'technology' | 'intent';
  headline: string;
  detail: string;
  date: string;
  source_url: string;
  source_name: string;
  relevance_to_revology: string;
  is_intent_signal?: boolean;
}

export interface IntentSignalV3_1 {
  signal_type: 'rfp' | 'vendor_evaluation' | 'technology_initiative' | 'hiring';
  description: string;
  timeframe?: string;
  source: string;
  fit_score: 'perfect' | 'good' | 'moderate';
}

export interface CompanyProfileV3_1 {
  confirmed_name: string;
  revenue?: string;
  revenue_source?: string;
  employee_count?: string;
  employee_source?: string;
  headquarters?: string;
  founded_year?: string;
  ownership_type: 'Public' | 'Private' | 'Subsidiary' | 'PE-Backed';
  parent_company?: string;
  investors?: string[];
  industry?: string;
  sub_segment?: string;
  business_model?: string;
  citations: string[];
}

export interface HypothesisV3_1 {
  primary_hypothesis: string;
  supporting_evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface OutreachPriorityV3_1 {
  recommended_personas: string[];
  urgency: 'high' | 'medium' | 'low';
  urgency_reason: string;
  cautions: string[];
}

export interface ResearchMetadataV3_1 {
  searches_performed: number;
  sources_cited: number;
  models_used: {
    search: string;
    synthesis: string;
  };
  execution_time_ms: number;
  estimated_cost: number;
}

export interface ResearchOutputV3_1 {
  company_profile: CompanyProfileV3_1;
  recent_signals: RecentSignalV3_1[];
  intent_signals: IntentSignalV3_1[];
  hypothesis: HypothesisV3_1;
  persona_angles: {
    cfo_finance: PersonaAngleV3_1;
    pricing_rgm: PersonaAngleV3_1;
    sales_commercial: PersonaAngleV3_1;
    ceo_gm: PersonaAngleV3_1;
    technology_analytics: PersonaAngleV3_1;
  };
  outreach_priority: OutreachPriorityV3_1;
  research_gaps: string[];
  metadata: ResearchMetadataV3_1;
}

// Display name mappings
export const PERSONA_DISPLAY_NAMES_V3_1: Record<string, string> = {
  cfo_finance: 'CFO / Finance',
  pricing_rgm: 'Pricing / RGM',
  sales_commercial: 'Sales / Commercial',
  ceo_gm: 'CEO / GM',
  technology_analytics: 'Technology / Analytics',
};

export const SIGNAL_TYPE_CONFIG_V3_1: Record<string, { label: string; color: string }> = {
  financial: { label: 'Financial', color: 'green' },
  strategic: { label: 'Strategic', color: 'blue' },
  pricing: { label: 'Pricing', color: 'purple' },
  leadership: { label: 'Leadership', color: 'amber' },
  technology: { label: 'Technology', color: 'cyan' },
  intent: { label: 'Intent Signal', color: 'red' },
};

export const INTENT_FIT_COLORS: Record<string, string> = {
  perfect: 'bg-red-100 text-red-700 border-red-200',
  good: 'bg-orange-100 text-orange-700 border-orange-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
};

// Cost constants
export const COST_CONSTANTS_V3_1 = {
  GPT4O_INPUT_PER_1K: 0.0025,
  GPT4O_OUTPUT_PER_1K: 0.01,
  O1_INPUT_PER_1K: 0.015,
  O1_OUTPUT_PER_1K: 0.06,
  WEB_SEARCH_PER_CALL: 0.025, // Approximate
};
