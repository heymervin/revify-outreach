/**
 * Research Engine V3.1
 * Pure OpenAI implementation using web search and reasoning models
 */

import {
  ResearchInputV3_1,
  ResearchOutputV3_1,
  COST_CONSTANTS_V3_1,
} from '../types/researchTypesV3_1';

// Get dynamic years
const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

/**
 * Build the research prompt with web search instructions
 */
function buildSearchPrompt(input: ResearchInputV3_1): string {
  const websiteInstruction = input.website
    ? `The company website is: ${input.website}. Search this site for about/company pages.`
    : '';

  return `You are a B2B sales intelligence researcher for Revology Analytics, a Revenue Growth Analytics consultancy.

YOUR TASK: Research "${input.companyName}" in the ${input.industry} industry and gather comprehensive intelligence for sales outreach.

${websiteInstruction}

## CRITICAL INSTRUCTIONS

You MUST use the web search tool multiple times (5-8 searches minimum) to gather complete data. Do NOT rely on your training data alone.

## REQUIRED SEARCH QUERIES

Execute these searches in order:

1. "${input.companyName}" company profile revenue employees headquarters
2. "${input.companyName}" parent company acquisition investors ownership
3. "${input.companyName}" news ${currentYear} ${previousYear}
4. site:zoominfo.com "${input.companyName}" - CRITICAL for intent signals and firmographics
5. site:linkedin.com/company "${input.companyName}"
6. "${input.companyName}" CEO leadership executive team
7. "${input.companyName}" competitors market position
${input.website ? `8. site:${input.website.replace(/^https?:\/\//, '')} about company` : ''}

If you discover a parent company, also search:
- "{parent company}" financial results ${currentYear}
- "{parent company}" revenue employees

## WHAT TO LOOK FOR

### Company Profile
- Confirmed company name and any DBAs
- Revenue (include source: "$35M (ZoomInfo, March 2025)")
- Employee count (include source: "201-500 (LinkedIn)")
- Headquarters location
- Founded year
- Ownership: Public, Private, Subsidiary, or PE-Backed
- Parent company if applicable
- Key investors

### Intent Signals (MOST VALUABLE)
Look for buying signals on ZoomInfo, LeadIQ, or in news:
- RFP announcements
- Vendor evaluations
- Technology initiatives (new ERP, analytics, pricing tools)
- Hiring for analytics, pricing, or finance roles
- M&A activity (acquirers often need integration help)

### Recent Signals
- Financial news (earnings, funding, cost-cutting)
- Strategic moves (expansion, new markets, restructuring)
- Pricing changes or promotions
- Leadership changes
- Technology investments

## ABOUT REVOLOGY ANALYTICS

Revology Analytics helps mid-market companies ($50M-$2B) with:
- Margin Analytics - Find profit leaks, optimize pricing
- Sales Growth Analytics - Customer segmentation, mix optimization
- Promotion Effectiveness - ROI measurement, trade optimization
- Commercial Analytics Transformation - Build analytics capabilities

Target personas: CFO/Finance, Pricing/RGM, Sales/Commercial, CEO/GM, Technology/Analytics

## OUTPUT FORMAT

After completing your searches, provide a comprehensive JSON response with:
1. All firmographic data with sources cited
2. Recent signals sorted by relevance to Revology
3. Intent signals if found (these are gold!)
4. A hypothesis about their analytics/pricing pain points
5. Tailored angles for each persona
6. Outreach priority recommendations
7. Research gaps (what you couldn't find)

Be honest about confidence levels. If data is missing, say so in research_gaps.`;
}

/**
 * Build the synthesis prompt for the second stage
 */
function buildSynthesisPrompt(searchResults: string, input: ResearchInputV3_1): string {
  return `You are synthesizing research about "${input.companyName}" for Revology Analytics' sales team.

## SEARCH RESULTS TO SYNTHESIZE

${searchResults}

## YOUR TASK

Analyze the search results and produce a structured sales intelligence brief. Be honest about what was found vs. what's missing.

## OUTPUT SCHEMA

Respond with ONLY valid JSON matching this exact structure:

{
  "company_profile": {
    "confirmed_name": "string - Official company name",
    "revenue": "string or null - e.g., '$35M (ZoomInfo, March 2025)'",
    "revenue_source": "string or null - Source name",
    "employee_count": "string or null - e.g., '201-500 (LinkedIn)'",
    "employee_source": "string or null - Source name",
    "headquarters": "string or null - City, State/Country",
    "founded_year": "string or null",
    "ownership_type": "Public | Private | Subsidiary | PE-Backed",
    "parent_company": "string or null",
    "investors": ["array of investor names or empty"],
    "industry": "string",
    "sub_segment": "string or null",
    "business_model": "string - B2B, B2C, D2C, etc.",
    "citations": ["array of source URLs used"]
  },
  "recent_signals": [
    {
      "type": "financial | strategic | pricing | leadership | technology | intent",
      "headline": "string - Brief headline",
      "detail": "string - 1-2 sentence detail",
      "date": "string - YYYY-MM or YYYY-MM-DD",
      "source_url": "string - Full URL",
      "source_name": "string - e.g., 'ZoomInfo', 'BusinessWire'",
      "relevance_to_revology": "string - Why this matters for Revology's services",
      "is_intent_signal": "boolean - true if this indicates buying intent"
    }
  ],
  "intent_signals": [
    {
      "signal_type": "rfp | vendor_evaluation | technology_initiative | hiring",
      "description": "string - What the signal indicates",
      "timeframe": "string or null - When this was detected",
      "source": "string - Source URL",
      "fit_score": "perfect | good | moderate"
    }
  ],
  "hypothesis": {
    "primary_hypothesis": "string - Your hypothesis about their analytics/pricing pain points",
    "supporting_evidence": ["array of 2-4 evidence points"],
    "confidence": "high | medium | low"
  },
  "persona_angles": {
    "cfo_finance": {
      "hook": "string - Opening line for CFO",
      "supporting_point": "string - Supporting evidence",
      "question": "string - Question to pose"
    },
    "pricing_rgm": {
      "hook": "string",
      "supporting_point": "string",
      "question": "string"
    },
    "sales_commercial": {
      "hook": "string",
      "supporting_point": "string",
      "question": "string"
    },
    "ceo_gm": {
      "hook": "string",
      "supporting_point": "string",
      "question": "string"
    },
    "technology_analytics": {
      "hook": "string",
      "supporting_point": "string",
      "question": "string"
    }
  },
  "outreach_priority": {
    "recommended_personas": ["array of 1-3 persona keys, ordered by priority"],
    "urgency": "high | medium | low",
    "urgency_reason": "string - Why this urgency level",
    "cautions": ["array of things to be careful about"]
  },
  "research_gaps": ["array of data points that couldn't be verified"]
}

IMPORTANT:
- Include source URLs for every data point
- Be honest about confidence - if data is uncertain, lower confidence
- Intent signals are the most valuable - highlight these
- Empty arrays are fine if no data found
- All persona angles must be present even if generic`;
}

/**
 * Execute research using OpenAI's web search capabilities
 */
export async function executeResearchV3_1(
  input: ResearchInputV3_1,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<ResearchOutputV3_1> {
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let searchesPerformed = 0;

  onProgress?.('Starting research with OpenAI web search...');

  // Stage 1: Search phase with gpt-4o-search-preview (has built-in web search)
  onProgress?.('Stage 1: Executing web searches...');

  const searchPrompt = buildSearchPrompt(input);

  // Use the search-enabled model via Chat Completions API
  const searchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-search-preview',
      messages: [{ role: 'user', content: searchPrompt }],
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

  // Extract search results from the response
  let searchResultsText = searchData.choices?.[0]?.message?.content || '';

  // Count annotations/citations as proxy for searches performed
  const annotations = searchData.choices?.[0]?.message?.annotations || [];
  searchesPerformed = annotations.length > 0 ? Math.ceil(annotations.length / 3) : 5; // Estimate based on citations

  totalInputTokens += searchData.usage?.prompt_tokens || 0;
  totalOutputTokens += searchData.usage?.completion_tokens || 0;

  onProgress?.(`Found ${annotations.length} sources. Synthesizing...`);

  // Stage 2: Synthesis phase
  onProgress?.(`Stage 2: Synthesizing with ${input.researchDepth === 'deep' ? 'o1' : 'gpt-4o'}...`);

  const synthesisPrompt = buildSynthesisPrompt(searchResultsText, input);
  const synthesisModel = input.researchDepth === 'deep' ? 'o1' : 'gpt-4o';

  const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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

  // Parse the synthesis result
  let content = synthesisData.choices?.[0]?.message?.content || '';

  // Handle o1 which may wrap JSON in markdown
  if (content.includes('```json')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }

  let result: ResearchOutputV3_1;
  try {
    result = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse synthesis result: ${e}`);
  }

  // Calculate cost
  const executionTime = Date.now() - startTime;
  const searchCost = input.researchDepth === 'deep'
    ? (totalInputTokens / 1000) * COST_CONSTANTS_V3_1.O1_INPUT_PER_1K +
      (totalOutputTokens / 1000) * COST_CONSTANTS_V3_1.O1_OUTPUT_PER_1K
    : (totalInputTokens / 1000) * COST_CONSTANTS_V3_1.GPT4O_INPUT_PER_1K +
      (totalOutputTokens / 1000) * COST_CONSTANTS_V3_1.GPT4O_OUTPUT_PER_1K;

  const webSearchCost = searchesPerformed * COST_CONSTANTS_V3_1.WEB_SEARCH_PER_CALL;
  const estimatedCost = searchCost + webSearchCost;

  // Ensure all required fields exist
  result.metadata = {
    searches_performed: searchesPerformed,
    sources_cited: result.company_profile?.citations?.length || 0,
    models_used: {
      search: 'gpt-4o-search-preview',
      synthesis: synthesisModel,
    },
    execution_time_ms: executionTime,
    estimated_cost: estimatedCost,
  };

  // Ensure arrays exist
  result.recent_signals = result.recent_signals || [];
  result.intent_signals = result.intent_signals || [];
  result.research_gaps = result.research_gaps || [];
  result.company_profile = result.company_profile || {
    confirmed_name: input.companyName,
    ownership_type: 'Private',
    citations: [],
  };
  result.company_profile.citations = result.company_profile.citations || [];

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

  onProgress?.('Research complete!');

  return result;
}
