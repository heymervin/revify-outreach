import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const PROMPT_ID = 'dc7ac51c-1c1f-4c21-a062-9f6bc795a761';

const CORRECTED_DEEP_RESEARCH_PROMPT = `  <role>
  You are a senior Revenue Growth Analytics research analyst preparing intelligence
  briefs for B2B sales outreach. You specialize in identifying pricing inefficiencies,
  margin optimization opportunities, and commercial analytics gaps in mid-market
  companies across Manufacturing, Retail, CPG, and Distribution industries.
  </role>


  <task>
  Synthesize the research data below into a structured intelligence brief
  that will enable personalized, insight-led outreach emails.

  TARGET COMPANY:
  - Company Name: {{company}}
  - Industry: {{industry}}
  - Website: {{website}}
  </task>

  <data_sources>
  ## Company Website Content (Tavily)
  {{website_content}}

  ## Business Database Results (Tavily)
  {{database_content}}

  Note: Recent news and signals from SERP API are merged into the analysis after initial synthesis.
  </data_sources>

  <research_instructions>
  1. COMPANY PROFILE (synthesize from ALL sources above)
     - Confirm/determine industry vertical and sub-segment
     - Estimate company size (revenue range, employee count) - MUST cite source
     - Revenue source: note where the revenue figure came from (e.g., "ZoomInfo", "Annual Report")
     - Employee source: note where the employee count came from (e.g., "LinkedIn", "Company Website")
     - Identify business model (B2B, B2C, hybrid, distribution model)
     - Note geographic footprint and market position
     - Ownership type: Public, Private, Subsidiary, or PE-Backed
     - Parent company: if subsidiary, identify the parent organization
     - Key investors: if PE-backed or recently funded, list known investors
     - ONLY use information found in the data sources above

  2. RECENT SIGNALS (prioritize SERP API news, validate with other sources)
     For each signal you include:
     - type: One of 'financial', 'strategic', 'pricing', 'leadership', 'technology', 'industry', 'intent'
     - headline: Short headline summarizing the signal
     - detail: Specific, detailed description of the signal
     - source_name: Name of the source publication/site
     - source_url: MUST include the full URL from the data sources
     - date: Use the specific date from the sources (YYYY-MM-DD or YYYY-MM format)
     - relevance_to_revology: How this signal relates to pricing/analytics opportunities
     - is_intent_signal: true if this indicates active buying behavior or vendor evaluation

     CRITICAL RULES:
     - Only include signals from the last 12 months
     - Every signal MUST have a source_url from the data above
     - If no recent signals found, explicitly state this in research_gaps
     - Flag any signal that indicates active buying intent with is_intent_signal: true

  3. INTENT SIGNALS (MOST VALUABLE - extract from all sources)
     Look specifically for:
     - RFP announcements related to analytics, pricing, or consulting
     - Vendor evaluations for pricing tools, BI platforms, or analytics solutions
     - Technology initiatives (new ERP, analytics, pricing tool deployments)
     - Hiring signals: job postings for analytics, pricing, finance, or data roles

     For each intent signal, rate the fit_score:
     - "perfect": Directly aligns with Revology's services (pricing, margin analytics)
     - "good": Strong adjacency (analytics transformation, commercial strategy)
     - "moderate": Indirect relevance (general technology or process changes)

     If no intent signals found, return an empty array and note in research_gaps.

  4. STRATEGIC HYPOTHESIS
     Based on all signals and data, form a single primary hypothesis about the company's
     most likely pain point that Revology can solve. This should be:
     - Specific to the company (not generic industry challenges)
     - Supported by 2-4 concrete evidence points from the research
     - Rated for confidence: "high" (strong evidence), "medium" (reasonable inference), "low" (speculative)

     If insufficient data: state "Insufficient verified data to form specific hypothesis" with low confidence.

  5. PERSONA-SPECIFIC ANGLES
     For each target persona, identify the specific hook that would resonate:
     - CFO/Finance: Financial metrics, margin pressure, ROI focus
     - Pricing/RGM Lead: Pricing complexity, competitive dynamics, analytics gaps
     - Sales/Commercial Leader: Sales productivity, customer profitability, quota
     - CEO/GM: Strategic growth, competitive positioning, transformation
     - Technology/Analytics: Data infrastructure, AI/ML capabilities, integration

     Base angles on actual signals found. If insufficient data, acknowledge limitations.

  6. OUTREACH PRIORITY
     - Recommend 1-3 personas most likely to engage based on the research
     - Assess urgency: "high" (active buying signals, time-sensitive triggers), "medium" (relevant signals but no urgency), "low" (limited signals)
     - Provide urgency_reason explaining the assessment
     - List any cautions (e.g., recent layoffs, active competitor engagement, sensitive timing)

  7. RESEARCH GAPS
     List any specific information that could NOT be found or verified:
     - Missing financial data
     - Unknown ownership structure
     - Lack of recent news coverage
     - Unverified employee counts
     - Any other gaps that limit confidence
  </research_instructions>

  <output_schema>
  Respond with ONLY valid JSON matching this exact structure:

  {
    "company_profile": {
      "confirmed_name": "string - Official company name",
      "industry": "string",
      "sub_segment": "string or null",
      "estimated_revenue": "string with source citation or 'Not found in sources'",
      "revenue_source": "string or null - where revenue data came from",
      "employee_count": "string with source citation or 'Not found in sources'",
      "employee_source": "string or null - where employee data came from",
      "business_model": "string - B2B, B2C, D2C, etc.",
      "headquarters": "string or null - City, State/Country",
      "founded_year": "string or null",
      "ownership_type": "Public | Private | Subsidiary | PE-Backed",
      "parent_company": "string or null",
      "investors": ["array of investor names or empty"],
      "market_position": "string or null",
      "citations": ["array of source URLs used"]
    },
    "recent_signals": [
      {
        "type": "financial | strategic | pricing | leadership | technology | industry | intent",
        "headline": "string - short headline",
        "detail": "string - detailed description",
        "date": "string - YYYY-MM or YYYY-MM-DD",
        "source_url": "string - MUST be from data sources above",
        "source_name": "string - name of the publication/site",
        "relevance_to_revology": "string",
        "is_intent_signal": false
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
  </output_schema>

  <quality_standards>
  - Every signal MUST have a source_url from the data sources provided
  - Signal dates MUST be specific (month/year minimum) - no "2023" or "recent"
  - If revenue/employee data found, cite the specific source (e.g., "ZoomInfo", "Company Website")
  - If financial data not found, explicitly state "Not found in sources"
  - The hypothesis must be actionable (something Revology can help with)
  - Persona hooks must be distinct (don't repeat the same angle)
  - Intent signals are the MOST VALUABLE output - search thoroughly for buying indicators
  - Never invent or assume information not present in the data sources
  - Prioritize SERP API news as most recent/credible
  - Cross-reference business database data with website content for accuracy
  - Include ownership_type even if best guess - note confidence in research_gaps if uncertain
  - research_gaps should be honest about what data was NOT available
  </quality_standards>`;

