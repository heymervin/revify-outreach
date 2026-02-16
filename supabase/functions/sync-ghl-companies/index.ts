/**
 * Supabase Edge Function: sync-ghl-companies
 *
 * Processes GHL company sync jobs in background chunks.
 * Called by cron every minute to pick up pending/running jobs.
 *
 * Each execution processes up to 5 pages (500 companies) to stay
 * within execution time limits.
 *
 * Setup:
 * 1. Deploy this function: supabase functions deploy sync-ghl-companies
 * 2. Set up cron in Supabase Dashboard:
 *    - Schedule: * * * * * (every minute)
 *    - Function: sync-ghl-companies
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const PAGE_LIMIT = 100;
const PAGES_PER_EXECUTION = 5; // Process 500 companies per execution
const BATCH_SIZE = 500; // Upsert batch size

interface GHLBusinessRecord {
  id: string;
  locationId: string;
  objectKey: string;
  properties: {
    name?: string;
    website?: string;
    email?: string;
    phone?: string;
    industry?: string;
    score?: number | string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface GHLBusinessSearchResponse {
  records: GHLBusinessRecord[];
  total?: number;
}

interface SyncJob {
  id: string;
  organization_id: string;
  ghl_account_id: string | null;
  status: string;
  current_page: number;
  total_pages: number | null;
  companies_synced: number;
  total_companies: number | null;
  error_message: string | null;
  started_at: string | null;
}

interface GHLAccountRecord {
  id: string;
  organization_id: string;
  location_id: string;
  access_token_encrypted: string | null;
}

interface CompanyRecord {
  organization_id: string;
  ghl_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  score: number | null;
  email: string | null;
  phone: string | null;
  synced_at: string;
}

// Simple decryption - must match the encryption used in the app
// In production, use proper key management
function decryptApiKey(encryptedKey: string): string {
  // The app uses a simple base64 encoding with a salt prefix
  // This should match lib/crypto/index.ts
  try {
    const decoded = atob(encryptedKey);
    // Remove salt prefix if present (format: SALT:actualKey)
    const parts = decoded.split(':');
    return parts.length > 1 ? parts.slice(1).join(':') : decoded;
  } catch {
    // If not base64 encoded, return as-is (for backwards compatibility)
    return encryptedKey;
  }
}

Deno.serve(async (req) => {
  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Sync Edge Function] Starting execution');

    // Find pending or running jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('ghl_sync_jobs')
      .select('*')
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: true })
      .limit(5);

    if (jobsError) {
      console.error('[Sync Edge Function] Error fetching jobs:', jobsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log('[Sync Edge Function] No jobs to process');
      return new Response(JSON.stringify({ message: 'No jobs to process' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Sync Edge Function] Found ${jobs.length} jobs to process`);

    // Process each job
    for (const job of jobs as SyncJob[]) {
      await processJob(supabase, job);
    }

    return new Response(JSON.stringify({ success: true, processed: jobs.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Sync Edge Function] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processJob(supabase: ReturnType<typeof createClient>, job: SyncJob) {
  const startTime = Date.now();
  console.log(`[Sync Edge Function] Processing job ${job.id} for org ${job.organization_id}`);

  try {
    // Mark as running if pending
    if (job.status === 'pending') {
      await supabase
        .from('ghl_sync_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    // Get GHL account credentials using pinned account ID, or fallback to primary
    let ghlAccountQuery = supabase
      .from('ghl_accounts')
      .select('id, organization_id, location_id, access_token_encrypted');

    if (job.ghl_account_id) {
      ghlAccountQuery = ghlAccountQuery.eq('id', job.ghl_account_id);
    } else {
      // Fallback for older jobs without pinned account: use primary
      ghlAccountQuery = ghlAccountQuery
        .eq('organization_id', job.organization_id)
        .eq('is_primary', true);
    }

    const { data: ghlAccount, error: accountError } = await ghlAccountQuery.single();

    if (accountError || !ghlAccount?.location_id || !ghlAccount.access_token_encrypted) {
      throw new Error('GHL account not configured for this organization');
    }

    const ghlApiKey = decryptApiKey((ghlAccount as GHLAccountRecord).access_token_encrypted!);
    const locationId = (ghlAccount as GHLAccountRecord).location_id;

    // Determine starting page
    let currentPage = job.current_page || 1;
    const endPage = currentPage + PAGES_PER_EXECUTION;
    let totalCompanies = job.total_companies || 0;
    let companiesSynced = job.companies_synced || 0;
    const allCompanies: CompanyRecord[] = [];

    console.log(`[Sync Edge Function] Processing pages ${currentPage} to ${endPage - 1}`);

    // Fetch pages
    while (currentPage < endPage) {
      const ghlUrl = `${GHL_API_BASE}/objects/business/records/search`;

      const response = await fetch(ghlUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          Version: API_VERSION,
        },
        body: JSON.stringify({
          locationId,
          page: currentPage,
          pageLimit: PAGE_LIMIT,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Sync Edge Function] GHL API error: ${response.status}`, errorText);

        if (response.status === 401) {
          throw new Error('GHL Authentication Failed');
        }
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data: GHLBusinessSearchResponse = await response.json();
      const records = data.records || [];

      // Update total on first page
      if (currentPage === 1 && data.total) {
        totalCompanies = data.total;
      }

      // Transform records
      const syncedAt = new Date().toISOString();
      for (const record of records) {
        if (!record.properties?.name) continue;

        let score: number | null = null;
        if (record.properties.score !== undefined) {
          const rawScore = record.properties.score;
          const parsed = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore));
          if (!isNaN(parsed)) score = parsed;
        }

        allCompanies.push({
          organization_id: job.organization_id,
          ghl_id: record.id,
          name: record.properties.name,
          website: record.properties.website || null,
          industry: record.properties.industry || null,
          score,
          email: record.properties.email || null,
          phone: record.properties.phone || null,
          synced_at: syncedAt,
        });
      }

      console.log(`[Sync Edge Function] Page ${currentPage}: ${records.length} records`);

      // Check if there are more pages
      if (records.length < PAGE_LIMIT) {
        console.log('[Sync Edge Function] Reached last page');
        currentPage = 99999; // Signal completion
        break;
      }

      currentPage++;
    }

    // Batch upsert companies
    if (allCompanies.length > 0) {
      for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
        const batch = allCompanies.slice(i, i + BATCH_SIZE);
        const { error: upsertError } = await supabase
          .from('ghl_companies')
          .upsert(batch, {
            onConflict: 'organization_id,ghl_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error('[Sync Edge Function] Upsert error:', upsertError);
          throw new Error(`Failed to upsert companies: ${upsertError.message}`);
        }
      }
      companiesSynced += allCompanies.length;
    }

    // Calculate total pages
    const totalPages = totalCompanies > 0 ? Math.ceil(totalCompanies / PAGE_LIMIT) : null;

    // Check if complete
    const isComplete = currentPage >= 99999 || (totalPages && currentPage > totalPages);

    if (isComplete) {
      // Mark job as completed
      await supabase
        .from('ghl_sync_jobs')
        .update({
          status: 'completed',
          current_page: totalPages || currentPage,
          total_pages: totalPages,
          companies_synced: companiesSynced,
          total_companies: totalCompanies,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Update ghl_accounts with sync timestamp
      if (ghlAccount?.id) {
        await supabase
          .from('ghl_accounts')
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', ghlAccount.id);
      }

      const duration = Date.now() - startTime;
      console.log(`[Sync Edge Function] Job ${job.id} completed in ${duration}ms, synced ${companiesSynced} companies`);
    } else {
      // Update job progress
      await supabase
        .from('ghl_sync_jobs')
        .update({
          current_page: currentPage,
          total_pages: totalPages,
          companies_synced: companiesSynced,
          total_companies: totalCompanies,
        })
        .eq('id', job.id);

      const duration = Date.now() - startTime;
      console.log(`[Sync Edge Function] Job ${job.id} progress: page ${currentPage}, ${companiesSynced} companies, ${duration}ms`);
    }
  } catch (error) {
    console.error(`[Sync Edge Function] Job ${job.id} failed:`, error);

    // Mark job as failed
    await supabase
      .from('ghl_sync_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }
}
