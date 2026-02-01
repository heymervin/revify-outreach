import {
  ResearchStageName,
  StageResult,
  SourceReference,
  ResearchMetadata,
  PipelineResult,
  ResearchConfidence,
  ResearchAngleId,
} from '../types';
import { getSearchThemesForAngle } from '../data/researchAngles';
import {
  batchSearchTavily,
  TavilyCallTracker,
  EnhancedTavilyResult,
} from './tavilyService';
import {
  scrapeWebsite,
  websiteContentToSourceReferences,
  formatWebsiteContentForPrompt,
} from './websiteScraperService';

// ===== Stage Definitions =====

interface StageDefinition {
  stage: ResearchStageName;
  queryTemplates: string[]; // Templates with {{company}}, {{industry}}
  maxQueries: number; // Max queries to execute for this stage
  timeout: number; // Timeout in ms
  required: boolean; // If true, pipeline fails if this stage fails
}

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: 'company_basics',
    queryTemplates: [
      '{{company}} company overview revenue employees headquarters',
      '{{company}} {{industry}} business model company profile',
    ],
    maxQueries: 2,
    timeout: 8000,
    required: true,
  },
  {
    stage: 'recent_signals',
    queryTemplates: [
      '{{company}} news announcements 2024 2025',
      '{{company}} press release latest developments',
      '{{company}} {{industry}} market news recent',
    ],
    maxQueries: 3,
    timeout: 8000,
    required: false,
  },
  {
    stage: 'financial_activity',
    queryTemplates: [
      '{{company}} earnings revenue financial results growth',
      '{{company}} funding acquisition investment merger',
    ],
    maxQueries: 2,
    timeout: 6000,
    required: false,
  },
  {
    stage: 'technology_signals',
    queryTemplates: [
      '{{company}} technology ERP CRM digital transformation AI analytics hiring',
    ],
    maxQueries: 1,
    timeout: 5000,
    required: false,
  },
  {
    stage: 'competitive_context',
    queryTemplates: [
      '{{company}} competitors market share {{industry}}',
      '{{company}} pricing strategy competitive analysis',
    ],
    maxQueries: 2,
    timeout: 6000,
    required: false,
  },
];

// ===== Pipeline Configuration =====

interface PipelineConfig {
  maxTavilyCalls: number;
  maxTotalTimeMs: number;
  searchDepth: 'basic' | 'advanced';
  resultsPerQuery: number;
  scrapeWebsite: boolean; // Whether to scrape the company website
  angleId?: ResearchAngleId; // V2: Research angle for theme-aware queries
}

const DEFAULT_CONFIG: PipelineConfig = {
  maxTavilyCalls: 10,
  maxTotalTimeMs: 28000, // Leave 2s buffer for synthesis
  searchDepth: 'basic',
  resultsPerQuery: 3,
  scrapeWebsite: true, // Enable website scraping by default
};

// ===== Main Pipeline Function =====

