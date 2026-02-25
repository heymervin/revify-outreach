/**
 * Research Engine V3.2 - Hybrid
 * Combines Tavily (website scraping + business databases) with AI synthesis
 * Supports both OpenAI (with web search) and Gemini providers
 * Used for "deep" research tier
 */

import {
  ResearchInputV3,
  ResearchOutputV3,
  COST_CONSTANTS_V3,
} from '@/types/researchTypesV3';
import { scrapeWebsite, searchBusinessDatabases } from './tavilyService';
import { generateGeminiCompletion } from '@/lib/services/geminiService';
import { autoFixResearchDates } from '@/lib/validation/dateAutoFixer';
import { validateResearch, stripInvalidSignals, extractDateErrors } from '@/lib/validation/researchSchemas';

export interface DeepResearchOptions {
  /** AI model to use for synthesis (e.g., 'gpt-4o', 'gemini-3-pro-preview') */
  model?: string;
  /** AI provider: 'openai' or 'gemini' */
  provider?: 'openai' | 'gemini';
}

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
1. Recent news about "${input.companyName}" from the last 3 months only
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
      "date": "string - YYYY-MM or YYYY-MM-DD format ONLY, see STRICT DATE FORMAT ENFORCEMENT below",
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
      "timeframe": "string or null - YYYY-MM format ONLY",
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

## FINANCIAL DATA MANDATORY SEARCH

**CRITICAL: Execute web search if data not in provided sources**

For PUBLIC companies (ownership_type: "Public"):
- STEP 1: Search provided data for ticker symbol, stock exchange (NYSE, NASDAQ), or phrases like "publicly traded"
- STEP 2: If public company identified, search for revenue in this order:
  a) Look for "10-K", "10-Q", "annual report", "SEC filing" in the data sources
  b) Look for financial data from Yahoo Finance, Bloomberg, investor relations pages
  c) Search for earnings reports, quarterly results, or press releases mentioning revenue
- STEP 3: **USE THESE EXACT SEARCH PATTERNS** (search the provided text for these phrases):
  * "revenue of $"
  * "annual revenue"
  * "total revenue"
  * "net sales"
  * "consolidated revenue"
  * Company ticker symbol + "revenue" (e.g., "ALG revenue")
- STEP 4: If revenue found, format as: "$X.XB (FY${currentYear - 1} from 10-K)" citing specific source
- STEP 5: If NO revenue found after thorough search, this is a CRITICAL FAILURE
  * DO NOT proceed without flagging as: "CRITICAL ERROR: Public company revenue not found despite mandatory search of SEC filings, annual reports, and financial databases in the provided text."
  * This likely means the data sources are incomplete, not that revenue doesn't exist

For PRIVATE companies (ownership_type: "Private" or "PE-Backed"):
- **MANDATORY ESTIMATION PROTOCOL** (follow in order):

  STEP 1: Search for explicit revenue mentions
  - Look for phrases: "revenue of $", "annual sales of $", "reported revenue"
  - Check ZoomInfo, Crunchbase, PitchBook estimates
  - Check news articles mentioning company size

  STEP 2: If no explicit revenue, calculate estimate using employee count
  - **REQUIRED FORMULA:** Revenue = Employee Count × Industry Revenue-per-Employee
  - **Industry Benchmarks** (use these if industry known):
    * Manufacturing: $200K-300K per employee
    * Software/Technology: $300K-500K per employee
    * Distribution/Wholesale: $500K-800K per employee
    * Professional Services: $150K-250K per employee
    * Retail: $100K-200K per employee
    * Healthcare: $200K-300K per employee
  - Example: 450 employees in plastics manufacturing → Estimated $90M-135M ($200K-300K per employee)

  STEP 3: Format estimate with methodology
  - Format: "Estimated $X-YM based on [employee count] employees × [industry benchmark] revenue-per-employee"
  - Example: "Estimated $90M-135M based on 450 employees × $200K-300K per employee (manufacturing benchmark)"

  STEP 4: If NO employee count available, state:
  - "Private company, no reliable revenue estimate available (employee count not found)"

  **CONSISTENCY CHECK:** If one private company received an estimate and another did not, ask yourself:
  - Did I search equally hard for both?
  - Did I apply the same methodology?
  - If not, apply estimation to both or document why one is impossible.

For SUBSIDIARY companies:
- Report parent company revenue AND subsidiary-specific revenue if available
- Format: "Parent: $X.XB (source); Subsidiary: estimated $XXXM based on [methodology]"

