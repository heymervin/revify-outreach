import { AIProviderInterface, ProviderConfig, ResearchResult, EmailResult, ProviderResponse } from './index';
import { TokenUsage } from '../../types';

export class OpenAIProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private async callOpenAI(prompt: string): Promise<{ content: string; usage: TokenUsage }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
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
    // The prompt already contains schema instructions, so we just add a reminder
    const enrichedPrompt = `${prompt}

IMPORTANT: Your response must be valid JSON matching the schema specified in the prompt above. Do not include any markdown code blocks or explanations outside the JSON.`;

    const result = await this.callOpenAI(enrichedPrompt);
    const parsed = JSON.parse(result.content);

    return {
      data: { format: 'rich', ...parsed },
      usage: result.usage,
    };
  }

  async generateEmail(prompt: string): Promise<ProviderResponse<EmailResult>> {
    const enrichedPrompt = `${prompt}

Respond with valid JSON matching this exact schema:
{
  "subject": "string - email subject line",
  "body": "string - email body"
}`;

    const result = await this.callOpenAI(enrichedPrompt);

    return {
      data: JSON.parse(result.content),
      usage: result.usage,
    };
  }
}
