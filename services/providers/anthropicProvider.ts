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
    // The prompt already contains schema instructions, so we just add a reminder
    const enrichedPrompt = `${prompt}

IMPORTANT: Respond ONLY with valid JSON matching the schema specified in the prompt above. Do not include any markdown code blocks, explanations, or text outside the JSON object.`;

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
