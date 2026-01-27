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
