// ===== Confidence Calculator V2 =====
// Enhanced confidence calculation with 5-component breakdown

import type { StageResult, SourceReference } from '../types';
import type {
  ConfidenceBreakdownV2,
  SignalQuantityMetric,
  SourceQualityMetric,
  SignalFreshnessMetric,
  FinancialDataMetric,
  HypothesisEvidenceMetric,
  HypothesisWithEvidence,
} from '../types/researchV2Types';

// Configuration
const EXPECTED_SIGNALS = 15; // Target number of signals for full score
const TIER1_CREDIBILITY_THRESHOLD = 0.85; // SEC, Bloomberg, Reuters, WSJ, FT
const TIER2_CREDIBILITY_THRESHOLD = 0.70; // Forbes, TechCrunch, industry pubs
const STRONG_HYPOTHESIS_THRESHOLD = 1.5; // Total score threshold for "strong evidence"

// Weight factors for overall score calculation
const WEIGHTS = {
  signal_quantity: 0.15,
  source_quality: 0.25,
  signal_freshness: 0.20,
  financial_data: 0.20,
  hypothesis_evidence: 0.20,
};

/**
 * Calculate comprehensive confidence breakdown from pipeline results and hypotheses.
 */
export function calculateConfidenceV2(
  stageResults: StageResult[],
  matchedHypotheses: HypothesisWithEvidence[]
): ConfidenceBreakdownV2 {
  const allSources = stageResults.flatMap((r) => r.sources);

  const signal_quantity = calculateSignalQuantity(allSources);
  const source_quality = calculateSourceQuality(allSources);
  const signal_freshness = calculateSignalFreshness(allSources);
  const financial_data = calculateFinancialData(stageResults);
  const hypothesis_evidence = calculateHypothesisEvidence(matchedHypotheses);

  // Calculate weighted overall score
  const overall =
    signal_quantity.score * WEIGHTS.signal_quantity +
    source_quality.score * WEIGHTS.source_quality +
    signal_freshness.score * WEIGHTS.signal_freshness +
    financial_data.score * WEIGHTS.financial_data +
    hypothesis_evidence.score * WEIGHTS.hypothesis_evidence;

  return {
    signal_quantity,
    source_quality,
    signal_freshness,
    financial_data,
    hypothesis_evidence,
    overall: Math.round(overall * 100) / 100,
  };
}

/**
 * Calculate signal quantity metric.
 * Based on number of sources found vs expected.
 */
function calculateSignalQuantity(sources: SourceReference[]): SignalQuantityMetric {
  const found = sources.length;
  const expected = EXPECTED_SIGNALS;
  const score = Math.min(found / expected, 1);

  let detail: string;
  if (found >= expected) {
    detail = 'Excellent coverage with multiple sources';
  } else if (found >= expected * 0.7) {
    detail = 'Good coverage across most areas';
  } else if (found >= expected * 0.4) {
    detail = 'Moderate coverage, some gaps exist';
  } else {
    detail = 'Limited sources found, research may be incomplete';
  }

  return {
    score: Math.round(score * 100) / 100,
    found,
    expected,
    detail,
  };
}

/**
 * Calculate source quality metric.
 * Based on credibility scores and tier distribution.
 */
function calculateSourceQuality(sources: SourceReference[]): SourceQualityMetric {
  if (sources.length === 0) {
    return {
      score: 0,
      tier1_count: 0,
      tier2_count: 0,
      average_credibility: 0,
    };
  }

  const tier1_count = sources.filter(
    (s) => s.credibility_score >= TIER1_CREDIBILITY_THRESHOLD
  ).length;

  const tier2_count = sources.filter(
    (s) =>
      s.credibility_score >= TIER2_CREDIBILITY_THRESHOLD &&
      s.credibility_score < TIER1_CREDIBILITY_THRESHOLD
  ).length;

  const average_credibility =
    sources.reduce((sum, s) => sum + s.credibility_score, 0) / sources.length;

  // Score is weighted average: base credibility + bonus for tier1/tier2
  const tier1Bonus = Math.min(tier1_count / 3, 0.15); // Up to 15% bonus for tier1 sources
  const tier2Bonus = Math.min(tier2_count / 5, 0.10); // Up to 10% bonus for tier2 sources
  const score = Math.min(average_credibility + tier1Bonus + tier2Bonus, 1);

  return {
    score: Math.round(score * 100) / 100,
    tier1_count,
    tier2_count,
    average_credibility: Math.round(average_credibility * 100) / 100,
  };
}

