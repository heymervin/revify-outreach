import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { processImport } from '@/lib/apollo/importService';
import type { ApolloImportType } from '@/types/apolloTypes';

/**
 * POST - Start a new Apollo import job
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { records, import_type, options } = body;

    // Validate request
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Records array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!import_type || !['companies', 'contacts', 'both'].includes(import_type)) {
      return NextResponse.json(
        { error: 'Invalid import_type. Must be "companies", "contacts", or "both"' },
        { status: 400 }
      );
    }

    // Validate each record
    for (const record of records) {
      if (!record.apollo_id || !record.record_type) {
        return NextResponse.json(
          { error: 'Each record must have apollo_id and record_type' },
          { status: 400 }
        );
      }

      if (!['company', 'contact'].includes(record.record_type)) {
        return NextResponse.json(
          { error: 'record_type must be "company" or "contact"' },
          { status: 400 }
        );
      }

      // Ensure apollo_data exists (use the record itself as fallback)
      if (!record.apollo_data) {
        record.apollo_data = { id: record.apollo_id };
      }
    }

    // Get GHL config and API key
    const { data: ghlConfig } = await adminClient
      .from('ghl_config')
      .select('location_id')
      .eq('organization_id', organizationId)
      .single();

    if (!ghlConfig?.location_id) {
      return NextResponse.json(
        { error: 'GHL not configured. Please add your Location ID in Settings.' },
        { status: 400 }
      );
    }

    const { data: ghlKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', organizationId)
      .eq('provider', 'ghl')
      .single();

    if (!ghlKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'GHL API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    const ghlApiKey = decryptApiKey(ghlKeyData.encrypted_key);

    // Create import job
    const { data: importJob, error: importError } = await adminClient
      .from('apollo_imports')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        import_type: import_type as ApolloImportType,
        total_records: records.length,
        status: 'pending',
      })
      .select()
      .single();

    if (importError || !importJob) {
      console.error('[Apollo Import] Failed to create import job:', importError);
      return NextResponse.json(
        { error: 'Failed to create import job' },
        { status: 500 }
      );
    }

    // Create import records
    const importRecords = records.map((record) => ({
      import_id: importJob.id,
      apollo_id: record.apollo_id,
      record_type: record.record_type,
      apollo_data: record.apollo_data,
      status: 'pending',
    }));

    const { error: recordsError } = await adminClient
      .from('apollo_import_records')
      .insert(importRecords);

    if (recordsError) {
      console.error('[Apollo Import] Failed to create import records:', recordsError);

      // Clean up import job
      await adminClient
        .from('apollo_imports')
        .delete()
        .eq('id', importJob.id);

      return NextResponse.json(
        { error: 'Failed to create import records' },
        { status: 500 }
      );
    }

    // Process import asynchronously - don't block the HTTP response
    // The client polls GET /api/apollo/import/[id] for progress
    const importOptions = {
      ghlApiKey,
      locationId: ghlConfig.location_id,
      skipDuplicates: options?.skip_duplicates ?? true,
      linkContacts: options?.link_contacts_to_companies ?? true,
    };

    // Fire-and-forget: process in background
    processImport(adminClient, importJob.id, importOptions)
      .then(async () => {
        // Log usage on success
        const logClient = createAdminClient();
        await logClient.from('usage_records').insert({
          organization_id: organizationId,
          user_id: user.id,
          action_type: 'apollo_import',
          provider: 'apollo',
          credits_used: 0,
          metadata: {
            import_id: importJob.id,
            import_type,
            total_records: records.length,
          },
        }).then(({ error }) => {
          if (error) console.warn('[Apollo Import] Usage log failed:', error.message);
        });
      })
      .catch((processError) => {
        console.error('[Apollo Import] Background processing failed:', processError);
      });

    // Return 202 Accepted immediately - client polls for status
    return NextResponse.json(
      {
        success: true,
        import_id: importJob.id,
        status: 'pending',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[Apollo Import] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - List recent imports for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Fetch recent imports
    const { data: imports, error: importsError } = await supabase
      .from('apollo_imports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (importsError) {
      console.error('[Apollo Import] Failed to fetch imports:', importsError);
      return NextResponse.json(
        { error: 'Failed to fetch imports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imports: imports || [],
    });
  } catch (error) {
    console.error('[Apollo Import] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch imports' },
      { status: 500 }
    );
  }
}
