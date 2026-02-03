import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const EMAIL_PROMPT = `You are an expert B2B sales copywriter. Generate a personalized cold outreach email based on the research data provided.

Company: {company_name}
Industry: {industry}
Target Persona: {persona}
Email Tone: {tone}

Research Insights:
{research_summary}

Pain Points:
{pain_points}

Talking Points for {persona}:
{talking_points}

Generate a compelling email with:
1. An attention-grabbing subject line (under 50 characters)
2. A personalized opening that references a recent signal or specific insight
3. A clear value proposition tied to their pain points
4. A soft call-to-action

Return your response as JSON:
{
  "subject": "string",
  "body": "string"
}

Keep the email concise (under 150 words). Be specific, not generic. Reference real details from the research.`;

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
    const { session_id, persona, tone } = body;

    // Get research session (we'll simulate research data for now)
    const { data: session } = await supabase
      .from('research_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Research session not found' }, { status: 404 });
    }

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

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: apiKeyData.encrypted_key,
    });

    // Build prompt
    const personaLabels: Record<string, string> = {
      cfo_finance: 'CFO / Finance Leader',
      ceo_gm: 'CEO / General Manager',
      pricing_rgm: 'Pricing / Revenue Growth Manager',
      sales_commercial: 'Sales / Commercial Leader',
      technology_analytics: 'Technology / Analytics Leader',
    };

    const prompt = EMAIL_PROMPT
      .replace('{company_name}', session.company_name)
      .replace('{industry}', session.industry || 'Unknown')
      .replace(/{persona}/g, personaLabels[persona] || persona)
      .replace('{tone}', tone)
      .replace('{research_summary}', `Company in ${session.industry || 'their'} industry with ${session.signals_found} recent signals identified.`)
      .replace('{pain_points}', `${session.pain_points_found} potential pain points identified during research.`)
      .replace('{talking_points}', 'Based on recent company activities and market position.');

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
        session_id,
        persona,
        tone,
        company_name: session.company_name,
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