/**
 * Calculate signal freshness metric.
 * Based on publication dates and recency.
 */
function calculateSignalFreshness(sources: SourceReference[]): SignalFreshnessMetric {
  if (sources.length === 0) {
    return {
      score: 0,
      within_3_months: 0,
      within_6_months: 0,
      within_12_months: 0,
    };
  }

  const now = new Date();
  let within_3_months = 0;
  let within_6_months = 0;
  let within_12_months = 0;
  let scoredSources = 0;
  let totalFreshnessScore = 0;

  for (const source of sources) {
    if (!source.publication_date) {
      // Unknown dates get a partial score based on precision
      const precisionScore = getPrecisionScore(source.date_precision);
      totalFreshnessScore += precisionScore * 0.3; // Discount unknown dates
      scoredSources++;
      continue;
    }

    try {
      const pubDate = new Date(source.publication_date);
      const ageMs = now.getTime() - pubDate.getTime();
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);

      if (ageMonths <= 3) {
        within_3_months++;
        totalFreshnessScore += 1.0;
      } else if (ageMonths <= 6) {
        within_6_months++;
        totalFreshnessScore += 0.7;
      } else if (ageMonths <= 12) {
        within_12_months++;
        totalFreshnessScore += 0.4;
      } else {
        totalFreshnessScore += 0.1; // Older than 12 months
      }
      scoredSources++;
    } catch {
      // Invalid date, use precision-based score
      const precisionScore = getPrecisionScore(source.date_precision);
      totalFreshnessScore += precisionScore * 0.3;
      scoredSources++;
    }
  }

  const score = scoredSources > 0 ? totalFreshnessScore / scoredSources : 0;

  return {
    score: Math.round(Math.min(score, 1) * 100) / 100,
    within_3_months,
    within_6_months,
    within_12_months,
  };
}

/**
 * Get a freshness score based on date precision.
 */
function getPrecisionScore(
  precision: 'exact' | 'month' | 'quarter' | 'year' | 'unknown'
): number {
  switch (precision) {
    case 'exact':
      return 1.0;
    case 'month':
      return 0.8;
    case 'quarter':
      return 0.6;
    case 'year':
      return 0.4;
    default:
      return 0.2;
  }
}

/**
 * Calculate financial data metric.
 * Based on presence of revenue, margin, and growth information.
 */
function calculateFinancialData(stageResults: StageResult[]): FinancialDataMetric {
  // Check financial stage specifically
  const financialStage = stageResults.find((r) => r.stage === 'financial_activity');
  const financialStageSuccess = financialStage?.success && financialStage.sources.length > 0;

  // Analyze all content for financial indicators
  const allContent = stageResults
    .map((r) => r.raw_content)
    .join(' ')
    .toLowerCase();

  // Revenue patterns
  const has_revenue =
    /\$[\d,]+\s*(million|billion|m|b|mn|bn)/i.test(allContent) ||
    /revenue (of|is|at|was|reached|grew|increased|declined|fell).*[\d,]+/i.test(allContent) ||
    /[\d,]+\s*(million|billion|m|b|mn|bn)\s*(in )?(revenue|sales)/i.test(allContent);

  // Margin patterns
  const has_margins =
    /(gross |operating |net |profit )margin/i.test(allContent) ||
    /margin (of|at|is|was|increased|decreased|improved|declined)/i.test(allContent) ||
    /profitability|gross profit|operating income/i.test(allContent);

  // Growth patterns
  const has_growth =
    /(revenue|sales|earnings) (growth|grew|increased|up|rose)/i.test(allContent) ||
    /(\d+)%?\s*(growth|increase|gain|improvement)/i.test(allContent) ||
    /year.over.year|yoy|q.q|quarterly growth/i.test(allContent);

  // Calculate score
  let score = 0;
  if (financialStageSuccess) score += 0.4;
  if (has_revenue) score += 0.25;
  if (has_margins) score += 0.2;
  if (has_growth) score += 0.15;

  return {
    score: Math.round(Math.min(score, 1) * 100) / 100,
    has_revenue,
    has_margins,
    has_growth,
  };
}

/**
 * Calculate hypothesis evidence metric.
 * Based on how well hypotheses are supported by evidence.
 */
