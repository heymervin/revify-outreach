import {
  ResearchInputV3,
  ResearchOutputV3,
  ResearchSourceV3,
  ResearchMetadataV3,
  COST_CONSTANTS_V3,
  PersonaAnglesV3
} from '../types/researchTypesV3';
import { DEFAULT_RESEARCH_PROMPT_V3 } from '../prompts/researchPromptV3';

// ===== Configuration =====

const CONFIG = {
  tavilyMaxResults: 5,
  tavilySearchDepth: 'advanced' as const,
  minCompanyNameMatchLength: 4,

  // Blacklisted domains - never include
  blacklistedDomains: [
    'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
    'instagram.com', 'tiktok.com', 'pinterest.com',
    'reddit.com', 'quora.com', 'wikipedia.org',
    'amazon.com', 'ebay.com', 'alibaba.com', 'aliexpress.com',
  ],

  // Domains requiring extra validation
  suspiciousDomains: [
    'leadiq.com', 'zoominfo.com', 'pitchbook.com', 'crunchbase.com',
    'dataintelo.com', 'futuremarketinsights.com', 'zionmarketresearch.com',
    'globenewswire.com', 'prnewswire.com',  // Often have similar company names
  ]
};

// ===== Main Research Function =====

export async function executeResearchV3(
  input: ResearchInputV3,
  openaiKey: string,
  tavilyKey: string,
  customPrompt?: string
): Promise<ResearchOutputV3> {
  const startTime = Date.now();
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const validationLog: string[] = [];

  // Track all validated sources
  const allSources: Map<string, ResearchSourceV3> = new Map();

  // ========================================
  // STAGE 1: Scrape Company Website
  // ========================================
  let websiteContent = '';
  if (input.website) {
    try {
      validationLog.push(`Scraping website: ${input.website}`);
      websiteContent = await scrapeCompanyWebsite(input.website, tavilyKey);

      if (websiteContent) {
        const domain = extractDomain(input.website);
        allSources.set(input.website, {
          url: input.website.startsWith('http') ? input.website : `https://${input.website}`,
          title: 'Company Website',
          domain,
          is_company_specific: true,
          content_snippet: websiteContent.substring(0, 500)
        });
        validationLog.push(`✓ Website scraped: ${websiteContent.length} chars`);
      }
    } catch (error) {
      validationLog.push(`✗ Website scrape failed: ${error}`);
    }
  }

  // ========================================
  // STAGE 2: Generate Search Queries (Dynamic Dates)
  // ========================================
  const queries = generateStrictQueries(input.companyName, input.industry, currentYear, previousYear);
  validationLog.push(`Generated ${queries.length} queries for ${previousYear}-${currentYear}`);

  // ========================================
  // STAGE 3: Execute Tavily Searches
  // ========================================
  const searchResults = await executeSearches(queries, tavilyKey);
  validationLog.push(`Tavily returned ${searchResults.results.length} results`);

  // ========================================
  // STAGE 4: STRICT Source Validation
  // ========================================
  const { validated, rejected } = validateSources(
    searchResults.results,
    input.companyName,
    input.website,
    validationLog
  );

  // Add validated sources to map
  for (const result of validated) {
    allSources.set(result.url, {
      url: result.url,
      title: result.title,
      domain: extractDomain(result.url),
      is_company_specific: true,
      content_snippet: result.content.substring(0, 300)
    });
  }

  validationLog.push(`Validation complete: ${validated.length} accepted, ${rejected.length} rejected`);

  // ========================================
  // STAGE 5: LLM Synthesis
  // ========================================
  const prompt = customPrompt || DEFAULT_RESEARCH_PROMPT_V3;
  const output = await synthesizeResearch(
    input,
    websiteContent,
    validated,
    prompt,
    openaiKey,
    currentYear,
    previousYear
  );

  // ========================================
  // Build Final Output
  // ========================================
  const executionTime = Date.now() - startTime;
  const tavilyCost = (queries.length + (input.website ? 1 : 0)) * COST_CONSTANTS_V3.tavily.advanced;
  const llmCost = 0.08;  // Approximate

  const metadata: ResearchMetadataV3 = {
    queries_executed: queries.length,
    sources_found: searchResults.results.length,
    sources_validated: validated.length,
    sources_rejected: rejected.length,
    website_scraped: !!websiteContent,
    execution_time_ms: executionTime,
    prompt_used: customPrompt ? 'custom' : 'default',
    estimated_cost: tavilyCost + llmCost,
    years_searched: [previousYear, currentYear],
    llm_model: 'gpt-4o',
    validation_log: validationLog
  };

  return {
    ...output,
    sources: Array.from(allSources.values()),
    metadata
  };
}

// ===== Website Scraping =====

