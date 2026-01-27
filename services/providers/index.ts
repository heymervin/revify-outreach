import { TokenUsage, RichResearchOutput } from '../../types';

// Legacy research result (for backward compatibility)
export interface LegacyResearchResult {
  format: 'legacy';
  brief: string;
  hypotheses: string[];
  sentimentScore: number;
  keyTrends: { name: string; value: number }[];
}

// Rich research result (new format)
export interface RichResearchResult extends RichResearchOutput {
  format: 'rich';
}

// Union type - providers can return either format
export type ResearchResult = LegacyResearchResult | RichResearchResult;

export interface EmailResult {
  subject: string;
  body: string;
}

export interface ProviderResponse<T> {
  data: T;
  usage: TokenUsage;
}

export interface AIProviderInterface {
  generateResearch(prompt: string): Promise<ProviderResponse<ResearchResult>>;
  generateEmail(prompt: string): Promise<ProviderResponse<EmailResult>>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
}