## INTENT SIGNAL SEARCH PROTOCOL (MANDATORY)

**STEP 1: Extract obvious intent signals from the data you ALREADY HAVE**

Before searching, scan ALL provided data (company website, LinkedIn, ZoomInfo, news) for:

a) **PERFECT fit signals** (manual work Revology automates):
   - "scraping", "manually scraping", "scraping product listings", "scraping competitor prices"
   - "spreadsheet", "Excel-based pricing", "manual pricing", "manual analysis"
   - "manually tracking", "manually monitoring"
   - Job descriptions mentioning manual data collection or price monitoring

b) **M&A / Capex signals** (already in your data):
   - Acquisitions, divestitures (look for dollar amounts like "$166M acquisition")
   - New facility openings, production line additions, equipment purchases
   - Funding rounds, investment announcements

c) **Technology initiative signals** (already in your data):
   - New software implementations mentioned (ERP, CRM, BI tools)
   - Digital transformation projects
   - Job titles for analytics, pricing, or commercial roles

d) **Conference/vendor evaluation signals** (already in your data):
   - Trade show participation, conference mentions
   - Earnings calls mentioning "pricing pressure", "vendor evaluation", or system changes

**STEP 2: Check if you have 3+ signals**

If you have 3+ intent signals from STEP 1, skip to STEP 3.

If you have <3 intent signals from STEP 1, perform exhaustive search:
- Job posting search (pricing analyst, BI, analytics, FP&A roles)
- Technology search (ERP, CRM, pricing platform mentions)
- Press release search (M&A, capex, investment announcements)
- Conference participation search

**STEP 3: Apply fit score using calibration guide**

- **perfect**: Manual work Revology automates (scraping, spreadsheets), active vendor RFP
- **good**: Hiring pricing/analytics roles, M&A integration, tech initiatives in adjacent domains
- **moderate**: General growth signals without direct pricing/analytics nexus

**SOURCE VALIDATION RULES (MANDATORY):**

**VALID SOURCES** for intent signals:
- ✅ Company career page job postings
- ✅ LinkedIn job postings (official company posts)
- ✅ Company press releases
- ✅ Company blog posts or LinkedIn company page updates
- ✅ News articles quoting company executives
- ✅ Conference speaker lists (company-sponsored)
- ✅ Earnings call transcripts
- ✅ SEC filings (for public companies)

**INVALID SOURCES** (reject these):
- ❌ ZoomInfo individual employee profiles
- ❌ LinkedIn individual employee profiles (unless confirming a public company announcement)
- ❌ Third-party speculation without company confirmation
- ❌ Recruiter job postings (not official company postings)
- ❌ Anonymous forum discussions (Reddit, Blind, Glassdoor)

**EXCEPTION: Employee profile data CAN be used IF:**
- The employee profile confirms a publicly announced initiative
- Multiple employees (3+) independently confirm the same signal
- The profile links to an official company source

**VALIDATION CHECK:**
For each intent signal, ask: "Is this from a company-level source, or an individual employee's profile?"
- If individual profile ONLY → Reject or downgrade to research_gaps
- If company-level source → Include with proper source attribution

**STEP 4: Validate**

If after STEP 1 and STEP 2 you still have <3 intent signals, state in research_gaps:
"CRITICAL GAP: Only [N] intent signals found despite thorough search across job postings, technology initiatives, capex/investment activity, and conference participation."

**IMPORTANT**: If you found M&A activity, capex investments, or manual work descriptions in the provided data but did NOT add them as intent signals, you have FAILED this protocol.

## STRICT ENFORCEMENT - DATE FORMATS

**YOU MUST CONVERT ALL DATES TO YYYY-MM OR YYYY-MM-DD FORMAT**

PROHIBITED FORMATS (you must convert these):
❌ "Dec 11, 2025" → ✅ CONVERT TO "2025-12-11"
❌ "December 2025" → ✅ CONVERT TO "2025-12"
❌ "Current (2023-2025)" → REJECT (range)
❌ "Recent" → REJECT (relative term)
❌ "1 week ago" → REJECT (relative term)
❌ "Q1 2024" → REJECT (too vague)
❌ "2024" → REJECT (year-only, too vague)
❌ "2023-2025" → REJECT (range)

