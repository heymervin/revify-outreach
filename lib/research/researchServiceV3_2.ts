/**
 * Research Engine V3.2 - Hybrid
 * Combines Tavily (website scraping + business databases) with OpenAI web search
 * Used for "deep" research tier
 */

import {
  ResearchInputV3,
  ResearchOutputV3,
  COST_CONSTANTS_V3,
} from '@/types/researchTypesV3';
import { scrapeWebsite, searchBusinessDatabases } from './tavilyService';

// Get dynamic years
const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

/**
 * Build the hybrid research prompt
 */
function buildHybridPrompt(
  input: ResearchInputV3,
  websiteContent: string,
  databaseContent: string
): string {
  return `You are a B2B sales intelligence researcher for Revology Analytics, a Revenue Growth Analytics consultancy.

YOUR TASK: Research "${input.companyName}" in the ${input.industry} industry and gather comprehensive intelligence for sales outreach.

## PRE-GATHERED DATA

### Company Website Content
${websiteContent || 'No website content available.'}

### Business Database Results
${databaseContent || 'No database results available.'}

## YOUR ADDITIONAL SEARCHES

Use your web search capabilities to find:
1. Recent news about "${input.companyName}" from ${previousYear}-${currentYear}
2. Leadership changes or executive moves
3. Intent signals (RFPs, vendor evaluations, technology initiatives)
4. Competitive positioning and market trends
5. Parent company financial results if "${input.companyName}" is a subsidiary

## WHAT TO LOOK FOR

### Company Profile
- Revenue with source (e.g., "$35M (ZoomInfo, March 2025)")
- Employee count with source
- Headquarters location
- Founded year
- Ownership: Public, Private, Subsidiary, or PE-Backed
- Parent company if applicable
- Key investors

### Intent Signals (MOST VALUABLE)
- RFP announcements
- Vendor evaluations
- Technology initiatives (new ERP, analytics, pricing tools)
- Hiring for analytics, pricing, or finance roles
- M&A activity

### Recent Signals
- Financial news (earnings, funding, cost-cutting)
- Strategic moves (expansion, restructuring)
- Leadership changes
- Technology investments

## ABOUT REVOLOGY ANALYTICS

Revology Analytics helps mid-market companies ($50M-$2B) with:
- Margin Analytics - Find profit leaks, optimize pricing
- Sales Growth Analytics - Customer segmentation, mix optimization
- Promotion Effectiveness - ROI measurement, trade optimization
- Commercial Analytics Transformation - Build analytics capabilities

Target personas: CFO/Finance, Pricing/RGM, Sales/Commercial, CEO/GM, Technology/Analytics

## OUTPUT

Combine ALL data (pre-gathered + your searches) to produce a complete research brief.
Be honest about confidence levels. If data is missing, say so in research_gaps.`;
}

/**
 * Build synthesis prompt for final output
 */
