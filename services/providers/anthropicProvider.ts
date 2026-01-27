import { AIProviderInterface, ProviderConfig, ResearchResult, EmailResult, ProviderResponse } from './index';
import { TokenUsage } from '../../types';

export class AnthropicProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private async callAnthropic(prompt: string): Promise<{ content: string; usage: TokenUsage }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  private extractJSON(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }

  async generateResearch(prompt: string): Promise<ProviderResponse<ResearchResult>> {
    const schemaReminder = `
CRITICAL JSON SCHEMA REQUIREMENTS:
Your response MUST be valid JSON with these EXACT field types:

{
  "company_profile": { "confirmed_name": "string", "industry": "string", "sub_segment": "string", "estimated_revenue": "string", "employee_count": "string", "business_model": "string", "headquarters": "string", "market_position": "string" },
  "recent_signals": [{ "signal_type": "string", "description": "string", "source": "string", "date": "string", "relevance_to_revology": "string", "source_url": "string", "date_precision": "string", "credibility_score": number }],
  "pain_point_hypotheses": [{ "hypothesis": "string", "evidence": "string", "revology_solution_fit": "string" }],
  "persona_angles": {
    "cfo_finance": { "primary_hook": "string", "supporting_point": "string", "question_to_pose": "string" },
    "pricing_rgm": { "primary_hook": "string", "supporting_point": "string", "question_to_pose": "string" },
    "sales_commercial": { "primary_hook": "string", "supporting_point": "string", "question_to_pose": "string" },
    "ceo_gm": { "primary_hook": "string", "supporting_point": "string", "question_to_pose": "string" },
    "technology_analytics": { "primary_hook": "string", "supporting_point": "string", "question_to_pose": "string" }
  },
  "outreach_priority": { "recommended_personas": ["string"], "timing_notes": "string", "cautions": "string" },
  "research_confidence": { "overall_score": number, "gaps": ["string"], "financial_confidence": number, "signal_freshness": number, "source_quality": number, "search_coverage": number }
}

IMPORTANT:
- "recent_signals" MUST be an array (use [] if empty)
- "pain_point_hypotheses" MUST be an array (use [] if empty)
- "gaps" MUST be an array (use [] if empty)
- "recommended_personas" MUST be an array (use [] if empty)
- Do NOT use strings where arrays are expected
- Respond ONLY with valid JSON, no markdown code blocks`;

    const enrichedPrompt = `${prompt}

${schemaReminder}`;

    const result = await this.callAnthropic(enrichedPrompt);
    const parsed = JSON.parse(this.extractJSON(result.content));

    return {
      data: { format: 'rich', ...parsed },
      usage: result.usage,
    };
  }

  async generateEmail(prompt: string): Promise<ProviderResponse<EmailResult>> {
    const enrichedPrompt = `${prompt}

IMPORTANT: Respond ONLY with valid JSON (no markdown, no code blocks, no explanations) matching this exact schema:
{
  "subject": "string - email subject line",
  "body": "string - email body"
}`;

    const result = await this.callAnthropic(enrichedPrompt);

    return {
      data: JSON.parse(this.extractJSON(result.content)),
      usage: result.usage,
    };
  }
}
