// lib/models/getModelConfig.ts

import { createAdminClient } from '@/lib/supabase/server';

export interface ModelConfiguration {
  id: string;
  organization_id: string;
  news_signals_model: 'serp-api' | 'tavily' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
  quick_research_model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gpt-4o-mini' | 'gpt-4o';
  standard_research_model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gpt-4o-mini' | 'gpt-4o';
  deep_research_model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gpt-4o' | 'gpt-4o-mini';
  email_drafting_model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gpt-4o' | 'gpt-4o-mini';
  web_scraping_service: 'tavily' | 'serp-api' | 'firecrawl';
  serp_api_key_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get model configuration for an organization
 */
export async function getModelConfig(
  organizationId: string
): Promise<ModelConfiguration | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('[Models] Failed to fetch model config:', error);
    return null;
  }

  return data as ModelConfiguration;
}

/**
 * Get model for a specific operation type
 */
export async function getModelForOperation(
  organizationId: string,
  operation: 'news' | 'quick' | 'standard' | 'deep' | 'email' | 'scraping'
): Promise<string> {
  const config = await getModelConfig(organizationId);

  if (!config) {
    // Return defaults if no config exists
    const defaults = {
      news: 'serp-api',
      quick: 'gemini-3-flash-preview',
      standard: 'gemini-3-flash-preview',
      deep: 'gemini-3-pro-preview',
      email: 'gemini-3-pro-preview',
      scraping: 'tavily',
    };
    return defaults[operation];
  }

  const mapping = {
    news: config.news_signals_model,
    quick: config.quick_research_model,
    standard: config.standard_research_model,
    deep: config.deep_research_model,
    email: config.email_drafting_model,
    scraping: config.web_scraping_service,
  };

  return mapping[operation];
}

/**
 * Default model configuration
 */
export const DEFAULT_MODEL_CONFIG: Omit<ModelConfiguration, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'serp_api_key_encrypted'> = {
  news_signals_model: 'serp-api',
  quick_research_model: 'gemini-3-flash-preview',
  standard_research_model: 'gemini-3-flash-preview',
  deep_research_model: 'gemini-3-pro-preview',
  email_drafting_model: 'gemini-3-pro-preview',
  web_scraping_service: 'tavily',
};
