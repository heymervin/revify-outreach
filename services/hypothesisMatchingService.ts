// ===== Hypothesis Matching Service =====
// Matches research signals against pain point library to generate evidence-backed hypotheses

import type { RecentSignal, SourceReference } from '../types';
import type {
  ResearchAngleId,
  HypothesisWithEvidence,
  EvidenceLink,
  PainPoint,
  SignalMatchResult,
  PainPointMatchAccumulator,
} from '../types/researchV2Types';
import { getPainPointsForAngle, getPainPointById } from '../data/painPointLibrary';

// Minimum score threshold for including a hypothesis
const HYPOTHESIS_SCORE_THRESHOLD = 0.5;

// Maximum number of hypotheses to return
const MAX_HYPOTHESES = 5;

/**
 * Match signals against the pain point library for a given research angle.
 * Returns hypotheses with evidence chains sorted by confidence score.
 */
export function matchSignalsToPainPoints(
  signals: RecentSignal[],
  angleId: ResearchAngleId,
  company: string,
  industry: string
): HypothesisWithEvidence[] {
  const painPoints = getPainPointsForAngle(angleId);

  if (!painPoints || painPoints.length === 0) {
    console.warn(`No pain points found for angle: ${angleId}`);
    return [];
  }

  // Accumulate matches for each pain point
  const accumulators: Map<string, PainPointMatchAccumulator> = new Map();

  // Initialize accumulators for each pain point
  for (const pp of painPoints) {
    accumulators.set(pp.id, {
      painPointId: pp.id,
      totalScore: 0,
      evidenceLinks: [],
    });
  }

  // Check each signal against each pain point's trigger patterns
  for (let signalIndex = 0; signalIndex < signals.length; signalIndex++) {
    const signal = signals[signalIndex];
    const textToMatch = buildMatchableText(signal);

    for (const pp of painPoints) {
      const matches = matchSignalAgainstPainPoint(signal, signalIndex, textToMatch, pp);

      if (matches.length > 0) {
        const accumulator = accumulators.get(pp.id)!;
        for (const match of matches) {
          accumulator.totalScore += match.match_score;
          accumulator.evidenceLinks.push(match);
        }
      }
    }
  }

  // Convert accumulators to hypotheses
  const hypotheses: HypothesisWithEvidence[] = [];

  for (const [painPointId, accumulator] of accumulators) {
    if (accumulator.totalScore >= HYPOTHESIS_SCORE_THRESHOLD && accumulator.evidenceLinks.length > 0) {
      const painPoint = getPainPointById(painPointId);
      if (!painPoint) continue;

      // Get the most relevant dimension based on evidence
      const dimension = selectBestDimension(accumulator.evidenceLinks, painPoint);

      const hypothesis = renderHypothesisTemplate(
        painPoint.hypothesis_template,
        company,
        industry,
        dimension
      );

      hypotheses.push({
        pain_point_id: painPointId,
        pain_point_name: painPoint.name,
        hypothesis,
        total_score: Math.round(accumulator.totalScore * 100) / 100,
        evidence_chain: accumulator.evidenceLinks,
        discovery_questions: painPoint.discovery_questions,
        primary_personas: painPoint.primary_personas,
        generated_at: Date.now(),
      });
    }
  }

  // Sort by score (highest first) and limit
  return hypotheses
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, MAX_HYPOTHESES);
}

/**
 * Build a matchable text string from a signal for regex matching.
 */
function buildMatchableText(signal: RecentSignal): string {
  const parts = [
    signal.description,
    signal.relevance_to_revology,
    signal.source,
  ].filter(Boolean);

  return parts.join(' ').toLowerCase();
}

/**
 * Match a single signal against a pain point's trigger patterns.
 */
