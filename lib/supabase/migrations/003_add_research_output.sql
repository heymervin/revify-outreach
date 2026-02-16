-- Migration: Add research_output column to research_sessions
-- This stores the full ResearchOutputV3 JSON for email generation
-- Run this if you have an existing database

-- Add research_output column to store full research results
ALTER TABLE research_sessions
ADD COLUMN IF NOT EXISTS research_output JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN research_sessions.research_output IS 'Full ResearchOutputV3 JSON for email generation - contains pain points, persona angles, signals, etc.';

-- Create index for queries that filter on research output existence
CREATE INDEX IF NOT EXISTS idx_research_sessions_has_output
ON research_sessions ((research_output IS NOT NULL));