function buildSynthesisPrompt(searchResults: string, input: ResearchInputV3): string {
  return `You are synthesizing research about "${input.companyName}" for Revology Analytics' sales team.

## COMBINED SEARCH RESULTS

${searchResults}

## YOUR TASK

Analyze all the search results and produce a structured sales intelligence brief.

## OUTPUT SCHEMA

Respond with ONLY valid JSON matching this exact structure:

{
  "company_profile": {
    "confirmed_name": "string - Official company name",
    "industry": "string",
    "sub_segment": "string or null",
    "estimated_revenue": "string or null - e.g., '$35M (ZoomInfo, March 2025)'",
    "revenue_source": "string or null",
    "employee_count": "string or null - e.g., '201-500 (LinkedIn)'",
    "employee_source": "string or null",
    "headquarters": "string or null - City, State/Country",
    "founded_year": "string or null",
    "ownership_type": "Public | Private | Subsidiary | PE-Backed",
    "parent_company": "string or null",
    "investors": ["array of investor names or empty"],
    "business_model": "string - B2B, B2C, D2C, etc.",
    "market_position": "string or null",
    "citations": ["array of source URLs used"]
  },
  "recent_signals": [
    {
      "type": "financial | strategic | pricing | leadership | technology | intent",
      "headline": "string",
      "detail": "string",
      "date": "string - YYYY-MM or YYYY-MM-DD",
      "source_url": "string",
      "source_name": "string",
      "relevance_to_revology": "string",
      "is_intent_signal": "boolean"
    }
  ],
  "intent_signals": [
    {
      "signal_type": "rfp | vendor_evaluation | technology_initiative | hiring",
      "description": "string",
      "timeframe": "string or null",
      "source": "string",
      "fit_score": "perfect | good | moderate"
    }
  ],
  "hypothesis": {
    "primary_hypothesis": "string",
    "supporting_evidence": ["array of 2-4 evidence points"],
    "confidence": "high | medium | low"
  },
  "persona_angles": {
    "cfo_finance": { "hook": "string", "supporting_point": "string", "question": "string" },
    "pricing_rgm": { "hook": "string", "supporting_point": "string", "question": "string" },
    "sales_commercial": { "hook": "string", "supporting_point": "string", "question": "string" },
    "ceo_gm": { "hook": "string", "supporting_point": "string", "question": "string" },
    "technology_analytics": { "hook": "string", "supporting_point": "string", "question": "string" }
  },
  "outreach_priority": {
    "recommended_personas": ["array of 1-3 persona keys"],
    "urgency": "high | medium | low",
    "urgency_reason": "string",
    "cautions": ["array of caution strings"]
  },
  "research_gaps": ["array of missing data points"]
}

IMPORTANT:
- Include source URLs for every data point
- Combine data from ALL sources (website, databases, web search)
- Be honest about confidence
- Intent signals are the most valuable`;
}

/**
 * Execute hybrid research using Tavily + OpenAI
 */
