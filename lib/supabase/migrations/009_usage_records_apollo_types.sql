-- Migration 009: Add Apollo action types to usage_records constraint
-- The current CHECK constraint only allows: 'research', 'email', 'bulk_research', 'ghl_sync'
-- Apollo features need: 'apollo_search', 'apollo_lookup', 'apollo_import'

-- Drop existing constraint and recreate with Apollo types
ALTER TABLE usage_records DROP CONSTRAINT IF EXISTS usage_records_action_type_check;

ALTER TABLE usage_records ADD CONSTRAINT usage_records_action_type_check
  CHECK (action_type IN (
    'research',
    'email',
    'bulk_research',
    'ghl_sync',
    'apollo_search',
    'apollo_lookup',
    'apollo_import'
  ));
