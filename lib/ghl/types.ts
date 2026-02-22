// lib/ghl/types.ts

export interface GHLAccount {
  id: string;
  organization_id: string;
  account_name: string;
  location_id: string;
  location_name: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  custom_field_mappings: Record<string, unknown>;
  sync_settings: Record<string, unknown>;
  is_primary: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GHLAccountWithTokens extends GHLAccount {
  access_token: string | null; // Decrypted
  refresh_token: string | null; // Decrypted
}
