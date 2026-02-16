import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  ResearchOutputV3,
  PainPointHypothesis,
  RecentSignalV3,
  UrgencyLevel,
} from '@/types/researchTypesV3';

interface ResearchPreview {
  company_name: string;
  industry: string;
  top_pain_points: PainPointHypothesis[];
  top_signals: RecentSignalV3[];
  recommended_personas: string[];
  urgency?: UrgencyLevel;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: sessionId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get research session
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      );
    }

    // Get research data - check multiple sources
    let researchData: ResearchOutputV3 | null = null;

    // 1. Check if research_output is stored directly on session
    if (session.research_output) {
      researchData = session.research_output as ResearchOutputV3;
    }

    // 2. Try research_results table
    if (!researchData) {
      const { data: researchResult } = await supabase
        .from('research_results')
        .select('research_data')
        .eq('session_id', sessionId)
        .single();

      if (researchResult?.research_data) {
        researchData = researchResult.research_data as ResearchOutputV3;
      }
    }

    // 3. Fallback by company name
    if (!researchData) {
      const { data: fallbackResult } = await supabase
        .from('research_results')
        .select('research_data')
        .eq('company_name', session.company_name)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fallbackResult?.research_data) {
        researchData = fallbackResult.research_data as ResearchOutputV3;
      }
    }

    // Build preview response
    const preview: ResearchPreview = {
      company_name: session.company_name,
      industry: session.industry || 'Unknown',
      top_pain_points: researchData?.pain_point_hypotheses?.slice(0, 3) || [],
      top_signals: researchData?.recent_signals?.slice(0, 3) || [],
      recommended_personas:
        researchData?.outreach_priority?.recommended_personas || [],
      urgency: researchData?.outreach_priority?.urgency,
    };

    return NextResponse.json({ preview });
  } catch (error) {
    console.error('Research preview error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch preview',
      },
      { status: 500 }
    );
  }
}
