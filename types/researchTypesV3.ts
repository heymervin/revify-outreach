// ============================================
// RESEARCH ENGINE V3 - STRICT TYPES
// ============================================

import { AIProvider } from '../types';

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
  promptId?: string;  // Which prompt template to use (for future customization)
}

// ===== Company Profile =====

export interface CompanyProfileV3 {
  confirmed_name: string;
  industry: string;
  sub_segment?: string;
  estimated_revenue?: string;
  employee_count?: string;
  business_model?: string;
  headquarters?: string;
  website?: string;
  source_citations?: string[];
}

// ===== Recent Signals (with mandatory source citation) =====

export interface RecentSignalV3 {
  type: 'financial' | 'strategic' | 'pricing' | 'leadership' | 'technology' | 'industry';
  signal: string;
  source_url: string;
  source_name: string;
  date: string;
  date_precision: 'day' | 'month' | 'year' | 'approximate';
  relevance: string;
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

export interface OutreachPriorityV3 {
  recommended_personas: string[];
  timing_notes: string;
  cautions: string;
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
  queries_executed: number;
  sources_found: number;
  sources_validated: number;
  sources_rejected: number;
  website_scraped: boolean;
  execution_time_ms: number;
  prompt_used: 'default' | 'custom';
  estimated_cost: number;
  years_searched: number[];
  llm_model: string;
  validation_log?: string[];  // Optional debug log
}

// ===== Research Output =====

export interface ResearchOutputV3 {
  company_profile: CompanyProfileV3;
  recent_signals: RecentSignalV3[];
  hypothesis: string;
  persona_angles: PersonaAnglesV3;
  outreach_priority: OutreachPriorityV3;
  research_gaps: string[];
  sources: ResearchSourceV3[];
  metadata: ResearchMetadataV3;
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
  industry: { label: 'Industry', color: 'slate', icon: 'Building2' }
};

// ===== Cost Constants =====

export const COST_CONSTANTS_V3 = {
  tavily: {
    basic: 0.01,
    advanced: 0.02,
    extract: 0.02
  },
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 }
  }
};
