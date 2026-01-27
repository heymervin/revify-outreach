export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
}

// ===== Enhanced Types for Pipeline =====

export interface EnhancedTavilyResult extends TavilySearchResult {
  domain: string;
  credibility_score: number; // 0-1 scale
  publication_date?: string;
  date_precision: 'exact' | 'month' | 'quarter' | 'year' | 'unknown';
}

export interface BatchSearchResult {
  query: string;
  results: EnhancedTavilyResult[];
  success: boolean;
  error?: string;
}

// ===== Tavily Call Tracker =====

export class TavilyCallTracker {
  private callCount: number = 0;
  private readonly maxCalls: number;

  constructor(maxCalls: number = 10) {
    this.maxCalls = maxCalls;
  }

  canMakeCall(): boolean {
    return this.callCount < this.maxCalls;
  }

  recordCall(): void {
    this.callCount++;
  }

  getCallCount(): number {
    return this.callCount;
  }

  getRemainingCalls(): number {
    return this.maxCalls - this.callCount;
  }
}

// ===== Credibility Scoring =====

const CREDIBILITY_TIERS: Record<string, number> = {
  // Tier 1: Official and Government (0.9-1.0)
  'sec.gov': 1.0,
  'edgar.sec.gov': 1.0,

  // Tier 2: Major Financial News (0.85-0.95)
  'bloomberg.com': 0.95,
  'reuters.com': 0.95,
  'wsj.com': 0.92,
  'ft.com': 0.92,
  'cnbc.com': 0.88,
  'marketwatch.com': 0.85,

  // Tier 3: Business Publications (0.75-0.85)
  'forbes.com': 0.82,
  'fortune.com': 0.82,
  'businessinsider.com': 0.78,
  'techcrunch.com': 0.78,
  'inc.com': 0.75,
  'entrepreneur.com': 0.75,

  // Tier 4: Industry Publications (0.65-0.75)
  'supplychaindive.com': 0.72,
  'retaildive.com': 0.72,
  'fooddive.com': 0.72,
  'manufacturingdive.com': 0.72,

  // Tier 5: Business Intelligence / Data (0.6-0.7)
  'crunchbase.com': 0.68,
  'pitchbook.com': 0.70,
  'zoominfo.com': 0.65,
  'clodura.ai': 0.62,
  'dnb.com': 0.68,

  // Tier 6: General News (0.55-0.65)
  'nytimes.com': 0.62,
  'washingtonpost.com': 0.62,
  'apnews.com': 0.65,
  'bbc.com': 0.62,

  // Tier 7: Press Releases (0.5-0.6)
  'prnewswire.com': 0.58,
  'businesswire.com': 0.58,
  'globenewswire.com': 0.55,

  // Tier 8: Professional Networks (0.5-0.55)
  'linkedin.com': 0.52,
};

export function scoreSourceCredibility(domain: string): number {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

  // Check exact matches first
  if (CREDIBILITY_TIERS[normalizedDomain]) {
    return CREDIBILITY_TIERS[normalizedDomain];
  }

  // Check for partial matches (subdomains)
  for (const [tierDomain, score] of Object.entries(CREDIBILITY_TIERS)) {
    if (normalizedDomain.endsWith(`.${tierDomain}`) || normalizedDomain === tierDomain) {
      return score;
    }
  }

  // Check for government domains
  if (normalizedDomain.endsWith('.gov')) return 0.9;

  // Check for investor relations pages
  if (normalizedDomain.includes('investor.') || normalizedDomain.includes('investors.')) return 0.85;

  // Check for company newsrooms
  if (normalizedDomain.includes('newsroom.') || normalizedDomain.includes('news.')) return 0.7;

  // Default score for unknown domains
  return 0.4;
}

// ===== Date Extraction =====