REQUIRED CONVERSION TABLE:
- "Jan" OR "January" → "01"
- "Feb" OR "February" → "02"
- "Mar" OR "March" → "03"
- "Apr" OR "April" → "04"
- "May" → "05"
- "Jun" OR "June" → "06"
- "Jul" OR "July" → "07"
- "Aug" OR "August" → "08"
- "Sep" OR "September" → "09"
- "Oct" OR "October" → "10"
- "Nov" OR "November" → "11"
- "Dec" OR "December" → "12"

EXAMPLES OF CORRECT CONVERSIONS:
- "Dec 11, 2025" → "2025-12-11" ✅
- "December 2025" → "2025-12" ✅
- "Feb 3, 2024" → "2024-02-03" ✅
- "Q3 2025" (if you know it's October) → "2025-10" ✅
- "4mo" ago (if current date is Feb 2026) → "2025-10" ✅

VALIDATION RULE:
If you cannot determine a specific month and year for a signal, DO NOT include it in recent_signals or intent_signals.
Instead, add to research_gaps: "Signal [description] found but date could not be verified to month-level precision."

**FALLBACK FOR IMPRECISE DATES:**
If a signal is valuable but lacks month-level precision, you have THREE OPTIONS (in priority order):

1. **Cross-reference with recent_signals**: If the same event appears in recent_signals with a date, use that date for the intent_signal timeframe
2. **Use approximate date**: If source says "recent" or "current", use current month (2026-02)
3. **Use signal without date**: Set timeframe to null and add to research_gaps: "Date not available for [signal description]"

**CRITICAL: Do NOT discard valuable signals due to date imprecision alone.**

EXAMPLE CORRECT BEHAVIOR:
- ❌ WRONG: "Hiring for pricing analyst found but date unclear, signal excluded"
- ✅ RIGHT: Add signal with timeframe: null, note in research_gaps: "Date not available for pricing analyst hiring signal from LinkedIn"

**VALIDATION CHECK:**
If you found M&A activity, capex, job postings, or technology initiatives in recent_signals but did NOT add them to intent_signals, you have violated this protocol. Signals are MORE important than date precision.

**FINAL CHECK BEFORE OUTPUT:**
Scan every "date" and "timeframe" field in your JSON output. If you see ANY date that doesn't match YYYY-MM or YYYY-MM-DD format, you have FAILED this requirement. Go back and convert it.

## SERP RESULT VALIDATION (CRITICAL)

**Company Name Exact Match Requirement:**
When processing SERP news results, you MUST validate that each result is actually about the target company:

**REJECT these patterns:**
- ❌ "Polyplastics Corporation" when target is "All American Poly"
- ❌ "Alamo Rent-A-Car" when target is "Alamo Group Inc."
- ❌ "Almo Real Estate" when target is "Almo Corporation"

**ACCEPT only:**
- ✅ Exact company name match (case-insensitive)
- ✅ Subsidiary name mentioned alongside parent company
- ✅ Company ticker symbol mentioned (e.g., "ALG" for Alamo Group)

**VALIDATION RULE:**
For each SERP result you include in recent_signals, verify the company name appears in the headline or detail. If uncertain, check:
1. Does the article mention the exact company name?
2. Does it mention the company's location/headquarters?
3. Does it mention company-specific products/brands?

If none of these match, REJECT the result as likely referring to a different company.

## PRE-OUTPUT VALIDATION CHECKLIST

Before you output your JSON, verify ALL of these requirements:

### ✅ PUBLIC COMPANY REVENUE CHECK
- [ ] If ownership_type is "Public", did you find revenue from SEC/financial sources?
- [ ] If not found, did you flag "CRITICAL ERROR: Public company revenue not found..." in research_gaps?

### ✅ INTENT SIGNALS CHECK
- [ ] Did you scan the provided data for M&A, capex, acquisitions, manual scraping/work?
- [ ] If you found any of these in the data, did you add them to intent_signals array?
- [ ] Do you have at least 3 intent signals (or flagged the gap in research_gaps)?
- [ ] Did you apply fit_score correctly (manual work = perfect, not good)?

### ✅ DATE FORMAT CHECK
- [ ] Scan EVERY date field in recent_signals array
- [ ] Scan EVERY timeframe field in intent_signals array
- [ ] Are ALL dates in YYYY-MM or YYYY-MM-DD format?
- [ ] Did you convert "Dec 11, 2025" to "2025-12-11"?
- [ ] Did you convert "December 2025" to "2025-12"?

If ANY checkbox above is unchecked, DO NOT OUTPUT YET. Go back and fix the issue.

IMPORTANT:
- Include source URLs for every data point
- Combine data from ALL sources (website, databases, web search)
- Be honest about confidence
- Intent signals are the most valuable — follow the MANDATORY search protocol above
- Every date field MUST comply with the strict date format rules above`;
}

/**
 * Execute hybrid research using Tavily + AI (OpenAI or Gemini)
 *
 * When provider is 'openai': Uses OpenAI web search (Stage 1c) + OpenAI synthesis (Stage 2)
 * When provider is 'gemini': Skips OpenAI web search, uses Gemini for synthesis (Stage 2)
 *   Gemini relies more on Tavily data since it lacks built-in web search
 */
export async function executeResearchV3_2(
  input: ResearchInputV3,
  aiKey: string,
  tavilyKey: string,
  onProgress?: (message: string) => void,
  customPrompt?: string | null,
  options?: DeepResearchOptions
): Promise<ResearchOutputV3> {
  const provider = options?.provider || 'openai';
  const model = options?.model || (provider === 'gemini' ? 'gemini-3-pro-preview' : 'gpt-4o');
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let tavilySearches = 0;
  const allSources: string[] = [];

  onProgress?.(`Starting hybrid research (Tavily + ${provider === 'gemini' ? 'Gemini' : 'OpenAI'})...`);

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

  onProgress?.(`Found ${allSources.length} sources from Tavily.`);

  // Stage 1c: Web search for news and signals (OpenAI only — Gemini relies on Tavily data)
  let searchResultsText = '';
  let openaiSearches = 0;

  let hybridPrompt: string;
  if (customPrompt) {
    hybridPrompt = customPrompt
      // Support {variable} format (single braces)
      .replace(/\{company_name\}/g, input.companyName)
      .replace(/\{industry\}/g, input.industry)
      .replace(/\{website_content\}/g, websiteContent || 'No website content available.')
      .replace(/\{database_content\}/g, databaseContent || 'No database results available.')
      .replace(/\{current_year\}/g, String(currentYear))
      .replace(/\{previous_year\}/g, String(previousYear))
      // Support {{variable}} format (double braces) for legacy/custom prompts
      .replace(/\{\{company\}\}/g, input.companyName)
      .replace(/\{\{industry\}\}/g, input.industry)
      .replace(/\{\{website\}\}/g, input.website || 'Not provided')
      .replace(/\{\{website_content\}\}/g, websiteContent || 'No website content available.')
      .replace(/\{\{database_content\}\}/g, databaseContent || 'No database results available.')
      .replace(/\{\{serp_news\}\}/g, 'SERP news is merged post-synthesis in Deep research')
      .replace(/\{\{search_queries\}\}/g, 'Search queries tracked in metadata');
    onProgress?.('Using custom research prompt...');
  } else {
    hybridPrompt = buildHybridPrompt(input, websiteContent, databaseContent);
  }

  // Store hybrid prompt for metadata
  const storedHybridPrompt = hybridPrompt;

  if (provider === 'openai') {
    // OpenAI web search for additional news and signals
    onProgress?.('Searching with OpenAI web search...');

    const searchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
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
    searchResultsText = searchData.choices?.[0]?.message?.content || '';

    const annotations = searchData.choices?.[0]?.message?.annotations || [];
    openaiSearches = annotations.length > 0 ? Math.ceil(annotations.length / 3) : 3;

    totalInputTokens += searchData.usage?.prompt_tokens || 0;
    totalOutputTokens += searchData.usage?.completion_tokens || 0;

    onProgress?.(`Found ${annotations.length} additional sources from OpenAI.`);
  } else {
    // Gemini: no web search stage — use Tavily data directly as "search results"
    onProgress?.('Using Tavily data for research context (Gemini mode)...');
    searchResultsText = hybridPrompt; // Pass the full context as search results for synthesis
  }

  // Stage 2: Synthesis — provider-aware
  const synthesisPrompt = buildSynthesisPrompt(searchResultsText, input);

  // Store synthesis prompt for metadata
  const storedSynthesisPrompt = synthesisPrompt;

  let content: string;
  let synthesisModelUsed: string;

  onProgress?.(`Synthesizing with ${model}...`);

  if (provider === 'gemini') {
    // Gemini synthesis
    synthesisModelUsed = model;
    const geminiResult = await generateGeminiCompletion(aiKey, model, synthesisPrompt, {
      temperature: 0.2,
      maxOutputTokens: 8192,
    });

    content = geminiResult.content;
    totalInputTokens += geminiResult.inputTokens;
    totalOutputTokens += geminiResult.outputTokens;
  } else {
    // OpenAI synthesis — use o1 for deep, otherwise use configured model
    synthesisModelUsed = model === 'gpt-4o' ? 'o1' : model;

    const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: synthesisModelUsed,
        messages: [{ role: 'user', content: synthesisPrompt }],
        ...(synthesisModelUsed !== 'o1' ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!synthesisResponse.ok) {
      const error = await synthesisResponse.json().catch(() => ({}));
      throw new Error(`OpenAI Synthesis API error: ${error.error?.message || synthesisResponse.statusText}`);
    }

    const synthesisData = await synthesisResponse.json();

    totalInputTokens += synthesisData.usage?.prompt_tokens || 0;
    totalOutputTokens += synthesisData.usage?.completion_tokens || 0;

    content = synthesisData.choices?.[0]?.message?.content || '';
  }

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

  // Validate and auto-fix dates (NEW VALIDATION LAYER)
  const { fixed, rejected } = autoFixResearchDates(result);
  if (fixed > 0) {
    console.log(`[Deep Research] Auto-fixed ${fixed} date format issues for ${input.companyName}`);
  }
  if (rejected > 0) {
    console.warn(`[Deep Research] Rejected ${rejected} unparseable dates for ${input.companyName}`);
  }

  // Validate with strict Zod schema
  const validation = validateResearch(result, 'deep');
  if (!validation.success) {
    const dateErrors = extractDateErrors(result);
    if (dateErrors.length > 0) {
      console.error(`[Deep Research] Date validation errors for ${input.companyName}:`, dateErrors);
    }

    // Attempt to salvage by stripping invalid signals
    console.log(`[Deep Research] Attempting to salvage valid data...`);
    result = stripInvalidSignals(result, 'deep') as ResearchOutputV3;

    const revalidation = validateResearch(result, 'deep');
    if (revalidation.success) {
      console.log(`[Deep Research] Successfully salvaged research data`);
    } else {
      console.warn(`[Deep Research] Partial validation failure - proceeding with cleaned data`);
    }
  } else {
    console.log(`[Deep Research] All dates validated successfully for ${input.companyName}`);
  }

  // Calculate cost based on provider
  const executionTime = Date.now() - startTime;
  let tokenCost: number;
  if (provider === 'gemini') {
    // Gemini pricing
    tokenCost = (totalInputTokens / 1_000_000) * 0.075 +
      (totalOutputTokens / 1_000_000) * 0.30;
  } else {
    tokenCost = synthesisModelUsed === 'o1'
      ? (totalInputTokens / 1000) * COST_CONSTANTS_V3.O1_INPUT_PER_1K +
        (totalOutputTokens / 1000) * COST_CONSTANTS_V3.O1_OUTPUT_PER_1K
      : (totalInputTokens / 1000) * COST_CONSTANTS_V3.GPT4O_INPUT_PER_1K +
        (totalOutputTokens / 1000) * COST_CONSTANTS_V3.GPT4O_OUTPUT_PER_1K;
  }

  const tavilyCost = tavilySearches * COST_CONSTANTS_V3.TAVILY_PER_CALL;
  const openaiSearchCost = openaiSearches * COST_CONSTANTS_V3.WEB_SEARCH_PER_CALL;
  const estimatedCost = tokenCost + tavilyCost + openaiSearchCost;

  // Ensure all required fields exist
  const searchLabel = provider === 'gemini' ? 'Tavily' : 'gpt-4o-search-preview + Tavily';
  result.metadata = {
    searches_performed: tavilySearches + openaiSearches,
    sources_cited: (result.company_profile?.citations?.length || 0) + allSources.length,
    models_used: {
      search: searchLabel,
      synthesis: synthesisModelUsed,
    },
    execution_time_ms: executionTime,
    estimated_cost: estimatedCost,
    raw_prompt: storedSynthesisPrompt,  // Main prompt that generates the output
    hybrid_prompt: storedHybridPrompt,  // First stage prompt (search context)
    synthesis_prompt: storedSynthesisPrompt,  // Second stage prompt (same as raw_prompt)
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