function calculateHypothesisEvidence(
  hypotheses: HypothesisWithEvidence[]
): HypothesisEvidenceMetric {
  if (hypotheses.length === 0) {
    return {
      score: 0,
      average_links_per_hypothesis: 0,
      hypotheses_with_strong_evidence: 0,
    };
  }

  const totalLinks = hypotheses.reduce((sum, h) => sum + h.evidence_chain.length, 0);
  const average_links_per_hypothesis = totalLinks / hypotheses.length;
  const hypotheses_with_strong_evidence = hypotheses.filter(
    (h) => h.total_score >= STRONG_HYPOTHESIS_THRESHOLD
  ).length;

  // Score based on evidence quality
  // - Average links (target: 3 per hypothesis)
  // - Percentage with strong evidence
  const linksScore = Math.min(average_links_per_hypothesis / 3, 1) * 0.5;
  const strongScore = (hypotheses_with_strong_evidence / hypotheses.length) * 0.5;
  const score = linksScore + strongScore;

  return {
    score: Math.round(Math.min(score, 1) * 100) / 100,
    average_links_per_hypothesis: Math.round(average_links_per_hypothesis * 10) / 10,
    hypotheses_with_strong_evidence,
  };
}

/**
 * Generate actionable research gaps based on confidence breakdown.
 */
export function generateResearchGaps(
  confidence: ConfidenceBreakdownV2,
  company: string,
  stageResults: StageResult[]
): string[] {
  const gaps: string[] = [];

  // Signal quantity gaps
  if (confidence.signal_quantity.score < 0.5) {
    gaps.push(`Limited information found. Consider searching for "${company}" with industry-specific terms.`);
  }

  // Source quality gaps
  if (confidence.source_quality.tier1_count === 0) {
    gaps.push(`No tier-1 sources (SEC filings, Bloomberg, Reuters) found. Check if ${company} is publicly traded.`);
  }
  if (confidence.source_quality.score < 0.6) {
    gaps.push('Most sources are lower-credibility outlets. Verify key facts with official sources.');
  }

  // Freshness gaps
  if (confidence.signal_freshness.within_3_months === 0) {
    gaps.push('No recent news (last 3 months) found. Company may have low media presence.');
  }
  if (confidence.signal_freshness.score < 0.4) {
    gaps.push('Most information is dated. Consider direct outreach to confirm current situation.');
  }

  // Financial data gaps
  if (!confidence.financial_data.has_revenue) {
    gaps.push(`Revenue data not found. Search for "${company} revenue" or check annual reports.`);
  }
  if (!confidence.financial_data.has_margins) {
    gaps.push('Margin/profitability data not found. May need to infer from industry benchmarks.');
  }

  // Hypothesis evidence gaps
  if (confidence.hypothesis_evidence.hypotheses_with_strong_evidence === 0) {
    gaps.push('No hypotheses have strong supporting evidence. Consider broader search terms.');
  }
  if (confidence.hypothesis_evidence.average_links_per_hypothesis < 2) {
    gaps.push('Hypotheses have limited evidence chains. More research may strengthen the case.');
  }

  // Stage-specific gaps
  const failedStages = stageResults.filter((r) => !r.success).map((r) => r.stage);
  if (failedStages.includes('website_content')) {
    gaps.push('Company website could not be scraped. Manual website review recommended.');
  }
  if (failedStages.includes('competitive_context')) {
    gaps.push('Competitive context not gathered. Consider searching for industry comparisons.');
  }

  return gaps;
}

/**
 * Convert overall confidence score (0-1) to 5-point scale.
 */
export function confidenceToFivePointScale(confidence: number): number {
  // Map 0-1 to 1-5
  return Math.round((confidence * 4 + 1) * 10) / 10;
}

/**
 * Get confidence level label.
 */
export function getConfidenceLabel(score: number): {
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
} {
  if (score >= 0.8) {
    return { label: 'High Confidence', color: 'green' };
  } else if (score >= 0.6) {
    return { label: 'Good Confidence', color: 'green' };
  } else if (score >= 0.4) {
    return { label: 'Moderate Confidence', color: 'yellow' };
  } else if (score >= 0.2) {
    return { label: 'Low Confidence', color: 'orange' };
  } else {
    return { label: 'Very Low Confidence', color: 'red' };
  }
}
