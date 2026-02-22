import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateJobOrderPDF } from '@/lib/pdf/pdfService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

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

    // Fetch research session with output
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('id, company_name, research_type, created_at, research_output')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Research session not found' }, { status: 404 });
    }

    if (!session.research_output) {
      return NextResponse.json({ error: 'No research output available' }, { status: 400 });
    }

    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as 'a4' | 'letter') || 'letter';

    // Generate PDF
    const pdfBuffer = await generateJobOrderPDF(
      {
        id: session.id,
        company_name: session.company_name,
        research_type: session.research_type,
        created_at: session.created_at,
        research_output: session.research_output,
      },
      { format }
    );

    const safeName = session.company_name.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_research_report.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
