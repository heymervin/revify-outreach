/**
 * Response Validator - Centralizes AI response normalization
 *
 * Ensures all AI provider responses have correct data types before reaching UI components,
 * preventing runtime errors caused by malformed AI output.
 */

import {
  CompanyProfile,
  RecentSignal,
  PainPointHypothesis,
  PersonaAngle,
  PersonaAngles,
  OutreachPriority,
  ResearchConfidence,
  RichResearchOutput,
  RichResearchOutputV2,
  ResearchV2Result,
  HypothesisWithEvidence,
  ConfidenceBreakdownV2,
} from '../types';
import { confidenceToFivePointScale } from './confidenceCalculatorV2';

// ===== Type Guards =====

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ===== Ensure Functions (Coerce to Expected Type) =====

function ensureString(value: unknown, defaultValue: string): string {
  if (isString(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return defaultValue;
  }
  // Try to convert objects/arrays to string representation
  if (isObject(value) || isArray(value)) {
    console.warn('[Validator] Expected string, got object/array:', value);
    return defaultValue;
  }
  // Convert numbers, booleans, etc. to string
  return String(value);
}

function ensureNumber(value: unknown, defaultValue: number): number {
  if (isNumber(value)) {
    return value;
  }
  if (isString(value)) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

function ensureArray<T>(value: unknown): T[] {
  if (isArray(value)) {
    return value as T[];
  }
  if (value === null || value === undefined) {
    return [];
  }
  // If it's a single object, wrap it in an array
  if (isObject(value)) {
    console.warn('[Validator] Expected array, got object - wrapping:', value);
    return [value as T];
  }
  console.warn('[Validator] Expected array, got non-array type:', typeof value);
  return [];
}

// ===== Section Normalizers =====

function normalizeCompanyProfile(data: unknown): CompanyProfile {
  const d = isObject(data) ? data : {};

  return {
    confirmed_name: ensureString(d.confirmed_name, 'Unknown Company'),
    industry: ensureString(d.industry, 'Not specified'),
    sub_segment: ensureString(d.sub_segment, 'Not specified'),
    estimated_revenue: ensureString(d.estimated_revenue, 'Not available'),
    employee_count: ensureString(d.employee_count, 'Not available'),
    business_model: ensureString(d.business_model, 'Not available'),
    headquarters: ensureString(d.headquarters, 'Not available'),
    market_position: ensureString(d.market_position, 'Not available'),
  };
}

function normalizeRecentSignal(signal: unknown): RecentSignal | null {
  if (!isObject(signal)) {
    return null;
  }

  const description = ensureString(signal.description, '');
  if (!description) {
    return null; // Filter out entries without description
  }

  // Validate signal_type to expected values
  const validSignalTypes = ['financial', 'strategic', 'pricing', 'leadership', 'technology', 'industry'];
  const rawType = ensureString(signal.signal_type, 'industry').toLowerCase();
  const signalType = validSignalTypes.includes(rawType) ? rawType : 'industry';

  return {
    signal_type: signalType as RecentSignal['signal_type'],
    description,
    source: ensureString(signal.source, 'Unknown'),
    date: ensureString(signal.date, 'Unknown'),
    relevance_to_revology: ensureString(signal.relevance_to_revology, ''),
    source_url: ensureString(signal.source_url, ''),
    date_precision: ensureString(signal.date_precision, 'unknown') as RecentSignal['date_precision'],
    credibility_score: ensureNumber(signal.credibility_score, 0.5),
  };
}

function normalizeRecentSignals(data: unknown): RecentSignal[] {
  const signals = ensureArray<unknown>(data);
  return signals
    .map(normalizeRecentSignal)
    .filter((s): s is RecentSignal => s !== null);
}

function normalizePainPointHypothesis(hypothesis: unknown): PainPointHypothesis | null {
  if (!isObject(hypothesis)) {
    return null;
  }

  const hypothesisText = ensureString(hypothesis.hypothesis, '');
  if (!hypothesisText) {
    return null; // Filter out entries without hypothesis text
  }

  return {
    hypothesis: hypothesisText,
    evidence: ensureString(hypothesis.evidence, 'Not specified'),
    revology_solution_fit: ensureString(hypothesis.revology_solution_fit, 'Not specified'),
  };
}

function normalizePainPointHypotheses(data: unknown): PainPointHypothesis[] {
  const hypotheses = ensureArray<unknown>(data);
  return hypotheses
    .map(normalizePainPointHypothesis)
    .filter((h): h is PainPointHypothesis => h !== null);
}

function normalizePersonaAngle(angle: unknown): PersonaAngle {
  const defaultAngle: PersonaAngle = {
    primary_hook: 'Not available',
    supporting_point: 'Not available',
    question_to_pose: 'Not available',
  };

  if (!isObject(angle)) {
    return defaultAngle;
  }

  return {
    primary_hook: ensureString(angle.primary_hook, defaultAngle.primary_hook),
    supporting_point: ensureString(angle.supporting_point, defaultAngle.supporting_point),
    question_to_pose: ensureString(angle.question_to_pose, defaultAngle.question_to_pose),
  };
}

function normalizePersonaAngles(data: unknown): PersonaAngles {
  const d = isObject(data) ? data : {};

  const PERSONA_KEYS: (keyof PersonaAngles)[] = [
    'cfo_finance',
    'pricing_rgm',
    'sales_commercial',
    'ceo_gm',
    'technology_analytics',
  ];

  const result = {} as PersonaAngles;
  for (const key of PERSONA_KEYS) {
    result[key] = normalizePersonaAngle(d[key]);
  }

  return result;
}

function normalizeOutreachPriority(data: unknown): OutreachPriority {
  const d = isObject(data) ? data : {};

  // Ensure recommended_personas is an array of strings
  const rawPersonas = ensureArray<unknown>(d.recommended_personas);
  const recommended_personas = rawPersonas
    .map(p => ensureString(p, ''))
    .filter(p => p !== '');

  return {
    recommended_personas,
    timing_notes: ensureString(d.timing_notes, ''),
    cautions: ensureString(d.cautions, ''),
  };
}

function normalizeResearchConfidence(data: unknown): ResearchConfidence {
  const d = isObject(data) ? data : {};

  // Ensure gaps is an array of strings
  const rawGaps = ensureArray<unknown>(d.gaps);
  const gaps = rawGaps
    .map(g => ensureString(g, ''))
    .filter(g => g !== '');

  // Ensure overall_score is within valid range (1-5)
  let overallScore = ensureNumber(d.overall_score, 3);
  overallScore = Math.max(1, Math.min(5, overallScore));

  return {
    overall_score: overallScore,
    gaps,
    financial_confidence: ensureNumber(d.financial_confidence, 0.5),
    signal_freshness: ensureNumber(d.signal_freshness, 0.5),
    source_quality: ensureNumber(d.source_quality, 0.5),
    search_coverage: ensureNumber(d.search_coverage, 0.5),
  };
}

// ===== Main Normalizer =====

/**
 * Normalizes AI provider response to ensure all fields have correct types.
 * This function should be called after JSON.parse() and before passing data to UI.
 *
 * @param data - Raw parsed JSON from AI provider
 * @returns Normalized RichResearchOutput with guaranteed correct types
 */
export function normalizeResearchOutput(data: unknown): Omit<RichResearchOutput, 'metadata'> {
  const d = isObject(data) ? data : {};

  const normalized = {
    company_profile: normalizeCompanyProfile(d.company_profile),
    recent_signals: normalizeRecentSignals(d.recent_signals),
    pain_point_hypotheses: normalizePainPointHypotheses(d.pain_point_hypotheses),
    persona_angles: normalizePersonaAngles(d.persona_angles),
    outreach_priority: normalizeOutreachPriority(d.outreach_priority),
    research_confidence: normalizeResearchConfidence(d.research_confidence),
  };

  return normalized;
}

// ===== V2 Normalizer =====

/**
 * Normalizes AI provider response and merges with V2 research results.
 * Combines AI-generated analysis with pre-matched hypotheses and confidence metrics.
 *
 * @param data - Raw parsed JSON from AI provider
 * @param v2Result - V2 research results (hypotheses, confidence, gaps)
 * @returns Normalized output with V2 enhancements
 */
export function normalizeResearchOutputV2(
  data: unknown,
  v2Result: ResearchV2Result
): Omit<RichResearchOutputV2, 'metadata'> {
  // First, normalize the base output
  const baseNormalized = normalizeResearchOutput(data);

  // Merge V2 confidence into research_confidence
  const enhancedConfidence: ResearchConfidence = {
    ...baseNormalized.research_confidence,
    // Override with V2-calculated confidence (converted to 1-5 scale)
    overall_score: confidenceToFivePointScale(v2Result.confidenceBreakdown.overall),
    // Add detailed metrics
    financial_confidence: v2Result.confidenceBreakdown.financial_data.score,
    signal_freshness: v2Result.confidenceBreakdown.signal_freshness.score,
    source_quality: v2Result.confidenceBreakdown.source_quality.score,
    search_coverage:
      v2Result.confidenceBreakdown.signal_quantity.found /
      Math.max(v2Result.confidenceBreakdown.signal_quantity.expected, 1),
    // Add V2 gaps to AI-generated gaps
    gaps: [
      ...baseNormalized.research_confidence.gaps,
      ...v2Result.researchGaps.filter(
        (gap) => !baseNormalized.research_confidence.gaps.includes(gap)
      ),
    ],
  };

  // Merge matched pain points with AI-generated hypotheses
  const mergedHypotheses = mergeHypotheses(
    baseNormalized.pain_point_hypotheses,
    v2Result.matchedHypotheses
  );

  const v2Normalized: Omit<RichResearchOutputV2, 'metadata'> = {
    ...baseNormalized,
    pain_point_hypotheses: mergedHypotheses,
    research_confidence: enhancedConfidence,
    // V2 additions
    research_angle: v2Result.angleId,
    research_depth: v2Result.depth,
    matched_pain_points: v2Result.matchedHypotheses,
    confidence_breakdown: v2Result.confidenceBreakdown,
    research_gaps_actionable: v2Result.researchGaps,
  };

  return v2Normalized;
}

/**
 * Merge AI-generated hypotheses with pre-matched pain points.
 * Deduplicates based on similar content.
 */
function mergeHypotheses(
  aiHypotheses: PainPointHypothesis[],
  matchedPainPoints: HypothesisWithEvidence[]
): PainPointHypothesis[] {
  const merged: PainPointHypothesis[] = [...aiHypotheses];

  for (const matched of matchedPainPoints) {
    // Check if similar hypothesis already exists
    const isDuplicate = aiHypotheses.some(
      (h) =>
        h.hypothesis.toLowerCase().includes(matched.pain_point_name.toLowerCase()) ||
        matched.hypothesis.toLowerCase().includes(h.hypothesis.substring(0, 50).toLowerCase())
    );

    if (!isDuplicate) {
      // Convert matched pain point to standard hypothesis format
      merged.push({
        hypothesis: matched.hypothesis,
        evidence: `Based on ${matched.evidence_chain.length} signal match(es) with score ${matched.total_score.toFixed(2)}`,
        revology_solution_fit: `Addresses ${matched.pain_point_name} - target personas: ${matched.primary_personas.join(', ')}`,
      });
    }
  }

  return merged;
}
