import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { getActiveGHLAccount } from '@/lib/ghl';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const PAGE_LIMIT = 100;
const BATCH_SIZE = 500;
// Maximum pages to process in a single request (to avoid Vercel timeout)
const MAX_PAGES_PER_REQUEST = 3;

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

interface SyncJob {
  id: string;
  organization_id: string;
  status: string;
  current_page: number;
  total_pages: number | null;
  companies_synced: number;
  total_companies: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * POST /api/ghl/companies/sync
 *
 * Creates a background sync job or processes incremental sync.
 *
 * Modes:
 * - No body: Creates a new sync job (picked up by Edge Function)
 * - { mode: 'incremental' }: Process a few pages directly (for quick sync)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const organizationId = userData.organization_id;

    // Get active GHL account (user-selected or primary)
    const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

    if (!ghlAccount?.location_id || !ghlAccount.access_token) {
      return NextResponse.json(
        { error: 'GHL account not configured. Please add a GHL account in Settings.' },
        { status: 400 }
      );
    }

    // Parse request body
    let body: { mode?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine - we'll create a job
    }

    // Check for existing pending/running job
    const { data: existingJob } = await adminClient
      .from('ghl_sync_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      // Return existing job status
      return NextResponse.json({
        success: true,
        jobId: existingJob.id,
        status: existingJob.status,
        progress: {
          currentPage: existingJob.current_page,
          totalPages: existingJob.total_pages,
          companiesSynced: existingJob.companies_synced,
          totalCompanies: existingJob.total_companies,
        },
        message: 'Sync already in progress',
      });
    }

    // Incremental mode: process a few pages directly for quick sync
    if (body.mode === 'incremental') {
      return handleIncrementalSync(
        adminClient,
        organizationId,
        ghlAccount.location_id,
        ghlAccount.access_token,
        ghlAccount.id,
        startTime
      );
    }

    // Default: Create a new sync job for background processing
    const { data: newJob, error: insertError } = await adminClient
      .from('ghl_sync_jobs')
      .insert({
        organization_id: organizationId,
        status: 'pending',
        current_page: 0,
        companies_synced: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GHL Sync] Failed to create job:', insertError);
      return NextResponse.json(
        { error: 'Failed to create sync job' },
        { status: 500 }
      );
    }

    console.log('[GHL Sync] Created job:', newJob.id);

    return NextResponse.json({
      success: true,
      jobId: newJob.id,
      status: 'pending',
      message: 'Sync job created. Processing will start shortly.',
    });
  } catch (error) {
    console.error('[GHL Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle incremental sync - process a few pages directly
 * Used for quick sync when user wants immediate results
 */
async function handleIncrementalSync(
  adminClient: ReturnType<typeof createAdminClient>,
  organizationId: string,
  locationId: string,
  ghlApiKey: string,
  accountId: string,
  startTime: number
): Promise<NextResponse> {
  const allCompanies: CompanyRecord[] = [];
  let totalFromGHL = 0;

  console.log('[GHL Sync] Starting incremental sync for organization:', organizationId);

  // Fetch limited pages to avoid timeout
  for (let page = 1; page <= MAX_PAGES_PER_REQUEST; page++) {
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
        page,
        pageLimit: PAGE_LIMIT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GHL Sync] API error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'GHL Authentication Failed. Please verify your API key.' },
          { status: 401 }
        );
      }

      throw new Error(`GHL API error: ${response.status}`);
    }

    const data: GHLBusinessSearchResponse = await response.json();
    const records = data.records || [];

    if (page === 1) {
      totalFromGHL = data.total || 0;
      console.log(`[GHL Sync] Total companies in GHL: ${totalFromGHL}`);
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
        organization_id: organizationId,
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

    console.log(`[GHL Sync] Fetched page ${page}, got ${records.length} records`);

    // Stop if we've got all records
    if (records.length < PAGE_LIMIT) {
      break;
    }
  }

  // Batch upsert into Supabase
  let upsertedCount = 0;
  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);

    const { error: upsertError } = await adminClient
      .from('ghl_companies')
      .upsert(batch, {
        onConflict: 'organization_id,ghl_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('[GHL Sync] Upsert error:', upsertError);
      throw new Error(`Failed to upsert companies: ${upsertError.message}`);
    }

    upsertedCount += batch.length;
  }

  // Determine if sync is complete or partial
  const isComplete = allCompanies.length >= totalFromGHL || allCompanies.length < PAGE_LIMIT * MAX_PAGES_PER_REQUEST;

  // Update ghl_accounts last_sync_at if complete
  if (isComplete) {
    await adminClient
      .from('ghl_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', accountId);
  }

  const duration = Date.now() - startTime;
  console.log(`[GHL Sync] Incremental sync completed in ${duration}ms, synced ${allCompanies.length}/${totalFromGHL} companies`);

  return NextResponse.json({
    success: true,
    synced: allCompanies.length,
    total: totalFromGHL,
    duration,
    partial: !isComplete,
    message: isComplete ? 'Sync completed' : `Synced ${allCompanies.length} of ${totalFromGHL} companies. Use background sync for full data.`,
  });
}

/**
 * GET /api/ghl/companies/sync
 * Returns sync status including job progress
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const organizationId = userData.organization_id;

    // Get active GHL account for sync status
    const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

    // Get latest sync job
    const { data: latestJob, error: jobError } = await adminClient
      .from('ghl_sync_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError) console.log('[GHL Sync Status] jobError:', jobError);

    if (!ghlAccount) {
      return NextResponse.json({
        configured: false,
        synced: false,
        companiesSyncedAt: null,
        companiesCount: 0,
        job: null,
      });
    }

    // Get companies count from ghl_companies table
    const { count: companiesCount } = await adminClient
      .from('ghl_companies')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const syncedAt = ghlAccount.last_sync_at;
    const isStale = !syncedAt || (Date.now() - new Date(syncedAt).getTime() > 60 * 60 * 1000);

    // Format job info if exists
    let jobInfo: {
      id: string;
      status: string;
      currentPage: number;
      totalPages: number | null;
      companiesSynced: number;
      totalCompanies: number | null;
      errorMessage: string | null;
      startedAt: string | null;
      completedAt: string | null;
    } | null = null;

    if (latestJob) {
      const job = latestJob as SyncJob;
      jobInfo = {
        id: job.id,
        status: job.status,
        currentPage: job.current_page,
        totalPages: job.total_pages,
        companiesSynced: job.companies_synced,
        totalCompanies: job.total_companies,
        errorMessage: job.error_message,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      };
    }

    return NextResponse.json({
      configured: !!ghlAccount.location_id,
      synced: !!syncedAt,
      companiesSyncedAt: syncedAt,
      companiesCount: companiesCount || 0,
      isStale,
      job: jobInfo,
    });
  } catch (error) {
    console.error('[GHL Sync] Status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