async function scrapeCompanyWebsite(url: string, tavilyKey: string): Promise<string> {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Try Tavily Extract first
  try {
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        urls: [normalizedUrl]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.results?.[0]?.raw_content || data.results?.[0]?.content;
      if (content) return content;
    }
  } catch (e) {
    console.warn('Tavily extract failed, trying search fallback');
  }

  // Fallback: site-specific search
  const domain = extractDomain(normalizedUrl);
  const searchResponse = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query: `site:${domain} about company`,
      search_depth: 'advanced',
      max_results: 3
    })
  });

  if (searchResponse.ok) {
    const data = await searchResponse.json();
    return data.results?.map((r: TavilyResult) => r.content).join('\n\n') || '';
  }

  throw new Error('Failed to scrape website');
}

// ===== Query Generation (Dynamic Dates) =====

function generateStrictQueries(
  companyName: string,
  industry: string,
  currentYear: number,
  previousYear: number
): string[] {
  // Clean company name - remove legal suffixes
  const cleanName = companyName
    .replace(/\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|Sp\.?\s*z\.?\s*o\.?\s*o\.?|GmbH|S\.?A\.?|PLC|Pty|Limited)$/i, '')
    .trim();

  // Use exact match quotes
  const exactName = `"${cleanName}"`;

  return [
    // Company profile
    `${exactName} company "about us" OR "who we are" OR profile`,

    // News with DYNAMIC years
    `${exactName} news ${currentYear}`,
    `${exactName} news ${previousYear}`,
    `${exactName} announcement OR "press release" ${currentYear} OR ${previousYear}`,

    // Financial signals
    `${exactName} revenue OR earnings OR "financial results" ${currentYear} OR ${previousYear}`,
    `${exactName} acquisition OR merger OR funding OR investment`,

    // Leadership & strategic
    `${exactName} CEO OR "chief executive" OR founder OR leadership`,
    `${exactName} expansion OR growth OR "new market" OR launch`,

    // Industry context (always include company name)
    `${exactName} ${industry} market OR industry`
  ];
}

// ===== Search Execution =====

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

async function executeSearches(
  queries: string[],
  apiKey: string
): Promise<{ results: TavilyResult[]; succeeded: number; failed: number }> {
  const allResults: TavilyResult[] = [];
  let succeeded = 0;
  let failed = 0;

  const promises = queries.map(async (query) => {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: CONFIG.tavilySearchDepth,
          max_results: CONFIG.tavilyMaxResults,
          include_answer: false
        })
      });

      if (!response.ok) throw new Error(response.statusText);

      const data = await response.json();
      succeeded++;
      return data.results || [];
    } catch (error) {
      console.error(`Query failed: "${query}"`, error);
      failed++;
      return [];
    }
  });

  const resultArrays = await Promise.all(promises);

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  for (const results of resultArrays) {
    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }
  }

  return { results: allResults, succeeded, failed };
}

// ===== STRICT Source Validation =====

function validateSources(
  results: TavilyResult[],
  companyName: string,
  companyWebsite: string | undefined,
  log: string[]
): { validated: TavilyResult[]; rejected: { url: string; reason: string }[] } {
  const validated: TavilyResult[] = [];
  const rejected: { url: string; reason: string }[] = [];

  // Extract core company name
  const coreNameParts = companyName
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= CONFIG.minCompanyNameMatchLength)
    .filter(w => !['inc', 'llc', 'ltd', 'corp', 'company', 'the', 'and', 'limited'].includes(w));

  const coreName = coreNameParts[0] || companyName.toLowerCase().substring(0, 6);
  const companyDomain = companyWebsite ? extractDomain(companyWebsite) : null;

  log.push(`Core company name for matching: "${coreName}"`);

  for (const result of results) {
    const domain = extractDomain(result.url);
    const urlLower = result.url.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const contentLower = result.content.toLowerCase();
    const fullText = `${titleLower} ${contentLower}`;

    // CHECK 1: Blacklisted domains
    if (CONFIG.blacklistedDomains.some(d => domain.includes(d))) {
      rejected.push({ url: result.url, reason: 'Blacklisted domain' });
      log.push(`✗ REJECTED (blacklisted): ${domain}`);
      continue;
    }

    // CHECK 2: Company's own website - always accept
    if (companyDomain && domain.includes(companyDomain.replace('www.', ''))) {
      validated.push(result);
      log.push(`✓ ACCEPTED (company domain): ${result.url}`);
      continue;
    }

    // CHECK 3: Company name must be prominent
    const nameInTitle = titleLower.includes(coreName);
    const nameMatches = contentLower.match(new RegExp(coreName, 'g')) || [];
    const nameCountInContent = nameMatches.length;

    if (!nameInTitle && nameCountInContent < 2) {
      rejected.push({ url: result.url, reason: `Company name "${coreName}" not prominent (title: ${nameInTitle}, content count: ${nameCountInContent})` });
      log.push(`✗ REJECTED (name not prominent): ${result.url}`);
      continue;
    }

    // CHECK 4: Similar but different company names
    // Detect "Fundwell" when searching "Foodwell", etc.
    const similarNamePattern = new RegExp(`\\b(?!${coreName})[a-z]*${coreName.substring(1, 4)}[a-z]*well\\b`, 'i');
    if (similarNamePattern.test(fullText) && !fullText.includes(coreName)) {
      rejected.push({ url: result.url, reason: 'Similar but different company name detected' });
      log.push(`✗ REJECTED (similar name): ${result.url}`);
      continue;
    }

    // CHECK 5: Different organization type (Alliance, Foundation, etc.)
    const orgTypeIndicators = ['alliance', 'foundation', 'association', 'institute', 'nonprofit', 'non-profit'];
    const hasOrgIndicator = orgTypeIndicators.some(ind => urlLower.includes(ind) || titleLower.includes(ind));
    const companyHasOrgIndicator = orgTypeIndicators.some(ind => companyName.toLowerCase().includes(ind));

    if (hasOrgIndicator && !companyHasOrgIndicator) {
      rejected.push({ url: result.url, reason: 'Different organization type (alliance/foundation/etc.)' });
      log.push(`✗ REJECTED (different org type): ${result.url}`);
      continue;
    }

    // CHECK 6: Generic market reports about equipment/products
    const equipmentPatterns = [
      /food\s+well\s+(equipment|unit|market|size|industry)/i,
      /hot\s+food\s+well/i,
      /cold\s+food\s+well/i,
      /steam\s+table/i,
      /\bmarket\s+(report|research|analysis|size|forecast)\b/i
    ];

    const isEquipmentReport = equipmentPatterns.some(p => p.test(fullText));
    if (isEquipmentReport) {
      // Only accept if company name appears as a proper noun (capitalized)
      const properNounPattern = new RegExp(`\\b${companyName}\\b`, 'i');
      if (!properNounPattern.test(result.title)) {
        rejected.push({ url: result.url, reason: 'Generic market/equipment report' });
        log.push(`✗ REJECTED (equipment/market report): ${result.url}`);
        continue;
      }
    }

    // CHECK 7: Suspicious domains need exact company name match
    if (CONFIG.suspiciousDomains.some(d => domain.includes(d))) {
      const exactMatch = fullText.includes(companyName.toLowerCase());
      if (!exactMatch) {
        rejected.push({ url: result.url, reason: 'Aggregator site without exact company name match' });
        log.push(`✗ REJECTED (aggregator, no exact match): ${result.url}`);
        continue;
      }
    }

    // Passed all checks
    validated.push(result);
    log.push(`✓ ACCEPTED: ${result.url}`);
  }

  return { validated, rejected };
}