function matchSignalAgainstPainPoint(
  signal: RecentSignal,
  signalIndex: number,
  textToMatch: string,
  painPoint: PainPoint
): EvidenceLink[] {
  const matches: EvidenceLink[] = [];

  for (const trigger of painPoint.trigger_signals) {
    try {
      const regex = new RegExp(trigger.pattern, 'gi');
      const match = textToMatch.match(regex);

      if (match && match.length > 0) {
        matches.push({
          signal_index: signalIndex,
          trigger_pattern: trigger.pattern,
          match_score: trigger.weight,
          matched_text: match[0],
          source_url: signal.source_url,
        });
      }
    } catch (e) {
      console.warn(`Invalid regex pattern: ${trigger.pattern}`, e);
    }
  }

  return matches;
}

/**
 * Select the best dimension to use in the hypothesis template
 * based on the matched evidence.
 */
function selectBestDimension(
  evidenceLinks: EvidenceLink[],
  painPoint: PainPoint
): string {
  // For now, use the first dimension. Could be enhanced to
  // select based on which dimension the evidence best supports.
  return painPoint.dimensions[0] || 'operations';
}

/**
 * Render a hypothesis template with variable substitution.
 */
function renderHypothesisTemplate(
  template: string,
  company: string,
  industry: string,
  dimension: string
): string {
  return template
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{industry\}\}/g, industry)
    .replace(/\{\{dimension\}\}/g, dimension);
}

/**
 * Match signals from source references (pipeline output) against pain points.
 * Converts source snippets to signal-like objects for matching.
 */
export function matchSourcesToPainPoints(
  sources: SourceReference[],
  angleId: ResearchAngleId,
  company: string,
  industry: string
): HypothesisWithEvidence[] {
  // Convert sources to signal-like objects
  const pseudoSignals: RecentSignal[] = sources.map((source) => ({
    signal_type: 'industry' as const,
    description: source.snippet,
    source: source.title,
    date: source.publication_date || 'unknown',
    relevance_to_revology: `From ${source.domain}`,
    source_url: source.url,
    date_precision: source.date_precision,
    credibility_score: source.credibility_score,
  }));

  return matchSignalsToPainPoints(pseudoSignals, angleId, company, industry);
}

/**
 * Combine LLM-extracted signals with source-based matching.
 * This provides both AI-analyzed signals and raw source matching.
 */
export function combinedHypothesisMatching(
  llmSignals: RecentSignal[],
  sources: SourceReference[],
  angleId: ResearchAngleId,
  company: string,
  industry: string
): HypothesisWithEvidence[] {
  // Match using LLM-extracted signals
  const llmHypotheses = matchSignalsToPainPoints(llmSignals, angleId, company, industry);

  // Match using raw sources (for signals LLM might have missed)
  const sourceHypotheses = matchSourcesToPainPoints(sources, angleId, company, industry);

  // Merge and deduplicate
  const mergedMap = new Map<string, HypothesisWithEvidence>();

  for (const h of llmHypotheses) {
    mergedMap.set(h.pain_point_id, h);
  }

  for (const h of sourceHypotheses) {
    const existing = mergedMap.get(h.pain_point_id);
    if (existing) {
      // Merge evidence chains and update score
      const combinedEvidence = [...existing.evidence_chain];
      for (const link of h.evidence_chain) {
        // Avoid duplicate evidence (same signal index and pattern)
        const isDuplicate = combinedEvidence.some(
          (e) => e.signal_index === link.signal_index && e.trigger_pattern === link.trigger_pattern
        );
        if (!isDuplicate) {
          combinedEvidence.push(link);
          existing.total_score += link.match_score;
        }
      }
      existing.evidence_chain = combinedEvidence;
    } else {
      mergedMap.set(h.pain_point_id, h);
    }
  }

  // Convert back to array, sort, and limit
  return Array.from(mergedMap.values())
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, MAX_HYPOTHESES);
}

/**
 * Get all trigger patterns for an angle (for debugging/testing).
 */
export function getAllTriggersForAngle(angleId: ResearchAngleId): Array<{
  painPointId: string;
  painPointName: string;
  patterns: string[];
}> {
  const painPoints = getPainPointsForAngle(angleId);
  return painPoints.map((pp) => ({
    painPointId: pp.id,
    painPointName: pp.name,
    patterns: pp.trigger_signals.map((t) => t.pattern),
  }));
}
