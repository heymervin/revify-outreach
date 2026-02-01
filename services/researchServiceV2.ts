// ===== Research Service V2 =====
// Orchestrates the V2 research pipeline with angle-aware queries and hypothesis matching

import type { StageResult, SourceReference, PipelineResult } from '../types';
import type {
  ResearchAngleId,
  ResearchDepth,
  ResearchV2Result,
  HypothesisWithEvidence,
  ConfidenceBreakdownV2,
  ResearchDepthConfig,
  RESEARCH_DEPTH_CONFIGS,
} from '../types/researchV2Types';
import { runResearchPipeline, formatPipelineResultsForPrompt } from './researchPipeline';
import { matchSourcesToPainPoints, combinedHypothesisMatching } from './hypothesisMatchingService';
import {
  calculateConfidenceV2,
  generateResearchGaps,
  confidenceToFivePointScale,
} from './confidenceCalculatorV2';
import { getResearchAngle, getSearchThemesForAngle } from '../data/researchAngles';

// Re-export depth configs for use elsewhere
export { RESEARCH_DEPTH_CONFIGS } from '../types/researchV2Types';

// All angle IDs for comprehensive research
const ALL_ANGLE_IDS: ResearchAngleId[] = [
  'margin_analytics',
  'sales_growth',
  'promo_effectiveness',
  'analytics_transformation',
];

/**
 * Execute V2 research with angle-aware queries and hypothesis matching.
 * This is the main entry point for V2 research.
 */
export async function executeResearchV2(
  company: string,
  industry: string,
  website: string,
  tavilyApiKey: string,
  options: {
    angle?: ResearchAngleId;
    depth?: ResearchDepth;
  } = {}
): Promise<{
  pipelineResult: PipelineResult;
  v2Result: ResearchV2Result;
}> {
  const angleId = options.angle || 'margin_analytics';
  const depth = options.depth || 'standard';

  // Get depth configuration
  const depthConfig = getDepthConfig(depth);

  // Get angle-specific search themes
  const angle = getResearchAngle(angleId);
  const searchThemes = angle?.search_themes || [];

  // Run the pipeline with depth-specific configuration
  const pipelineResult = await runResearchPipeline(
    company,
    industry,
    tavilyApiKey,
    {
      maxTavilyCalls: depthConfig.max_tavily_calls,
      maxTotalTimeMs: depthConfig.max_time_ms,
      resultsPerQuery: depthConfig.results_per_query,
      searchDepth: depth === 'deep' ? 'advanced' : 'basic',
    },
    website
  );

  // Collect all sources from pipeline results
  const allSources = pipelineResult.stageResults.flatMap((r) => r.sources);

  // Match sources against pain points for this angle
  const matchedHypotheses = matchSourcesToPainPoints(
    allSources,
    angleId,
    company,
    industry
  );

  // Calculate V2 confidence breakdown
  const confidenceBreakdown = calculateConfidenceV2(
    pipelineResult.stageResults,
    matchedHypotheses
  );

  // Generate actionable research gaps
  const researchGaps = generateResearchGaps(
    confidenceBreakdown,
    company,
    pipelineResult.stageResults
  );

  return {
    pipelineResult,
    v2Result: {
      matchedHypotheses,
      confidenceBreakdown,
      researchGaps,
      angleId,
      depth,
    },
  };
}

/**
 * Execute V2 research across ALL angles for comprehensive coverage.
 * Runs the pipeline once and matches against all pain point libraries.
 */
export async function executeResearchV2AllAngles(
  company: string,
  industry: string,
  website: string,
  tavilyApiKey: string,
  options: {
    depth?: ResearchDepth;
  } = {}
): Promise<{
  pipelineResult: PipelineResult;
  v2Result: ResearchV2Result;
  angleResults: Record<ResearchAngleId, HypothesisWithEvidence[]>;
}> {
  const depth = options.depth || 'standard';

  // Get depth configuration - use more queries for comprehensive research
  const depthConfig = getDepthConfig(depth);

  // Increase limits for all-angles research
  const comprehensiveConfig = {
    maxTavilyCalls: Math.min(depthConfig.max_tavily_calls * 1.5, 20),
    maxTotalTimeMs: Math.min(depthConfig.max_time_ms * 1.5, 60000),
    resultsPerQuery: depthConfig.results_per_query,
    searchDepth: depth === 'deep' ? 'advanced' as const : 'basic' as const,
  };

  // Run the pipeline once with comprehensive queries
  const pipelineResult = await runResearchPipeline(
    company,
    industry,
    tavilyApiKey,
    comprehensiveConfig,
    website
  );

  // Collect all sources from pipeline results
  const allSources = pipelineResult.stageResults.flatMap((r) => r.sources);

  // Match sources against ALL angle pain point libraries
  const angleResults: Record<ResearchAngleId, HypothesisWithEvidence[]> = {} as Record<ResearchAngleId, HypothesisWithEvidence[]>;
  let allMatchedHypotheses: HypothesisWithEvidence[] = [];

  for (const angleId of ALL_ANGLE_IDS) {
    const hypotheses = matchSourcesToPainPoints(
      allSources,
      angleId,
      company,
      industry
    );
    angleResults[angleId] = hypotheses;
    allMatchedHypotheses = [...allMatchedHypotheses, ...hypotheses];
  }

  // Deduplicate and sort by score
  const seenIds = new Set<string>();
  const uniqueHypotheses = allMatchedHypotheses.filter((h) => {
    if (seenIds.has(h.pain_point_id)) return false;
    seenIds.add(h.pain_point_id);
    return true;
  }).sort((a, b) => b.total_score - a.total_score);

  // Calculate V2 confidence breakdown
  const confidenceBreakdown = calculateConfidenceV2(
    pipelineResult.stageResults,
    uniqueHypotheses
  );

  // Generate actionable research gaps
  const researchGaps = generateResearchGaps(
    confidenceBreakdown,
    company,
    pipelineResult.stageResults
  );

  return {
    pipelineResult,
    v2Result: {
      matchedHypotheses: uniqueHypotheses,
      confidenceBreakdown,
      researchGaps,
      angleId: 'margin_analytics', // Default for display purposes
      depth,
    },
    angleResults,
  };
}

