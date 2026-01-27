import { SourceReference } from '../types';
import { scoreSourceCredibility, extractPublicationDate } from './tavilyService';

// ===== Types =====

export interface WebsiteContent {
  url: string;
  title: string;
  content: string;
  pageType: 'homepage' | 'about' | 'news' | 'products' | 'careers' | 'other';
  success: boolean;
  error?: string;
}

export interface WebsiteScrapeResult {
  baseUrl: string;
  pages: WebsiteContent[];
  totalContentLength: number;
  pagesScraped: number;
  pagesFailed: number;
  executionTimeMs: number;
}

// ===== Key Pages to Scrape =====

const KEY_PAGE_PATHS = [
  { path: '', pageType: 'homepage' as const },
  { path: '/about', pageType: 'about' as const },
  { path: '/about-us', pageType: 'about' as const },
  { path: '/company', pageType: 'about' as const },
  { path: '/news', pageType: 'news' as const },
  { path: '/press', pageType: 'news' as const },
  { path: '/newsroom', pageType: 'news' as const },
  { path: '/blog', pageType: 'news' as const },
  { path: '/products', pageType: 'products' as const },
  { path: '/services', pageType: 'products' as const },
  { path: '/careers', pageType: 'careers' as const },
  { path: '/jobs', pageType: 'careers' as const },
];

// ===== Tavily Extract API =====

interface TavilyExtractResponse {
  results: {
    url: string;
    raw_content: string;
  }[];
  failed_results?: {
    url: string;
    error: string;
  }[];
}

async function extractWithTavily(
  urls: string[],
  apiKey: string
): Promise<TavilyExtractResponse> {
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      urls: urls,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Tavily Extract API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

// ===== HTML Content Extraction =====

function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Try og:title
  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (ogTitleMatch) {
    return ogTitleMatch[1].trim();
  }

  return 'Untitled';
}

// ===== Normalize URL =====

function normalizeUrl(website: string): string {
  let url = website.trim();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, '');

  return url;
}

function buildPageUrl(baseUrl: string, path: string): string {
  if (!path) return baseUrl;
  return `${baseUrl}${path}`;
}

// ===== Main Scrape Function =====

export async function scrapeWebsite(
  website: string,
  tavilyApiKey: string,
  options: {
    maxPages?: number;
    timeout?: number;
  } = {}
): Promise<WebsiteScrapeResult> {
  const { maxPages = 5, timeout = 10000 } = options;
  const startTime = Date.now();

  const baseUrl = normalizeUrl(website);
  const pages: WebsiteContent[] = [];

  // Build list of URLs to try
  const urlsToTry = KEY_PAGE_PATHS.slice(0, maxPages).map(p => ({
    url: buildPageUrl(baseUrl, p.path),
    pageType: p.pageType,
  }));

  try {
    // Use Tavily Extract API to fetch multiple pages at once
    const extractResult = await Promise.race([
      extractWithTavily(
        urlsToTry.map(u => u.url),
        tavilyApiKey
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Website scrape timeout')), timeout)
      ),
    ]);

    // Process successful results
    for (const result of extractResult.results) {
      const pageInfo = urlsToTry.find(u => u.url === result.url);
      const content = extractTextFromHtml(result.raw_content);

      pages.push({
        url: result.url,
        title: extractTitle(result.raw_content),
        content: content.substring(0, 5000), // Limit content length
        pageType: pageInfo?.pageType || 'other',
        success: true,
      });
    }

    // Process failed results
    if (extractResult.failed_results) {
      for (const failed of extractResult.failed_results) {
        const pageInfo = urlsToTry.find(u => u.url === failed.url);
        pages.push({
          url: failed.url,
          title: '',
          content: '',
          pageType: pageInfo?.pageType || 'other',
          success: false,
          error: failed.error,
        });
      }
    }
  } catch (error) {
    console.warn('Website scraping failed:', error);
    // Return empty result on complete failure
    return {
      baseUrl,
      pages: [{
        url: baseUrl,
        title: '',
        content: '',
        pageType: 'homepage',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
      totalContentLength: 0,
      pagesScraped: 0,
      pagesFailed: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }

  const successfulPages = pages.filter(p => p.success);
  const totalContent = successfulPages.reduce((sum, p) => sum + p.content.length, 0);

  return {
    baseUrl,
    pages,
    totalContentLength: totalContent,
    pagesScraped: successfulPages.length,
    pagesFailed: pages.length - successfulPages.length,
    executionTimeMs: Date.now() - startTime,
  };
}

// ===== Convert to Source References =====

export function websiteContentToSourceReferences(
  scrapeResult: WebsiteScrapeResult
): SourceReference[] {
  const domain = new URL(scrapeResult.baseUrl).hostname.replace(/^www\./, '');

  return scrapeResult.pages
    .filter(p => p.success && p.content.length > 100)
    .map(page => {
      const dateInfo = extractPublicationDate(page.content, page.title);

      return {
        url: page.url,
        title: page.title || `${page.pageType} page`,
        domain,
        credibility_score: 0.9, // Company's own website is highly credible for company info
        publication_date: dateInfo.publication_date,
        date_precision: dateInfo.date_precision,
        snippet: page.content.substring(0, 500),
        relevance_score: 1.0, // Direct from company website
      };
    });
}

// ===== Format for Prompt =====

export function formatWebsiteContentForPrompt(
  scrapeResult: WebsiteScrapeResult
): string {
  if (scrapeResult.pagesScraped === 0) {
    return '';
  }

  const sections: string[] = [];
  sections.push(`\n--- COMPANY WEBSITE CONTENT (${scrapeResult.baseUrl}) ---`);

  for (const page of scrapeResult.pages.filter(p => p.success)) {
    sections.push(`
[${page.pageType.toUpperCase()}] ${page.title}
URL: ${page.url}
Content: ${page.content.substring(0, 1500)}
`);
  }

  return sections.join('\n');
}