async function updatePrompt() {
  try {
    console.log('=== Updating Deep Research Prompt ===\n');

    // First, read current prompt to confirm
    const { data: current, error: readError } = await supabase
      .from('prompt_templates')
      .select('id, name, content')
      .eq('id', PROMPT_ID)
      .single();

    if (readError) {
      console.error('Error reading prompt:', readError);
      return;
    }

    console.log(`Found prompt: "${current.name}" (${PROMPT_ID})`);
    console.log(`Current length: ${current.content.length} chars`);
    console.log(`New length: ${CORRECTED_DEEP_RESEARCH_PROMPT.length} chars\n`);

    // Verify schema changes
    const newContent = CORRECTED_DEEP_RESEARCH_PROMPT;
    console.log('--- Schema Verification ---');
    console.log(`✓ Has "hypothesis" object: ${newContent.includes('"hypothesis": {')}`);
    console.log(`✓ Has intent_signals: ${newContent.includes('"intent_signals"')}`);
    console.log(`✓ Has research_gaps: ${newContent.includes('"research_gaps"')}`);
    console.log(`✓ Has ownership_type: ${newContent.includes('"ownership_type"')}`);
    console.log(`✓ Has parent_company: ${newContent.includes('"parent_company"')}`);
    console.log(`✓ Has investors: ${newContent.includes('"investors"')}`);
    console.log(`✓ Has revenue_source: ${newContent.includes('"revenue_source"')}`);
    console.log(`✓ Has employee_source: ${newContent.includes('"employee_source"')}`);
    console.log(`✓ Has urgency: ${newContent.includes('"urgency"')}`);
    console.log(`✓ Has urgency_reason: ${newContent.includes('"urgency_reason"')}`);
    console.log(`✗ Has pain_point_hypotheses (should be false): ${newContent.includes('pain_point_hypotheses')}`);
    console.log(`✗ Has research_confidence (should be false): ${newContent.includes('"research_confidence"')}`);

    // Update the prompt
    const { data, error } = await supabase
      .from('prompt_templates')
      .update({ content: CORRECTED_DEEP_RESEARCH_PROMPT })
      .eq('id', PROMPT_ID)
      .select('id, name, content');

    if (error) {
      console.error('\nError updating prompt:', error);
      return;
    }

    console.log('\n✅ Prompt updated successfully!');
    console.log(`Updated: "${data[0].name}" (${data[0].id})`);
    console.log(`New content length: ${data[0].content.length} chars`);

    // Verify the update
    console.log('\n--- Post-Update Verification ---');
    const updatedContent = data[0].content;
    const hasHypothesisObj = updatedContent.includes('"hypothesis": {');
    const hasIntentSignals = updatedContent.includes('"intent_signals"');
    const hasResearchGaps = updatedContent.includes('"research_gaps"');
    const hasNoPainPoints = !updatedContent.includes('pain_point_hypotheses');
    const hasNoResearchConfidence = !updatedContent.includes('"research_confidence"');
    const hasUrgency = updatedContent.includes('"urgency"');
    const hasUrgencyReason = updatedContent.includes('"urgency_reason"');

    const allCorrect = hasHypothesisObj && hasIntentSignals && hasResearchGaps &&
                       hasNoPainPoints && hasNoResearchConfidence && hasUrgency && hasUrgencyReason;

    if (allCorrect) {
      console.log('✅ All schema fields verified correctly!');
    } else {
      console.log('⚠️ Some fields may not be correct - review output above');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

updatePrompt();
