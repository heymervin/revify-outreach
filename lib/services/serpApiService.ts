// lib/services/serpApiService.ts
// SERP API integration for recent news and signals

interface SerpApiNewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
  thumbnail?: string;
}

interface SerpApiResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
    source?: {
      name?: string;
    };
  }>;
  news_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
    source?: string;
    thumbnail?: string;
  }>;
}

export interface NewsSignalsResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  source?: string;
  thumbnail?: string;
}

/**
 * Search for recent news and signals using SERP API
 */
export async function searchNewsSignals(
  query: string,
  apiKey: string,
  options: {
    num?: number; // Number of results (default: 10)
    location?: string; // Location for localized results
    timeRange?: 'hour' | 'day' | 'week' | 'month'; // Time range for news
  } = {}
): Promise<NewsSignalsResult[]> {
  const { num = 10, location = 'United States', timeRange = 'week' } = options;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google',
      q: query,
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      num: String(num),
      tbm: 'nws', // News search
    });

    // Add time range filter
    if (timeRange) {
      const timeFilters = {
        hour: 'qdr:h',
        day: 'qdr:d',
        week: 'qdr:w',
        month: 'qdr:m',
      };
      params.append('tbs', timeFilters[timeRange]);
    }

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status} ${response.statusText}`);
    }

    const data: SerpApiResponse = await response.json();

    // Parse news results
    const results: NewsSignalsResult[] = [];

    // Try news_results first (preferred for news search)
    if (data.news_results && data.news_results.length > 0) {
      results.push(
        ...data.news_results.map((result) => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet || '',
          date: result.date,
          source: result.source,
          thumbnail: result.thumbnail,
        }))
      );
    }

    // Fallback to organic_results if no news results
    if (results.length === 0 && data.organic_results && data.organic_results.length > 0) {
      results.push(
        ...data.organic_results.map((result) => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet || '',
          date: result.date,
          source: result.source?.name,
        }))
      );
    }

    return results.slice(0, num);
  } catch (error) {
    console.error('[SERP API] Search failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to search news with SERP API'
    );
  }
}

/**
 * Search for company news and signals
 */
export async function searchCompanyNews(
  companyName: string,
  apiKey: string,
  options: {
    includeIndustry?: string;
    timeRange?: 'hour' | 'day' | 'week' | 'month';
    num?: number;
  } = {}
): Promise<NewsSignalsResult[]> {
  const { includeIndustry, timeRange = 'week', num = 10 } = options;

  // Build query with company name and optional industry context
  let query = `"${companyName}"`;
  if (includeIndustry) {
    query += ` ${includeIndustry}`;
  }

  // Add news-related keywords to improve relevance
  query += ' (news OR announcement OR launch OR funding OR partnership OR acquisition)';

  return searchNewsSignals(query, apiKey, { timeRange, num });
}

/**
 * Format news results into a readable summary
 */
export function formatNewsSignals(results: NewsSignalsResult[]): string {
  if (results.length === 0) {
    return 'No recent news or signals found.';
  }

  return results
    .map((result, index) => {
      const parts = [
        `${index + 1}. **${result.title}**`,
        result.source ? `   *Source: ${result.source}*` : '',
        result.date ? `   *Date: ${result.date}*` : '',
        `   ${result.snippet}`,
        `   [Read more](${result.url})`,
      ];

      return parts.filter(Boolean).join('\n');
    })
    .join('\n\n');
}
