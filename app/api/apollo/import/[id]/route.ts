import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET - Fetch a single import by ID with its records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const importId = id;

    // Validate import ID
    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required' },
        { status: 400 }
      );
    }

    // Fetch import data
    const { data: importData, error: importError } = await supabase
      .from('apollo_imports')
      .select('*')
      .eq('id', importId)
      .eq('organization_id', organizationId)
      .single();

    if (importError || !importData) {
      console.error('[Apollo Import] Failed to fetch import:', importError);
      return NextResponse.json(
        { error: 'Import not found' },
        { status: 404 }
      );
    }

    // Fetch import records
    const { data: records, error: recordsError } = await supabase
      .from('apollo_import_records')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: true });

    if (recordsError) {
      console.error('[Apollo Import] Failed to fetch import records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch import records' },
        { status: 500 }
      );
    }

    // Collect errors from failed records
    const errors = (records || [])
      .filter((r: { status: string }) => r.status === 'failed')
      .map((r: { error_message?: string; apollo_id: string }) => r.error_message || `Record ${r.apollo_id} failed`);

    // Return flat progress data matching UI's ImportProgress interface
    return NextResponse.json({
      status: importData.status,
      total: importData.total_records,
      processed: importData.processed_records || 0,
      successful: importData.successful_records || 0,
      failed: importData.failed_records || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Apollo Import] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch import' },
      { status: 500 }
    );
  }
}
