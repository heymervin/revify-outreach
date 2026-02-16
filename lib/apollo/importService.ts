import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApolloOrganization,
  ApolloPerson,
  ApolloImportRecordStatus,
} from '@/types/apolloTypes';
import {
  mapApolloOrgToGHLBusiness,
  mapApolloPersonToGHLContact,
} from '@/lib/apollo/fieldMapping';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const BATCH_SIZE = 10; // Process records in batches to avoid overwhelming GHL API

interface ProcessImportOptions {
  ghlApiKey: string;
  locationId: string;
  skipDuplicates?: boolean;
  linkContacts?: boolean;
}

interface ImportRecord {
  id: string;
  import_id: string;
  apollo_id: string;
  record_type: 'company' | 'contact';
  apollo_data: ApolloOrganization | ApolloPerson;
  ghl_id?: string;
  ghl_business_id?: string;
  status: ApolloImportRecordStatus;
  error_message?: string;
  created_at: string;
}

interface ErrorLogEntry {
  record_id: string;
  apollo_id: string;
  record_type: 'company' | 'contact';
  error: string;
  timestamp: string;
}

/**
 * Main processing function for Apollo imports
 * Processes pending records and pushes them to GoHighLevel
 */
export async function processImport(
  adminClient: SupabaseClient,
  importId: string,
  options: ProcessImportOptions
): Promise<void> {
  const { ghlApiKey, locationId, skipDuplicates = true, linkContacts = true } = options;

  try {
    // Update import status to processing
    await adminClient
      .from('apollo_imports')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', importId);

    // Fetch all pending records
    const { data: records, error: recordsError } = await adminClient
      .from('apollo_import_records')
      .select('*')
      .eq('import_id', importId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (recordsError) {
      throw new Error(`Failed to fetch import records: ${recordsError.message}`);
    }

    if (!records || records.length === 0) {
      console.log('[Apollo Import] No pending records to process');
      await finalizeImport(adminClient, importId, 0, 0, 0, []);
      return;
    }

    console.log(`[Apollo Import] Processing ${records.length} records`);

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errorLog: ErrorLogEntry[] = [];

    // Map to store company name -> GHL business ID for linking contacts
    const companyBusinessIdMap = new Map<string, string>();

    // Process companies first, then contacts (to enable linking)
    const companyRecords = records.filter((r) => r.record_type === 'company');
    const contactRecords = records.filter((r) => r.record_type === 'contact');

    // Process companies
    for (let i = 0; i < companyRecords.length; i++) {
      const record = companyRecords[i] as ImportRecord;
      const result = await processCompanyRecord(
        adminClient,
        record,
        locationId,
        ghlApiKey,
        skipDuplicates
      );

      processedCount++;

      if (result.success) {
        successCount++;
        if (result.ghlBusinessId && result.companyName) {
          companyBusinessIdMap.set(result.companyName, result.ghlBusinessId);
        }
      } else {
        failedCount++;
        errorLog.push({
          record_id: record.id,
          apollo_id: record.apollo_id,
          record_type: 'company',
          error: result.error || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Update progress every 10 records
      if (processedCount % BATCH_SIZE === 0) {
        await updateImportProgress(
          adminClient,
          importId,
          processedCount,
          successCount,
          failedCount
        );
      }
    }

    // Process contacts
    for (let i = 0; i < contactRecords.length; i++) {
      const record = contactRecords[i] as ImportRecord;
      const result = await processContactRecord(
        adminClient,
        record,
        locationId,
        ghlApiKey,
        linkContacts ? companyBusinessIdMap : null
      );

      processedCount++;

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errorLog.push({
          record_id: record.id,
          apollo_id: record.apollo_id,
          record_type: 'contact',
          error: result.error || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Update progress every 10 records
      if (processedCount % BATCH_SIZE === 0) {
        await updateImportProgress(
          adminClient,
          importId,
          processedCount,
          successCount,
          failedCount
        );
      }
    }

    // Finalize import
    await finalizeImport(adminClient, importId, processedCount, successCount, failedCount, errorLog);

    console.log(`[Apollo Import] Completed: ${successCount}/${processedCount} successful`);
  } catch (error) {
    console.error('[Apollo Import] Processing error:', error);

    // Update import status to failed
    await adminClient
      .from('apollo_imports')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: [
          {
            error: error instanceof Error ? error.message : 'Unknown processing error',
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .eq('id', importId);

    throw error;
  }
}

/**
 * Process a single company record
 */
async function processCompanyRecord(
  adminClient: SupabaseClient,
  record: ImportRecord,
  locationId: string,
  ghlApiKey: string,
  skipDuplicates: boolean
): Promise<{ success: boolean; error?: string; ghlBusinessId?: string; companyName?: string }> {
  try {
    // Update record status to processing
    await adminClient
      .from('apollo_import_records')
      .update({ status: 'processing' })
      .eq('id', record.id);

    const orgData = record.apollo_data as ApolloOrganization;

    if (!orgData.name) {
      throw new Error('Company name is required');
    }

    // Check for existing business if skipDuplicates is enabled
    let ghlBusinessId: string | null = null;

    if (skipDuplicates) {
      ghlBusinessId = await findExistingBusiness(orgData.name, locationId, ghlApiKey);

      if (ghlBusinessId) {
        console.log(`[Apollo Import] Skipping duplicate company: ${orgData.name}`);

        await adminClient
          .from('apollo_import_records')
          .update({
            status: 'skipped',
            ghl_id: ghlBusinessId,
            error_message: 'Duplicate company already exists in GHL',
          })
          .eq('id', record.id);

        return { success: true, ghlBusinessId, companyName: orgData.name };
      }
    }

    // Map Apollo org to GHL business format
    const businessProperties = mapApolloOrgToGHLBusiness(orgData);

    // Create business in GHL
    ghlBusinessId = await createGHLBusiness(businessProperties, locationId, ghlApiKey);

    // Update record status to completed
    await adminClient
      .from('apollo_import_records')
      .update({
        status: 'completed',
        ghl_id: ghlBusinessId,
      })
      .eq('id', record.id);

    console.log(`[Apollo Import] Created company: ${orgData.name} -> ${ghlBusinessId}`);

    return { success: true, ghlBusinessId, companyName: orgData.name };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Apollo Import] Failed to process company record ${record.id}:`, errorMessage);

    // Update record status to failed
    await adminClient
      .from('apollo_import_records')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', record.id);

    return { success: false, error: errorMessage };
  }
}

/**
 * Process a single contact record
 */
async function processContactRecord(
  adminClient: SupabaseClient,
  record: ImportRecord,
  locationId: string,
  ghlApiKey: string,
  companyBusinessIdMap: Map<string, string> | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update record status to processing
    await adminClient
      .from('apollo_import_records')
      .update({ status: 'processing' })
      .eq('id', record.id);

    const personData = record.apollo_data as ApolloPerson;

    if (!personData.email && !personData.first_name) {
      throw new Error('Contact must have either email or first name');
    }

    // Map Apollo person to GHL contact format
    const contactData = mapApolloPersonToGHLContact(personData, locationId);

    // Link to business if available
    if (companyBusinessIdMap && personData.organization?.name) {
      const businessId = companyBusinessIdMap.get(personData.organization.name);
      if (businessId) {
        contactData.businessId = businessId;
      }
    }

    // Create contact in GHL
    const ghlContactId = await createGHLContact(contactData, ghlApiKey);

    // Update record status to completed
    await adminClient
      .from('apollo_import_records')
      .update({
        status: 'completed',
        ghl_id: ghlContactId,
        ghl_business_id: contactData.businessId as string | undefined,
      })
      .eq('id', record.id);

    console.log(`[Apollo Import] Created contact: ${personData.name} -> ${ghlContactId}`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Apollo Import] Failed to process contact record ${record.id}:`, errorMessage);

    // Update record status to failed
    await adminClient
      .from('apollo_import_records')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', record.id);

    return { success: false, error: errorMessage };
  }
}

/**
 * Update import progress
 */
async function updateImportProgress(
  adminClient: SupabaseClient,
  importId: string,
  processedCount: number,
  successCount: number,
  failedCount: number
): Promise<void> {
  await adminClient
    .from('apollo_imports')
    .update({
      processed_records: processedCount,
      successful_records: successCount,
      failed_records: failedCount,
    })
    .eq('id', importId);
}

/**
 * Finalize import and update status
 */
async function finalizeImport(
  adminClient: SupabaseClient,
  importId: string,
  processedCount: number,
  successCount: number,
  failedCount: number,
  errorLog: ErrorLogEntry[]
): Promise<void> {
  const status = failedCount === 0 ? 'completed' : failedCount < processedCount ? 'partial' : 'failed';

  await adminClient
    .from('apollo_imports')
    .update({
      status,
      processed_records: processedCount,
      successful_records: successCount,
      failed_records: failedCount,
      completed_at: new Date().toISOString(),
      error_log: errorLog.length > 0 ? errorLog : null,
    })
    .eq('id', importId);
}

/**
 * Creates a business in GHL using the Businesses API
 */
export async function createGHLBusiness(
  properties: Record<string, string>,
  locationId: string,
  ghlApiKey: string
): Promise<string> {
  const url = `${GHL_API_BASE}/businesses/`;

  // Flatten properties into the body with locationId (Businesses API uses flat payload)
  const body: Record<string, string> = {
    ...properties,
    locationId,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      Version: API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GHL API] Create business error:', response.status, errorText);
    throw new Error(`Failed to create GHL business: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const businessId = data.business?.id || data.id;

  if (!businessId) {
    throw new Error('No business ID returned from GHL');
  }

  return businessId;
}

/**
 * Creates a contact in GHL
 */
export async function createGHLContact(
  contactData: Record<string, unknown>,
  ghlApiKey: string
): Promise<string> {
  const url = `${GHL_API_BASE}/contacts/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      Version: API_VERSION,
    },
    body: JSON.stringify(contactData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GHL API] Create contact error:', response.status, errorText);
    throw new Error(`Failed to create GHL contact: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const contactId = data.contact?.id || data.id;

  if (!contactId) {
    throw new Error('No contact ID returned from GHL');
  }

  return contactId;
}

/**
 * Searches for an existing business by name in GHL
 * Returns the GHL business ID if found, null otherwise
 */
export async function findExistingBusiness(
  name: string,
  locationId: string,
  ghlApiKey: string
): Promise<string | null> {
  const url = `${GHL_API_BASE}/businesses/?locationId=${locationId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        Version: API_VERSION,
      },
    });

    if (!response.ok) {
      console.warn('[GHL API] Search business error:', response.status);
      return null;
    }

    const data = await response.json();
    const businesses = data.businesses || [];

    // Look for exact name match (case-insensitive)
    const exactMatch = businesses.find(
      (biz: { name?: string }) =>
        biz.name?.toLowerCase() === name.toLowerCase()
    );

    return exactMatch?.id || null;
  } catch (error) {
    console.warn('[GHL API] Error searching for existing business:', error);
    return null;
  }
}
