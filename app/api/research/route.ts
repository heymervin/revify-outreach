import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Research prompt template
const RESEARCH_PROMPT = `You are an expert B2B sales researcher. Analyze the following company and provide detailed research insights.

Company: {company_name}
Website: {company_website}
Industry: {industry}
Research Depth: {research_type}

Provide your analysis in the following JSON format:
{
  "company_profile": {
    "confirmed_name": "string",
    "industry": "string",
    "sub_segment": "string",
    "estimated_revenue": "string",
    "employee_count": "string",
    "business_model": "string",
    "headquarters": "string",
    "market_position": "string"
  },
  "recent_signals": [
    {
      "signal_type": "string (e.g., 'Expansion', 'Leadership Change', 'Funding', 'Product Launch')",
      "description": "string",
      "source": "string",
      "date": "string",
      "relevance_to_revology": "string",
      "credibility_score": 0.0-1.0
    }
  ],
  "pain_point_hypotheses": [
    {
      "hypothesis": "string",
      "evidence": "string",
      "revology_solution_fit": "string"
    }
  ],
  "persona_angles": {
    "cfo_finance": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "pricing_rgm": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "sales_commercial": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "ceo_gm": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    },
    "technology_analytics": {
      "primary_hook": "string",
      "supporting_point": "string",
      "question_to_pose": "string"
    }
  },
  "outreach_priority": {
    "recommended_personas": ["string"],
    "timing_notes": "string",
    "cautions": ["string"]
  },
  "research_confidence": {
    "overall_score": 0.0-1.0,
    "gaps": ["string"],
    "financial_confidence": 0.0-1.0,
    "signal_freshness": 0.0-1.0,
    "source_quality": 0.0-1.0,
    "search_coverage": 0.0-1.0
  }
}

Focus on actionable insights for B2B sales outreach. Be specific and evidence-based.`;

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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const organizationId = userData.organization_id;

    // Check credits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const creditsMap = { quick: 1, standard: 2, deep: 3 };
    const body = await request.json();
    const requiredCredits = creditsMap[body.research_type as keyof typeof creditsMap] || 2;

    if (!subscription || (subscription.credits_used + requiredCredits) > subscription.credits_limit) {
      return NextResponse.json(
        { error: 'Insufficient credits', credits_remaining: subscription ? subscription.credits_limit - subscription.credits_used : 0 },
        { status: 402 }
      );
    }

    // Get API key (using admin client to bypass RLS for decryption)
    const { data: apiKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', organizationId)
      .eq('provider', 'openai')
      .single();

    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: apiKeyData.encrypted_key, // In production, decrypt this
    });

    // Build prompt
    const prompt = RESEARCH_PROMPT
      .replace('{company_name}', body.company_name)
      .replace('{company_website}', body.company_website || 'Not provided')
      .replace('{industry}', body.industry || 'Not specified')
      .replace('{research_type}', body.research_type);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B sales researcher. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const research = JSON.parse(responseText);
    const durationMs = Date.now() - startTime;

    // Save research session
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        company_name: body.company_name,
        company_website: body.company_website,
        industry: body.industry || research.company_profile?.industry,
        research_type: body.research_type,
        ai_provider: 'openai',
        ai_model: 'gpt-4o',
        confidence_score: research.research_confidence?.overall_score,
        signals_found: research.recent_signals?.length || 0,
        pain_points_found: research.pain_point_hypotheses?.length || 0,
        credits_used: requiredCredits,
        duration_ms: durationMs,
        status: 'completed',
      })
      .select()
      .single();

    // Update credits used
    await adminClient
      .from('subscriptions')
      .update({ credits_used: subscription.credits_used + requiredCredits })
      .eq('organization_id', organizationId);

    // Log usage
    await supabase.from('usage_records').insert({
      organization_id: organizationId,
      user_id: user.id,
      action_type: 'research',
      provider: 'openai',
      model: 'gpt-4o',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
      credits_used: requiredCredits,
      metadata: {
        company_name: body.company_name,
        research_type: body.research_type,
      },
    });

    return NextResponse.json({
      success: true,
      session_id: session?.id,
      research,
      credits_used: requiredCredits,
      credits_remaining: subscription.credits_limit - subscription.credits_used - requiredCredits,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}