export async function runResearchPipeline(
  company: string,
  industry: string,
  apiKey: string,
  config: Partial<PipelineConfig> = {},
  website?: string
): Promise<PipelineResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const callTracker = new TavilyCallTracker(finalConfig.maxTavilyCalls);
  const startTime = Date.now();
  const stageResults: StageResult[] = [];
  const allQueries: string[] = [];

  // ===== Stage 0: Website Scraping (if website provided) =====
  if (finalConfig.scrapeWebsite && website && website !== 'Not provided') {
    const websiteStageStart = Date.now();

    try {
      const scrapeResult = await scrapeWebsite(website, apiKey, {
        maxPages: 5,
        timeout: 8000,
      });

      const sources = websiteContentToSourceReferences(scrapeResult);
      const rawContent = formatWebsiteContentForPrompt(scrapeResult);

      stageResults.push({
        stage: 'website_content',
        queries_executed: [website],
        sources,
        raw_content: rawContent,
        execution_time_ms: Date.now() - websiteStageStart,
        success: scrapeResult.pagesScraped > 0,
        error: scrapeResult.pagesScraped === 0 ? 'No pages could be scraped' : undefined,
      });

    } catch (error) {
      console.warn('Website scraping failed:', error);
      stageResults.push({
        stage: 'website_content',
        queries_executed: [website],
        sources: [],
        raw_content: '',
        execution_time_ms: Date.now() - websiteStageStart,
        success: false,
        error: error instanceof Error ? error.message : 'Website scraping failed',
      });
    }
  }

  // ===== Tavily Search Stages =====
  for (const stageDef of STAGE_DEFINITIONS) {
    // Check total time budget
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > finalConfig.maxTotalTimeMs) {
      console.warn(`Pipeline time budget exceeded, skipping stage: ${stageDef.stage}`);
      stageResults.push({
        stage: stageDef.stage,
        queries_executed: [],
        sources: [],
        raw_content: '',
        execution_time_ms: 0,
        success: false,
        error: 'Time budget exceeded',
      });
      continue;
    }

    // Check call budget
    if (!callTracker.canMakeCall()) {
      console.warn(`Tavily call limit reached, skipping stage: ${stageDef.stage}`);
      stageResults.push({
        stage: stageDef.stage,
        queries_executed: [],
        sources: [],
        raw_content: '',
        execution_time_ms: 0,
        success: false,
        error: 'Call limit reached',
      });
      continue;
    }

    const stageResult = await executeStage(
      stageDef,
      company,
      industry,
      apiKey,
      callTracker,
      finalConfig
    );

    stageResults.push(stageResult);
    allQueries.push(...stageResult.queries_executed);

    // If required stage failed, abort pipeline
    if (stageDef.required && !stageResult.success) {
      throw new Error(`Required stage '${stageDef.stage}' failed: ${stageResult.error}`);
    }
  }

  const totalTime = Date.now() - startTime;
  const successfulStages = stageResults
    .filter((r) => r.success)
    .map((r) => r.stage);
  const failedStages = stageResults.filter((r) => !r.success).map((r) => r.stage);
  const totalSources = stageResults.reduce((sum, r) => sum + r.sources.length, 0);

  return {
    stageResults,
    metadata: {
      pipeline_version: '1.0.0',
      total_tavily_calls: callTracker.getCallCount(),
      total_sources_found: totalSources,
      stages_completed: successfulStages,
      stages_failed: failedStages,
      total_execution_time_ms: totalTime,
      search_queries: allQueries,
    },
  };
}

// ===== Execute Single Stage =====

async function executeStage(
  stageDef: StageDefinition,
  company: string,
  industry: string,
  apiKey: string,
  callTracker: TavilyCallTracker,
  config: PipelineConfig
): Promise<StageResult> {
  const stageStart = Date.now();

  // Interpolate query templates
  let queries = stageDef.queryTemplates
    .slice(0, stageDef.maxQueries)
    .map((template) =>
      template
        .replace(/\{\{company\}\}/g, company)
        .replace(/\{\{industry\}\}/g, industry)
    );

  // V2: Inject angle-specific search themes for relevant stages
  if (config.angleId && (stageDef.stage === 'recent_signals' || stageDef.stage === 'competitive_context')) {
    queries = injectAngleThemes(queries, config.angleId, company);
  }

  try {
    const batchResults = await Promise.race([
      batchSearchTavily(queries, apiKey, {
        searchDepth: config.searchDepth,
        maxResultsPerQuery: config.resultsPerQuery,
        callTracker,
      }),
      timeout(stageDef.timeout),
    ]) as Awaited<ReturnType<typeof batchSearchTavily>>;

    // Aggregate sources from all queries
    const sources: SourceReference[] = [];
    const contentParts: string[] = [];
    const executedQueries: string[] = [];

    for (const result of batchResults) {
      if (result.success) {
        executedQueries.push(result.query);
        for (const r of result.results) {
          sources.push(tavilyResultToSourceReference(r));
          contentParts.push(`[${r.title}]: ${r.content}`);
        }
      }
    }

    // Deduplicate sources by URL
    const uniqueSources = deduplicateSources(sources);

    return {
      stage: stageDef.stage,
      queries_executed: executedQueries,
      sources: uniqueSources,
      raw_content: contentParts.join('\n\n'),
      execution_time_ms: Date.now() - stageStart,
      success: true,
    };
  } catch (error) {
    return {
      stage: stageDef.stage,
      queries_executed: queries,
      sources: [],
      raw_content: '',
      execution_time_ms: Date.now() - stageStart,
      success: false,
      error: error instanceof Error ? error.message : 'Stage execution failed',
    };
  }
}

