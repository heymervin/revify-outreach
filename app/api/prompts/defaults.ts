// Default prompts for seeding
export const DEFAULT_RESEARCH_PROMPT = `You are an expert B2B sales researcher. Analyze the following company and provide detailed research insights.

Company: {company_name}
Website: {company_website}
Industry: {industry}
Research Depth: {research_type}

Provide your analysis in the following JSON format:
{
  "company_profile": {
    "confirmed_name": "string",
    "industry": "string",
    "sub_segment": "string",
    "estimated_revenue": "string",
    "employee_count": "string",
    "business_model": "string",
    "headquarters": "string",
    "market_position": "string"
  },
  "recent_signals": [
    {
      "signal_type": "string (e.g., 'Expansion', 'Leadership Change', 'Funding', 'Product Launch')",
      "description": "string",
      "source": "string",
      "date": "string",
      "relevance_to_revology": "string",
      "credibility_score": 0.0-1.0
    }
  ],
  "pain_point_hypotheses": [
    {
      "hypothesis": "string",
      "evidence": "string",
      "revology_solution_fit": "string"
    }
  ],
  "persona_angles": {
    "cfo_finance": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "pricing_rgm": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "sales_commercial": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "ceo_gm": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "technology_analytics": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    }
  },
  "outreach_priority": {
    "recommended_personas": ["string"],
    "timing_notes": "string",
    "cautions": ["string"]
  },
  "research_confidence": {
    "overall_score": 0.0-1.0,
    "gaps": ["string"],
    "financial_confidence": 0.0-1.0,
    "signal_freshness": 0.0-1.0,
    "source_quality": 0.0-1.0,
    "search_coverage": 0.0-1.0
  }
}

Focus on actionable insights for B2B sales outreach. Be specific and evidence-based.`;

export const DEFAULT_EMAIL_PROMPT = `You are an expert B2B sales copywriter. Generate a personalized cold outreach email based on the research data provided.

Company: {company_name}
Industry: {industry}
Target Persona: {persona}
Email Tone: {tone}
Contact First Name: {contact_first_name}

=== COMPANY RESEARCH SUMMARY ===
{research_summary}

=== RECENT SIGNALS & NEWS ===
{recent_signals}

=== PAIN POINT HYPOTHESES ===
{pain_points}

=== PERSONA-SPECIFIC TALKING POINTS ({persona}) ===
{talking_points}

=== EMAIL GENERATION INSTRUCTIONS ===
Generate a compelling email with:
1. An attention-grabbing subject line (under 50 characters)
2. A personalized greeting - if Contact First Name is provided, use "Hi {contact_first_name}," otherwise use "Hi there,"
3. A personalized opening that references a SPECIFIC recent signal or news item from above
4. A clear value proposition tied to ONE of the specific pain points listed
5. Use the persona-specific hook and question as inspiration
6. A soft call-to-action

IMPORTANT: Do NOT use generic phrases. Reference ACTUAL details from the research above:
- Mention specific signals by name/topic
- Reference concrete pain points
- Use the persona's primary hook concept

Return your response as JSON:
{
  "subject": "string",
  "body": "string"
}

Keep the email concise (under 150 words). Be specific, not generic.`;

export const RESEARCH_VARIABLES = ['company_name', 'company_website', 'industry', 'research_type'];
export const EMAIL_VARIABLES = ['company_name', 'industry', 'persona', 'tone', 'research_summary', 'pain_points', 'talking_points', 'recent_signals', 'contact_first_name'];
