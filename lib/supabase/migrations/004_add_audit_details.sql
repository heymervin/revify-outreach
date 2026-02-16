-- Migration: Add details column to audit_logs and update usage_records
-- Run this in Supabase SQL Editor

-- Add details column to audit_logs if it doesn't exist
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Update usage_records check constraint to include email_send
-- First drop the old constraint
ALTER TABLE usage_records
DROP CONSTRAINT IF EXISTS usage_records_action_type_check;

-- Add the new constraint with email_send
ALTER TABLE usage_records
ADD CONSTRAINT usage_records_action_type_check
CHECK (action_type IN ('research', 'email', 'bulk_research', 'ghl_sync', 'email_send'));

-- Add insert policy for audit_logs
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

-- Add index for faster queries by action
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

COMMENT ON COLUMN audit_logs.details IS 'Additional structured details about the audit event';