// ===== Helper Functions =====

/**
 * V2: Inject angle-specific search themes into queries.
 * This enhances the base queries with keywords relevant to the research angle.
 */
function injectAngleThemes(
  baseQueries: string[],
  angleId: ResearchAngleId,
  company: string
): string[] {
  const themes = getSearchThemesForAngle(angleId);
  if (!themes || themes.length === 0) {
    return baseQueries;
  }

  const enhancedQueries = [...baseQueries];

  // Add 1-2 angle-specific queries using top themes
  const topThemes = themes.slice(0, 3);
  const themeString = topThemes.join(' ');
  enhancedQueries.push(`${company} ${themeString}`);

  return enhancedQueries;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Stage timeout')), ms)
  );
}

function tavilyResultToSourceReference(r: EnhancedTavilyResult): SourceReference {
  return {
    url: r.url,
    title: r.title,
    domain: r.domain,
    credibility_score: r.credibility_score,
    publication_date: r.publication_date,
    date_precision: r.date_precision,
    snippet: r.content.substring(0, 500),
    relevance_score: r.score,
  };
}

function deduplicateSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

// ===== Format Pipeline Results for Prompt =====

export function formatPipelineResultsForPrompt(
  stageResults: StageResult[],
  metadata: Omit<ResearchMetadata, 'timestamp'>
): string {
  const sections: string[] = [];

  sections.push(
    `=== GATHERED RESEARCH DATA (${metadata.total_sources_found} sources from ${metadata.stages_completed.length} stages) ===\n`
  );

  for (const result of stageResults) {
    if (!result.success || result.sources.length === 0) continue;

    const stageName = result.stage.replace(/_/g, ' ').toUpperCase();
    sections.push(`\n--- ${stageName} ---`);

    for (const source of result.sources) {
      const dateInfo = source.publication_date
        ? `[Date: ${source.publication_date} (${source.date_precision})]`
        : '[Date: unknown]';
      const credibility = `[Credibility: ${(source.credibility_score * 100).toFixed(0)}%]`;

      sections.push(`
Source: ${source.title}
URL: ${source.url}
${dateInfo} ${credibility}
Content: ${source.snippet}
`);
    }
  }

  return sections.join('\n');
}

// ===== Calculate Confidence Metrics =====

export function calculateConfidenceMetrics(
  stageResults: StageResult[]
): Pick<
  ResearchConfidence,
  'financial_confidence' | 'signal_freshness' | 'source_quality' | 'search_coverage'
> {
  const allSources = stageResults.flatMap((r) => r.sources);

  // Financial confidence: based on financial_activity stage success and source count
  const financialStage = stageResults.find(
    (r) => r.stage === 'financial_activity'
  );
  const financial_confidence =
    financialStage?.success && financialStage.sources.length > 0
      ? Math.min(financialStage.sources.length / 3, 1)
      : 0;

  // Signal freshness: based on date precision (more precise = fresher data usually)
  const datedSources = allSources.filter((s) => s.publication_date);
  const freshnessScores = datedSources.map((s) => {
    switch (s.date_precision) {
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
  });
  const signal_freshness =
    freshnessScores.length > 0
      ? freshnessScores.reduce((a, b) => a + b, 0) / freshnessScores.length
      : 0;

  // Source quality: average credibility
  const source_quality =
    allSources.length > 0
      ? allSources.reduce((sum, s) => sum + s.credibility_score, 0) /
        allSources.length
      : 0;

  // Search coverage: percentage of stages completed successfully
  // Total stages = STAGE_DEFINITIONS.length + 1 (website_content stage)
  const completedStages = stageResults.filter((r) => r.success).length;
  const totalPossibleStages = STAGE_DEFINITIONS.length + 1; // +1 for website_content
  const search_coverage = completedStages / totalPossibleStages;

  return {
    financial_confidence: Math.round(financial_confidence * 100) / 100,
    signal_freshness: Math.round(signal_freshness * 100) / 100,
    source_quality: Math.round(source_quality * 100) / 100,
    search_coverage: Math.round(search_coverage * 100) / 100,
  };
}