// ===== LLM Synthesis =====

async function synthesizeResearch(
  input: ResearchInputV3,
  websiteContent: string,
  searchResults: TavilyResult[],
  promptTemplate: string,
  apiKey: string,
  currentYear: number,
  previousYear: number
): Promise<Omit<ResearchOutputV3, 'sources' | 'metadata'>> {

  // Format website content
  const websiteSection = websiteContent
    ? `
COMPANY WEBSITE CONTENT (${input.website}):
────────────────────────────────────────
${websiteContent.substring(0, 2500)}
────────────────────────────────────────
`
    : 'COMPANY WEBSITE: Not provided or could not be scraped.\n';

  // Format search results with [SOURCE X] notation
  const sourcesSection = searchResults.length > 0
    ? searchResults.map((r, i) => `
[SOURCE ${i + 1}]
Title: ${r.title}
URL: ${r.url}
Date: ${r.published_date || 'Unknown'}
Content: ${r.content.substring(0, 800)}
────────────────────────────────────────`
    ).join('\n')
    : 'NO VALIDATED SOURCES FOUND. Rely only on website content if available, or report as research gap.';

  // Build prompt
  const prompt = promptTemplate
    .replace('{{companyName}}', input.companyName)
    .replace('{{website}}', input.website || 'Not provided')
    .replace('{{industry}}', input.industry)
    .replace('{{searchResults}}', websiteSection + '\nVALIDATED SEARCH RESULTS:\n' + sourcesSection);

  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const output = JSON.parse(data.choices[0].message.content);

  // Return with defaults for missing fields
  return {
    company_profile: output.company_profile || {
      confirmed_name: input.companyName,
      industry: input.industry
    },
    recent_signals: output.recent_signals || [],
    hypothesis: output.hypothesis || 'Insufficient verified data to form hypothesis.',
    persona_angles: output.persona_angles || getDefaultPersonaAngles(),
    outreach_priority: output.outreach_priority || {
      recommended_personas: [],
      timing_notes: 'Additional research required',
      cautions: 'Limited verified information - verify before outreach'
    },
    research_gaps: output.research_gaps || ['Comprehensive research data not available']
  };
}

// ===== Helpers =====

function extractDomain(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getDefaultPersonaAngles(): PersonaAnglesV3 {
  const defaultAngle = {
    hook: 'Limited research data available',
    supporting_point: 'Additional research recommended before outreach',
    question: 'What are your current strategic priorities?'
  };
  return {
    cfo_finance: { ...defaultAngle },
    pricing_rgm: { ...defaultAngle },
    sales_commercial: { ...defaultAngle },
    ceo_gm: { ...defaultAngle },
    technology_analytics: { ...defaultAngle }
  };
}

export { CONFIG as RESEARCH_CONFIG_V3 };
