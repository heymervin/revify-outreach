import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateBulkZip, generateCombinedPDF } from '@/lib/pdf/pdfService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    const { session_ids, bundle_type = 'individual', format = 'letter' } = body;

    if (!session_ids?.length) {
      return NextResponse.json({ error: 'No session IDs provided' }, { status: 400 });
    }

    if (session_ids.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 sessions per export' }, { status: 400 });
    }

    // Fetch all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('research_sessions')
      .select('id, company_name, research_type, created_at, research_output')
      .in('id', session_ids)
      .eq('organization_id', userData.organization_id)
      .not('research_output', 'is', null);

    if (sessionsError || !sessions?.length) {
      return NextResponse.json({ error: 'No valid sessions found' }, { status: 404 });
    }

    if (bundle_type === 'combined') {
      const pdfBuffer = await generateCombinedPDF(sessions, { format });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="bulk_research_report.pdf"`,
          'Content-Length': String(pdfBuffer.length),
        },
      });
    } else {
      // Individual PDFs in a ZIP
      const zipBuffer = await generateBulkZip(sessions, { format });

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="research_reports.zip"`,
          'Content-Length': String(zipBuffer.length),
        },
      });
    }
  } catch (error) {
    console.error('Bulk PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
