import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { DEFAULT_EMAIL_PROMPT } from '../prompts/defaults';
import type { ResearchOutputV3, PainPointHypothesis, RecentSignalV3 } from '@/types/researchTypesV3';
import { decryptApiKey } from '@/lib/crypto';

// Helper to extract pain points as formatted string
function formatPainPoints(research: ResearchOutputV3 | null): string {
  if (!research?.pain_point_hypotheses?.length) {
    return 'No specific pain points identified.';
  }
  return research.pain_point_hypotheses
    .map((pp: PainPointHypothesis, i: number) => `${i + 1}. ${pp.hypothesis}\n   Evidence: ${pp.evidence}`)
    .join('\n');
}

// Helper to extract recent signals as formatted string
function formatSignals(research: ResearchOutputV3 | null): string {
  if (!research?.recent_signals?.length) {
    return 'No recent signals identified.';
  }
  return research.recent_signals
    .slice(0, 5) // Limit to top 5 signals
    .map((s: RecentSignalV3, i: number) => {
      const description = s.headline || s.description || s.detail || s.signal || '';
      return `${i + 1}. [${s.type?.toUpperCase() || 'SIGNAL'}] ${description} (Source: ${s.source_name || s.source || 'Unknown'})`;
    })
    .join('\n');
}

// Helper to get persona-specific talking points
function formatPersonaTalkingPoints(research: ResearchOutputV3 | null, persona: string): string {
  if (!research?.persona_angles) {
    return 'Based on recent company activities and market position.';
  }

  const personaKey = persona as keyof typeof research.persona_angles;
  const angle = research.persona_angles[personaKey];

  if (!angle) {
    return 'Based on recent company activities and market position.';
  }

  // Handle both old format (primary_hook) and new format (hook)
  const hook = (angle as any).primary_hook || angle.hook || '';
  const supportingPoint = (angle as any).supporting_point || angle.supporting_point || '';
  const question = (angle as any).question_to_pose || angle.question || '';

  return `Primary Hook: ${hook}
Supporting Point: ${supportingPoint}
Question to Pose: ${question}`;
}

// Helper to build research summary
function formatResearchSummary(research: ResearchOutputV3 | null, session: any): string {
  if (!research) {
    return `Company in ${session.industry || 'their'} industry with ${session.signals_found} recent signals identified.`;
  }

  const profile = research.company_profile;
  const parts: string[] = [];

  if (profile?.confirmed_name) parts.push(`Company: ${profile.confirmed_name}`);
  if (profile?.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile?.business_model) parts.push(`Business Model: ${profile.business_model}`);
  if (profile?.estimated_revenue) parts.push(`Estimated Revenue: ${profile.estimated_revenue}`);
  if (profile?.employee_count) parts.push(`Employee Count: ${profile.employee_count}`);
  if (profile?.market_position) parts.push(`Market Position: ${profile.market_position}`);
  if (research.recent_signals?.length) parts.push(`Recent Signals: ${research.recent_signals.length} identified`);
  if (research.pain_point_hypotheses?.length) parts.push(`Pain Points: ${research.pain_point_hypotheses.length} hypotheses`);

  return parts.join('\n');
}

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

    const body = await request.json();
    const { session_id, persona, tone, contact, research_data, company_name, industry } = body;

    // Extract contact first name for personalization
    const contactName = contact?.firstName || contact?.name?.split(' ')[0] || '';

    // Initialize variables for company info and research
    let sessionCompanyName = company_name || '';
    let sessionIndustry = industry || '';
    let researchData: ResearchOutputV3 | null = null;

    // Two modes of operation:
    // 1. GHL mode: research_data provided directly (from company_research field)
    // 2. Session mode: session_id provided (backwards compatibility)

    if (research_data) {
      // GHL mode - use research data directly
      researchData = research_data as ResearchOutputV3;
      // Use company info from research or fallback to request params
      sessionCompanyName = researchData?.company_profile?.confirmed_name || company_name || '';
      sessionIndustry = researchData?.company_profile?.industry || industry || '';
    } else if (session_id) {
      // Session mode - fetch from Supabase
      const { data: session } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (!session) {
        return NextResponse.json({ error: 'Research session not found' }, { status: 404 });
      }

      sessionCompanyName = session.company_name;
      sessionIndustry = session.industry || '';

      // Get full research data - check multiple sources for backwards compatibility
      // 1. First, check if research_output is stored directly on the session (new approach)
      if (session.research_output) {
        researchData = session.research_output as ResearchOutputV3;
      }

      // 2. If not found, try research_results table by session_id
      if (!researchData) {
        const { data: researchResult } = await supabase
          .from('research_results')
          .select('research_data')
          .eq('session_id', session_id)
          .single();

        if (researchResult?.research_data) {
          researchData = researchResult.research_data as ResearchOutputV3;
        }
      }

      // 3. Final fallback: try to find by company_name and user_id (for older sessions)
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
    }

    // Validate we have at least company name
    if (!sessionCompanyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Note: If researchData is still null, formatters will gracefully fall back to generic text

    // Get API key
    const { data: apiKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', userData.organization_id)
      .eq('provider', 'openai')
      .single();

    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Decrypt the API key and initialize OpenAI
    const openaiKey = decryptApiKey(apiKeyData.encrypted_key);
    const openai = new OpenAI({
      apiKey: openaiKey,
    });

    // Build prompt
    const personaLabels: Record<string, string> = {
      cfo_finance: 'CFO / Finance Leader',
      ceo_gm: 'CEO / General Manager',
      pricing_rgm: 'Pricing / Revenue Growth Manager',
      sales_commercial: 'Sales / Commercial Leader',
      technology_analytics: 'Technology / Analytics Leader',
    };

    // Get custom prompt if available
    let promptTemplate = DEFAULT_EMAIL_PROMPT;

    const { data: customPrompt } = await supabase
      .from('prompt_templates')
      .select('content')
      .eq('organization_id', userData.organization_id)
      .eq('type', 'email')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (customPrompt?.content) {
      promptTemplate = customPrompt.content;
    }

    // Build rich context from research data (with graceful fallback for minimal data)
    const sessionContext = { company_name: sessionCompanyName, industry: sessionIndustry, signals_found: researchData?.recent_signals?.length || 0 };
    const researchSummary = formatResearchSummary(researchData, sessionContext);
    const painPointsText = researchData
      ? formatPainPoints(researchData)
      : 'No specific pain points identified during research.';
    const talkingPointsText = formatPersonaTalkingPoints(researchData, persona);
    const signalsText = formatSignals(researchData);

    const prompt = promptTemplate
      .replace(/{company_name}/g, sessionCompanyName)
      .replace(/{industry}/g, sessionIndustry || 'Unknown')
      .replace(/{persona}/g, personaLabels[persona] || persona)
      .replace(/{tone}/g, tone)
      .replace(/{research_summary}/g, researchSummary)
      .replace(/{pain_points}/g, painPointsText)
      .replace(/{talking_points}/g, talkingPointsText)
      .replace(/{recent_signals}/g, signalsText)
      .replace(/{contact_first_name}/g, contactName);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B sales copywriter. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const email = JSON.parse(responseText);

    // Log usage
    await supabase.from('usage_records').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      action_type: 'email',
      provider: 'openai',
      model: 'gpt-4o',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
      metadata: {
        session_id: session_id || null,
        persona,
        tone,
        company_name: sessionCompanyName,
        source: research_data ? 'ghl' : 'session',
      },
    });

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error('Email generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    );
  }
}
