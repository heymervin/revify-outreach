// ===== Research V2 Types =====
// Enhanced research engine with Research Angles, Pain Point Library, and Evidence Chains

import type { RecentSignal, RichResearchOutput, SourceReference, ResearchStageName } from '../types';

// ===== Research Angles =====

export type ResearchAngleId =
  | 'margin_analytics'
  | 'sales_growth'
  | 'promo_effectiveness'
  | 'analytics_transformation';

export interface ResearchAngle {
  id: ResearchAngleId;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  service_line: string;
  search_themes: string[]; // Keywords to emphasize in Tavily queries
  pain_point_ids: string[]; // Links to PainPointLibrary
}

// ===== Pain Point Library =====

export interface TriggerPattern {
  pattern: string; // Regex pattern
  weight: number; // 0.1 to 1.0
}

export interface PainPoint {
  id: string;
  name: string;
  category: ResearchAngleId;
  description: string;
  trigger_signals: TriggerPattern[];
  hypothesis_template: string; // "{{company}} likely lacks {{gap}}. In {{industry}} we find..."
  dimensions: string[];
  discovery_questions: string[];
  primary_personas: string[];
  secondary_personas: string[];
  industries: string[]; // Empty = all industries
}

// ===== Evidence Chain =====

export interface EvidenceLink {
  signal_index: number; // Index into recent_signals[]
  trigger_pattern: string; // Which pattern matched
  match_score: number; // Weight from trigger
  matched_text: string; // The text that matched
  source_url?: string; // URL of the source signal
}

export interface HypothesisWithEvidence {
  pain_point_id: string;
  pain_point_name: string;
  hypothesis: string; // Rendered from template
  total_score: number; // Accumulated from all evidence
  evidence_chain: EvidenceLink[];
  discovery_questions: string[];
  primary_personas: string[];
  generated_at: number;
}

// ===== V2 Confidence Metrics =====

export interface SignalQuantityMetric {
  score: number; // 0-1
  found: number;
  expected: number;
  detail: string;
}

export interface SourceQualityMetric {
  score: number; // 0-1
  tier1_count: number;
  tier2_count: number;
  average_credibility: number;
}

export interface SignalFreshnessMetric {
  score: number; // 0-1
  within_3_months: number;
  within_6_months: number;
  within_12_months: number;
}

export interface FinancialDataMetric {
  score: number; // 0-1
  has_revenue: boolean;
  has_margins: boolean;
  has_growth: boolean;
}

export interface HypothesisEvidenceMetric {
  score: number; // 0-1
  average_links_per_hypothesis: number;
  hypotheses_with_strong_evidence: number;
}

export interface ConfidenceBreakdownV2 {
  signal_quantity: SignalQuantityMetric;
  source_quality: SourceQualityMetric;
  signal_freshness: SignalFreshnessMetric;
  financial_data: FinancialDataMetric;
  hypothesis_evidence: HypothesisEvidenceMetric;
  overall: number; // Weighted composite 0-1
}

// ===== Research Depth =====

export type ResearchDepth = 'quick' | 'standard' | 'deep';

export interface ResearchDepthConfig {
  depth: ResearchDepth;
  name: string;
  description: string;
  max_tavily_calls: number;
  max_time_ms: number;
  results_per_query: number;
  stages_to_run: ResearchStageName[];
}

export const RESEARCH_DEPTH_CONFIGS: Record<ResearchDepth, ResearchDepthConfig> = {
  quick: {
    depth: 'quick',
    name: 'Quick Scan',
    description: 'Fast overview with basic signals',
    max_tavily_calls: 5,
    max_time_ms: 15000,
    results_per_query: 2,
    stages_to_run: ['website_content', 'company_basics', 'recent_signals'],
  },
  standard: {
    depth: 'standard',
    name: 'Standard',
    description: 'Comprehensive research with all stages',
    max_tavily_calls: 10,
    max_time_ms: 28000,
    results_per_query: 3,
    stages_to_run: [
      'website_content',
      'company_basics',
      'recent_signals',
      'financial_activity',
      'technology_signals',
      'competitive_context',
    ],
  },
  deep: {
    depth: 'deep',
    name: 'Deep Dive',
    description: 'Exhaustive analysis with extended search',
    max_tavily_calls: 15,
    max_time_ms: 45000,
    results_per_query: 5,
    stages_to_run: [
      'website_content',
      'company_basics',
      'recent_signals',
      'financial_activity',
      'technology_signals',
      'competitive_context',
    ],
  },
};

// ===== Extended Research Output =====

export interface RichResearchOutputV2 extends RichResearchOutput {
  // V2 additions (all optional for backward compatibility)
  research_angle?: ResearchAngleId;
  research_depth?: ResearchDepth;
  matched_pain_points?: HypothesisWithEvidence[];
  confidence_breakdown?: ConfidenceBreakdownV2;
  research_gaps_actionable?: string[]; // "Consider searching for {{company}} 10-K filing"
}

// ===== V2 Research Input =====

export interface ResearchInputV2 {
  companyName: string;
  website: string;
  industry: string;
  researchAngle: ResearchAngleId;
  depth: ResearchDepth;
}

// ===== V2 Research Response =====

export interface ResearchV2Result {
  matchedHypotheses: HypothesisWithEvidence[];
  confidenceBreakdown: ConfidenceBreakdownV2;
  researchGaps: string[];
  angleId: ResearchAngleId;
  depth: ResearchDepth;
}

// ===== Settings Extensions =====

export interface ResearchV2Settings {
  defaultAngle: ResearchAngleId;
  defaultDepth: ResearchDepth;
}

// ===== Helper Types for Matching =====

export interface SignalMatchResult {
  signal: RecentSignal;
  signalIndex: number;
  matches: Array<{
    painPointId: string;
    pattern: string;
    weight: number;
    matchedText: string;
  }>;
}

export interface PainPointMatchAccumulator {
  painPointId: string;
  totalScore: number;
  evidenceLinks: EvidenceLink[];
}
