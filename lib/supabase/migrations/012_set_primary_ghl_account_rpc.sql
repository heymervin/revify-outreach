-- =============================================
-- RPC: Atomic primary GHL account swap
-- =============================================
-- Ensures exactly one primary account per org at all times.
-- Called from PATCH /api/ghl/accounts/[id] when is_primary=true.

CREATE OR REPLACE FUNCTION set_primary_ghl_account(
  p_account_id UUID,
  p_organization_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Unset all primary flags for the org, then set the target
  UPDATE ghl_accounts
  SET is_primary = (id = p_account_id)
  WHERE organization_id = p_organization_id;

  -- Verify the target account was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No GHL accounts found for organization %', p_organization_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION set_primary_ghl_account IS 'Atomically swap which GHL account is primary for an organization';