export async function executeResearchV3_2(
  input: ResearchInputV3,
  openaiKey: string,
  tavilyKey: string,
  onProgress?: (message: string) => void
): Promise<ResearchOutputV3> {
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let tavilySearches = 0;
  const allSources: string[] = [];

  onProgress?.('Starting hybrid research (Tavily + OpenAI)...');

  // Stage 1a: Scrape company website with Tavily
  let websiteContent = '';
  if (input.website) {
    onProgress?.('Stage 1a: Scraping company website...');
    websiteContent = await scrapeWebsite(input.website, tavilyKey);
    if (websiteContent) {
      tavilySearches++;
      allSources.push(input.website);
    }
  }

  // Stage 1b: Search business databases with Tavily
  onProgress?.('Stage 1b: Searching business databases...');
  const { content: databaseContent, sources: dbSources } = await searchBusinessDatabases(
    input.companyName,
    tavilyKey
  );
  tavilySearches += 3; // 3 queries
  allSources.push(...dbSources);

  onProgress?.(`Found ${allSources.length} sources from Tavily. Searching with OpenAI...`);

  // Stage 1c: OpenAI web search for news and signals
  const hybridPrompt = buildHybridPrompt(input, websiteContent, databaseContent);

  const searchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-search-preview',
      messages: [{ role: 'user', content: hybridPrompt }],
      web_search_options: {
        search_context_size: 'high',
      },
    }),
  });

  if (!searchResponse.ok) {
    const error = await searchResponse.json().catch(() => ({}));
    throw new Error(`OpenAI Search API error: ${error.error?.message || searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();
  const searchResultsText = searchData.choices?.[0]?.message?.content || '';

  const annotations = searchData.choices?.[0]?.message?.annotations || [];
  const openaiSearches = annotations.length > 0 ? Math.ceil(annotations.length / 3) : 3;

  totalInputTokens += searchData.usage?.prompt_tokens || 0;
  totalOutputTokens += searchData.usage?.completion_tokens || 0;

  onProgress?.(`Found ${annotations.length} additional sources. Synthesizing with ${input.researchDepth === 'deep' ? 'o1' : 'gpt-4o'}...`);

  // Stage 2: Synthesis
  const synthesisPrompt = buildSynthesisPrompt(searchResultsText, input);
  const synthesisModel = input.researchDepth === 'deep' ? 'o1' : 'gpt-4o';

  const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: synthesisModel,
      messages: [{ role: 'user', content: synthesisPrompt }],
      ...(synthesisModel === 'gpt-4o' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!synthesisResponse.ok) {
    const error = await synthesisResponse.json().catch(() => ({}));
    throw new Error(`OpenAI Synthesis API error: ${error.error?.message || synthesisResponse.statusText}`);
  }

  const synthesisData = await synthesisResponse.json();

  totalInputTokens += synthesisData.usage?.prompt_tokens || 0;
  totalOutputTokens += synthesisData.usage?.completion_tokens || 0;

  let content = synthesisData.choices?.[0]?.message?.content || '';

  // Clean up markdown code blocks if present
  if (content.includes('```json')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  if (content.includes('```')) {
    content = content.replace(/```\n?/g, '');
  }

  let result: ResearchOutputV3;
  try {
    result = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse synthesis result: ${e}`);
  }

  // Calculate cost
  const executionTime = Date.now() - startTime;
  const tokenCost = input.researchDepth === 'deep'
    ? (totalInputTokens / 1000) * COST_CONSTANTS_V3.O1_INPUT_PER_1K +
      (totalOutputTokens / 1000) * COST_CONSTANTS_V3.O1_OUTPUT_PER_1K
    : (totalInputTokens / 1000) * COST_CONSTANTS_V3.GPT4O_INPUT_PER_1K +
      (totalOutputTokens / 1000) * COST_CONSTANTS_V3.GPT4O_OUTPUT_PER_1K;

  const tavilyCost = tavilySearches * COST_CONSTANTS_V3.TAVILY_PER_CALL;
  const openaiSearchCost = openaiSearches * COST_CONSTANTS_V3.WEB_SEARCH_PER_CALL;
  const estimatedCost = tokenCost + tavilyCost + openaiSearchCost;

  // Ensure all required fields exist
  result.metadata = {
    searches_performed: tavilySearches + openaiSearches,
    sources_cited: (result.company_profile?.citations?.length || 0) + allSources.length,
    models_used: {
      search: 'gpt-4o-search-preview + Tavily',
      synthesis: synthesisModel,
    },
    execution_time_ms: executionTime,
    estimated_cost: estimatedCost,
  };

  // Merge Tavily sources into citations
  if (result.company_profile) {
    const allCitations = [...(result.company_profile.citations || []), ...allSources];
    result.company_profile.citations = Array.from(new Set(allCitations));
  }

  // Ensure arrays exist
  result.recent_signals = result.recent_signals || [];
  result.intent_signals = result.intent_signals || [];
  result.research_gaps = result.research_gaps || [];
  result.company_profile = result.company_profile || {
    confirmed_name: input.companyName,
    industry: input.industry,
    ownership_type: 'Private',
    citations: allSources,
  };

  // Ensure persona angles exist with defaults
  const defaultAngle = {
    hook: 'No specific angle available due to limited data.',
    supporting_point: 'Further research recommended.',
    question: 'What are your current analytics priorities?',
  };

  result.persona_angles = result.persona_angles || {
    cfo_finance: defaultAngle,
    pricing_rgm: defaultAngle,
    sales_commercial: defaultAngle,
    ceo_gm: defaultAngle,
    technology_analytics: defaultAngle,
  };

  result.hypothesis = result.hypothesis || {
    primary_hypothesis: 'Insufficient data to form a strong hypothesis.',
    supporting_evidence: [],
    confidence: 'low',
  };

  result.outreach_priority = result.outreach_priority || {
    recommended_personas: ['cfo_finance'],
    urgency: 'medium',
    urgency_reason: 'Standard timing - no urgent signals detected',
    cautions: [],
  };

  // Add token usage to metadata for transparency
  result.metadata = {
    ...result.metadata,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
  };

  onProgress?.('Hybrid research complete!');

  return result;
}
