import { AIProviderInterface, ProviderConfig, ResearchResult, EmailResult, ProviderResponse } from './index';
import { TokenUsage } from '../../types';

// Helper to create persona angle schema
const personaAngleSchema = {
  type: 'object',
  properties: {
    primary_hook: { type: 'string' },
    supporting_point: { type: 'string' },
    question_to_pose: { type: 'string' }
  },
  required: ['primary_hook', 'supporting_point', 'question_to_pose'],
  additionalProperties: false
};

// JSON Schema for email output (OpenAI strict mode)
const EMAIL_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' }
  },
  required: ['subject', 'body'],
  additionalProperties: false
};

// JSON Schema for research output (OpenAI strict mode requires additionalProperties: false)
const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    company_profile: {
      type: 'object',
      properties: {
        confirmed_name: { type: 'string' },
        industry: { type: 'string' },
        sub_segment: { type: 'string' },
        estimated_revenue: { type: 'string' },
        employee_count: { type: 'string' },
        business_model: { type: 'string' },
        headquarters: { type: 'string' },
        market_position: { type: 'string' }
      },
      required: ['confirmed_name', 'industry', 'sub_segment', 'estimated_revenue', 'employee_count', 'business_model', 'headquarters', 'market_position'],
      additionalProperties: false
    },
    recent_signals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          signal_type: { type: 'string' },
          description: { type: 'string' },
          source: { type: 'string' },
          date: { type: 'string' },
          relevance_to_revology: { type: 'string' },
          source_url: { type: 'string' },
          date_precision: { type: 'string' },
          credibility_score: { type: 'number' }
        },
        required: ['signal_type', 'description', 'source', 'date', 'relevance_to_revology', 'source_url', 'date_precision', 'credibility_score'],
        additionalProperties: false
      }
    },
    pain_point_hypotheses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hypothesis: { type: 'string' },
          evidence: { type: 'string' },
          revology_solution_fit: { type: 'string' }
        },
        required: ['hypothesis', 'evidence', 'revology_solution_fit'],
        additionalProperties: false
      }
    },
    persona_angles: {
      type: 'object',
      properties: {
        cfo_finance: personaAngleSchema,
        pricing_rgm: personaAngleSchema,
        sales_commercial: personaAngleSchema,
        ceo_gm: personaAngleSchema,
        technology_analytics: personaAngleSchema
      },
      required: ['cfo_finance', 'pricing_rgm', 'sales_commercial', 'ceo_gm', 'technology_analytics'],
      additionalProperties: false
    },
    outreach_priority: {
      type: 'object',
      properties: {
        recommended_personas: { type: 'array', items: { type: 'string' } },
        timing_notes: { type: 'string' },
        cautions: { type: 'string' }
      },
      required: ['recommended_personas', 'timing_notes', 'cautions'],
      additionalProperties: false
    },
    research_confidence: {
      type: 'object',
      properties: {
        overall_score: { type: 'number' },
        gaps: { type: 'array', items: { type: 'string' } },
        financial_confidence: { type: 'number' },
        signal_freshness: { type: 'number' },
        source_quality: { type: 'number' },
        search_coverage: { type: 'number' }
      },
      required: ['overall_score', 'gaps', 'financial_confidence', 'signal_freshness', 'source_quality', 'search_coverage'],
      additionalProperties: false
    }
  },
  required: ['company_profile', 'recent_signals', 'pain_point_hypotheses', 'persona_angles', 'outreach_priority', 'research_confidence'],
  additionalProperties: false
};

export class OpenAIProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private async callOpenAI(prompt: string, schema?: object, schemaName: string = 'output'): Promise<{ content: string; usage: TokenUsage }> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    };

    // Use structured outputs with JSON schema if provided
    if (schema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema: schema
        }
      };
    } else {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  async generateResearch(prompt: string): Promise<ProviderResponse<ResearchResult>> {
    const enrichedPrompt = `${prompt}

IMPORTANT: Your response must be valid JSON matching the exact schema provided. All array fields (recent_signals, pain_point_hypotheses, gaps, recommended_personas) MUST be arrays, even if empty. Do not use strings where arrays are expected.`;

    const result = await this.callOpenAI(enrichedPrompt, RESEARCH_SCHEMA, 'research_output');
    const parsed = JSON.parse(result.content);

    return {
      data: { format: 'rich', ...parsed },
      usage: result.usage,
    };
  }

  async generateEmail(prompt: string): Promise<ProviderResponse<EmailResult>> {
    const enrichedPrompt = `${prompt}

IMPORTANT: Respond with valid JSON containing exactly these two fields:
- "subject": the email subject line (string)
- "body": the email body content (string)

Do NOT include any other fields like "persona", "subject_line", "email_body", "follow_up", etc.`;

    const result = await this.callOpenAI(enrichedPrompt, EMAIL_SCHEMA, 'email_output');
    const parsed = JSON.parse(result.content);

    // Normalize field names in case the model doesn't follow instructions
    const normalizedData: EmailResult = {
      subject: parsed.subject || parsed.subject_line || '',
      body: parsed.body || parsed.email_body || '',
    };

    return {
      data: normalizedData,
      usage: result.usage,
    };
  }
}