/**
 * Get depth configuration for a given depth level.
 */
function getDepthConfig(depth: ResearchDepth): ResearchDepthConfig {
  // Import inline to avoid circular dependency issues
  const configs: Record<ResearchDepth, ResearchDepthConfig> = {
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

  return configs[depth];
}

/**
 * Generate angle-aware search queries by injecting angle-specific themes.
 * Can be used to enhance base queries with angle context.
 */
export function generateAngleAwareQueries(
  baseQueries: string[],
  angleId: ResearchAngleId,
  company: string,
  industry: string
): string[] {
  const searchThemes = getSearchThemesForAngle(angleId);
  if (!searchThemes || searchThemes.length === 0) {
    return baseQueries;
  }

  const enhancedQueries: string[] = [...baseQueries];

  // Add angle-specific queries using top themes
  const topThemes = searchThemes.slice(0, 4);
  for (const theme of topThemes) {
    enhancedQueries.push(`${company} ${theme} ${industry}`);
  }

  // Add combination query with multiple themes
  const combinedThemes = topThemes.slice(0, 2).join(' ');
  enhancedQueries.push(`${company} ${combinedThemes} news analysis`);

  return enhancedQueries;
}

/**
 * Format V2 research results for use in LLM prompt.
 * Includes angle context and matched hypotheses.
 */
export function formatV2ResultsForPrompt(
  pipelineResult: PipelineResult,
  v2Result: ResearchV2Result
): string {
  const sections: string[] = [];

  // Add angle context
  const angle = getResearchAngle(v2Result.angleId);
  if (angle) {
    sections.push(`=== RESEARCH ANGLE: ${angle.name} ===`);
    sections.push(`Service Line: ${angle.service_line}`);
    sections.push(`Focus Areas: ${angle.search_themes.slice(0, 5).join(', ')}`);
    sections.push('');
  }

  // Add pipeline results
  sections.push(
    formatPipelineResultsForPrompt(
      pipelineResult.stageResults,
      pipelineResult.metadata
    )
  );

  // Add matched hypotheses
  if (v2Result.matchedHypotheses.length > 0) {
    sections.push('\n=== PRE-MATCHED HYPOTHESES (from Pain Point Library) ===');
    sections.push(
      'The following hypotheses were matched from signals found. Incorporate these into your analysis:\n'
    );

    for (const h of v2Result.matchedHypotheses) {
      sections.push(`Pain Point: ${h.pain_point_name}`);
      sections.push(`Confidence Score: ${h.total_score.toFixed(2)}`);
      sections.push(`Hypothesis: ${h.hypothesis}`);
      sections.push(`Evidence Links: ${h.evidence_chain.length}`);
      sections.push(`Discovery Questions: ${h.discovery_questions.join('; ')}`);
      sections.push(`Target Personas: ${h.primary_personas.join(', ')}`);
      sections.push('');
    }
  }

  // Add confidence summary
  sections.push('\n=== RESEARCH CONFIDENCE SUMMARY ===');
  sections.push(`Overall Score: ${v2Result.confidenceBreakdown.overall.toFixed(2)} / 1.0`);
  sections.push(`Signal Quantity: ${v2Result.confidenceBreakdown.signal_quantity.found} sources found`);
  sections.push(`Source Quality: ${(v2Result.confidenceBreakdown.source_quality.average_credibility * 100).toFixed(0)}% average credibility`);
  sections.push(`Tier 1 Sources: ${v2Result.confidenceBreakdown.source_quality.tier1_count}`);

  if (v2Result.researchGaps.length > 0) {
    sections.push('\nResearch Gaps:');
    for (const gap of v2Result.researchGaps) {
      sections.push(`- ${gap}`);
    }
  }

  return sections.join('\n');
}

/**
 * Merge V2 results into the standard RichResearchOutput format.
 * This allows V2 data to be displayed using existing components.
 */
export function mergeV2IntoRichOutput(
  baseOutput: any, // From AI provider
  v2Result: ResearchV2Result
): any {
  return {
    ...baseOutput,
    // V2 additions
    research_angle: v2Result.angleId,
    research_depth: v2Result.depth,
    matched_pain_points: v2Result.matchedHypotheses,
    confidence_breakdown: v2Result.confidenceBreakdown,
    research_gaps_actionable: v2Result.researchGaps,
    // Override overall_score with V2 calculation
    research_confidence: {
      ...baseOutput.research_confidence,
      overall_score: confidenceToFivePointScale(v2Result.confidenceBreakdown.overall),
      // Include detailed metrics
      financial_confidence: v2Result.confidenceBreakdown.financial_data.score,
      signal_freshness: v2Result.confidenceBreakdown.signal_freshness.score,
      source_quality: v2Result.confidenceBreakdown.source_quality.score,
      search_coverage:
        v2Result.confidenceBreakdown.signal_quantity.found /
        v2Result.confidenceBreakdown.signal_quantity.expected,
    },
  };
}