export function extractPublicationDate(
  content: string,
  title: string
): { publication_date?: string; date_precision: 'exact' | 'month' | 'quarter' | 'year' | 'unknown' } {
  const combinedText = `${title} ${content}`;

  // Pattern 1: ISO date format (e.g., "2024-01-15")
  const isoMatch = combinedText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { publication_date: isoMatch[1], date_precision: 'exact' };
  }

  // Pattern 2: Full date format (e.g., "January 15, 2024" or "15 January 2024")
  const fullDatePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i;
  const fullDateMatch = combinedText.match(fullDatePattern);
  if (fullDateMatch) {
    const [, month, day, year] = fullDateMatch;
    return {
      publication_date: `${month} ${day}, ${year}`,
      date_precision: 'exact'
    };
  }

  // Pattern 3: Reverse full date (e.g., "15 January 2024")
  const reverseDatePattern = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
  const reverseDateMatch = combinedText.match(reverseDatePattern);
  if (reverseDateMatch) {
    const [, day, month, year] = reverseDateMatch;
    return {
      publication_date: `${month} ${day}, ${year}`,
      date_precision: 'exact'
    };
  }

  // Pattern 4: Month and year (e.g., "January 2024")
  const monthYearPattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
  const monthYearMatch = combinedText.match(monthYearPattern);
  if (monthYearMatch) {
    return {
      publication_date: monthYearMatch[0],
      date_precision: 'month'
    };
  }

  // Pattern 5: Quarter references (e.g., "Q1 2024", "first quarter 2024")
  const quarterPattern = /\b(Q[1-4]|first|second|third|fourth)\s*quarter?\s*(\d{4})\b/i;
  const quarterMatch = combinedText.match(quarterPattern);
  if (quarterMatch) {
    const quarter = quarterMatch[1].toUpperCase().startsWith('Q')
      ? quarterMatch[1].toUpperCase()
      : { 'first': 'Q1', 'second': 'Q2', 'third': 'Q3', 'fourth': 'Q4' }[quarterMatch[1].toLowerCase()] || quarterMatch[1];
    return {
      publication_date: `${quarter} ${quarterMatch[2]}`,
      date_precision: 'quarter'
    };
  }

  // Pattern 6: Year only (prioritize recent years 2023-2026)
  const yearMatch = combinedText.match(/\b(202[3-6])\b/);
  if (yearMatch) {
    return {
      publication_date: yearMatch[1],
      date_precision: 'year'
    };
  }

  return { date_precision: 'unknown' };
}

// ===== Domain Extraction =====

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

// ===== Enhance Result =====

function enhanceResult(result: TavilySearchResult): EnhancedTavilyResult {
  const domain = extractDomain(result.url);
  const dateInfo = extractPublicationDate(result.content, result.title);

  return {
    ...result,
    domain,
    credibility_score: scoreSourceCredibility(domain),
    publication_date: dateInfo.publication_date,
    date_precision: dateInfo.date_precision,
  };
}

// ===== Batch Search Function =====

export async function batchSearchTavily(
  queries: string[],
  apiKey: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResultsPerQuery?: number;
    callTracker?: TavilyCallTracker;
  } = {}
): Promise<BatchSearchResult[]> {
  const { searchDepth = 'basic', maxResultsPerQuery = 3, callTracker } = options;
  const results: BatchSearchResult[] = [];

  for (const query of queries) {
    // Check if we've hit the call limit
    if (callTracker && !callTracker.canMakeCall()) {
      results.push({
        query,
        results: [],
        success: false,
        error: 'Tavily call limit reached'
      });
      continue;
    }

    try {
      callTracker?.recordCall();
      const response = await searchTavily(query, apiKey, {
        searchDepth,
        maxResults: maxResultsPerQuery
      });

      const enhancedResults = response.results.map(r => enhanceResult(r));
      results.push({
        query,
        results: enhancedResults,
        success: true
      });
    } catch (error) {
      results.push({
        query,
        results: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

export async function searchTavily(
  query: string,
  apiKey: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
  } = {}
): Promise<TavilyResponse> {
  const { searchDepth = 'basic', maxResults = 5 } = options;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Tavily API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

export function formatTavilyResultsForPrompt(results: TavilySearchResult[]): string {
  if (results.length === 0) return '';

  return `

Recent Web Search Results:
${results
  .map((r, i) => `${i + 1}. ${r.title}
   ${r.content.substring(0, 250)}...
   Source: ${r.url}`)
  .join('\n\n')}

Use these recent findings to inform your analysis.`;
}
