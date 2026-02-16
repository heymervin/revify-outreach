-- Migration 007: Add Apollo provider support
-- Adds 'apollo' to api_keys provider constraint and usage_records action types

-- Update api_keys provider constraint to include 'apollo'
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_check;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_provider_check
  CHECK (provider IN ('openai', 'gemini', 'anthropic', 'tavily', 'ghl', 'apollo'));
