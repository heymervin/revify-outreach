import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { DEFAULT_RESEARCH_PROMPT } from '../prompts/defaults';
import { executeResearchV3_2 } from '@/lib/research';
import { RESEARCH_CREDITS, ResearchTier } from '@/types/researchTypesV3';
import { decryptApiKey } from '@/lib/crypto';
import { getActiveGHLAccount } from '@/lib/ghl';

// Validate and normalize research response to ensure required fields exist
function validateAndNormalizeResearch(research: any, companyName: string, industry: string) {
  // Ensure company_profile exists with required fields
  if (!research.company_profile) {
    research.company_profile = {};
  }
  if (!research.company_profile.confirmed_name) {
    research.company_profile.confirmed_name = companyName;
  }
  if (!research.company_profile.industry) {
    research.company_profile.industry = industry || 'Unknown';
  }

  // Ensure arrays exist
  research.recent_signals = Array.isArray(research.recent_signals) ? research.recent_signals : [];
  research.pain_point_hypotheses = Array.isArray(research.pain_point_hypotheses) ? research.pain_point_hypotheses : [];

  // Ensure confidence exists
  if (!research.research_confidence) {
    research.research_confidence = {
      overall_score: 0.5,
      gaps: ['Some data may be incomplete']
    };
  }

  return research;
}

// Quick research prompt - simplified for fast results
const QUICK_RESEARCH_PROMPT = `You are an expert B2B sales researcher. Quickly analyze the following company and provide a brief research overview.

Company: {company_name}
Website: {company_website}
Industry: {industry}

Provide your analysis in the following JSON format:
{
  "company_profile": {
    "confirmed_name": "string",
    "industry": "string",
    "estimated_revenue": "string or null",
    "employee_count": "string or null",
    "business_model": "string",
    "headquarters": "string or null"
  },
  "recent_signals": [
    {
      "signal_type": "string",
      "description": "string",
      "source": "string",
      "credibility_score": 0.0-1.0
    }
  ],
  "pain_point_hypotheses": [
    {
      "hypothesis": "string",
      "evidence": "string"
    }
  ],
  "research_confidence": {
    "overall_score": 0.0-1.0,
    "gaps": ["string"]
  }
}

Keep it brief. Focus on the most important 2-3 signals and pain points.`;

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

    // Pin the active GHL account for this research session
    const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

    // Parse request body
    const body = await request.json();
    const researchType = (body.research_type || 'standard') as ResearchTier;

    // Get required credits based on tier
    const requiredCredits = RESEARCH_CREDITS[researchType] || 2;

    // Check credits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription || (subscription.credits_used + requiredCredits) > subscription.credits_limit) {
      return NextResponse.json(
        { error: 'Insufficient credits', credits_remaining: subscription ? subscription.credits_limit - subscription.credits_used : 0 },
        { status: 402 }
      );
    }

    // Get OpenAI API key (using admin client to bypass RLS)
    const { data: openaiKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', organizationId)
      .eq('provider', 'openai')
      .single();

    if (!openaiKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Decrypt the API key
    const openaiKey = decryptApiKey(openaiKeyData.encrypted_key);

    // Route to appropriate research engine based on tier
    let research;
    let aiModel = 'gpt-4o';
    let inputTokens = 0;
    let outputTokens = 0;

    if (researchType === 'deep') {
      // Deep research requires Tavily API key
      const { data: tavilyKeyData } = await adminClient
        .from('api_keys')
        .select('encrypted_key')
        .eq('organization_id', organizationId)
        .eq('provider', 'tavily')
        .single();

      if (!tavilyKeyData?.encrypted_key) {
        return NextResponse.json(
          { error: 'Tavily API key required for deep research. Please add it in Settings.' },
          { status: 400 }
        );
      }

      // Decrypt Tavily API key
      const tavilyKey = decryptApiKey(tavilyKeyData.encrypted_key);

      // Use V3.2 hybrid engine for deep research
      research = await executeResearchV3_2(
        {
          companyName: body.company_name,
          website: body.company_website,
          industry: body.industry || 'Not specified',
          researchDepth: 'deep',
        },
        openaiKey,
        tavilyKey
      );
      aiModel = 'gpt-4o-search-preview + o1';
      // Extract token usage from deep research metadata
      inputTokens = research.metadata?.input_tokens || 0;
      outputTokens = research.metadata?.output_tokens || 0;

    } else if (researchType === 'quick') {
      // Quick research - simplified prompt, faster response
      const openai = new OpenAI({ apiKey: openaiKey });

      const prompt = QUICK_RESEARCH_PROMPT
        .replace(/{company_name}/g, body.company_name)
        .replace(/{company_website}/g, body.company_website || 'Not provided')
        .replace(/{industry}/g, body.industry || 'Not specified');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert B2B sales researcher. Always respond with valid JSON only. Be concise.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI');
      }

      try {
        research = JSON.parse(responseText);
      } catch (e) {
        throw new Error('AI returned invalid JSON response. Please check your prompt template includes proper JSON instructions.');
      }

      research = validateAndNormalizeResearch(research, body.company_name, body.industry);
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;

    } else {
      // Standard research - full prompt with all features
      const openai = new OpenAI({ apiKey: openaiKey });

      // Get custom prompt if available
      let promptTemplate = DEFAULT_RESEARCH_PROMPT;

      const { data: customPrompt } = await supabase
        .from('prompt_templates')
        .select('content')
        .eq('organization_id', organizationId)
        .eq('type', 'research')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (customPrompt?.content) {
        promptTemplate = customPrompt.content;
      }

      // Build prompt with variable replacement
      const prompt = promptTemplate
        .replace(/{company_name}/g, body.company_name)
        .replace(/{company_website}/g, body.company_website || 'Not provided')
        .replace(/{industry}/g, body.industry || 'Not specified')
        .replace(/{research_type}/g, body.research_type);

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

      try {
        research = JSON.parse(responseText);
      } catch (e) {
        throw new Error('AI returned invalid JSON response. Please check your prompt template includes proper JSON instructions.');
      }

      research = validateAndNormalizeResearch(research, body.company_name, body.industry);
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
    }

    const durationMs = Date.now() - startTime;

    // Determine confidence score based on research type
    const confidenceScore = researchType === 'deep'
      ? (research.hypothesis?.confidence === 'high' ? 0.9 : research.hypothesis?.confidence === 'medium' ? 0.7 : 0.5)
      : research.research_confidence?.overall_score;

    // Save research session with full research output for email generation
    const { data: session } = await supabase
      .from('research_sessions')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        company_name: body.company_name,
        company_website: body.company_website,
        industry: body.industry || research.company_profile?.industry,
        research_type: researchType,
        ai_provider: 'openai',
        ai_model: aiModel,
        confidence_score: confidenceScore,
        signals_found: research.recent_signals?.length || 0,
        pain_points_found: research.pain_point_hypotheses?.length || research.intent_signals?.length || 0,
        research_output: research, // Store full ResearchOutputV3 for email generation
        credits_used: requiredCredits,
        duration_ms: durationMs,
        status: 'completed',
        ghl_company_id: body.ghl_company_id || null,
        ghl_account_id: ghlAccount?.id || null,
      })
      .select()
      .single();

    // Check if this company already has research pushed to GHL
    let hasExistingGhlResearch = false;
    let existingGhlPushedAt: string | null = null;

    if (body.ghl_company_id) {
      const { data: existingResearch } = await supabase
        .from('research_sessions')
        .select('id, ghl_pushed_at')
        .eq('organization_id', organizationId)
        .eq('ghl_company_id', body.ghl_company_id)
        .not('ghl_pushed_at', 'is', null)
        .order('ghl_pushed_at', { ascending: false })
        .limit(1);

      hasExistingGhlResearch = !!(existingResearch && existingResearch.length > 0);
      existingGhlPushedAt = existingResearch?.[0]?.ghl_pushed_at || null;
    }

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
      model: aiModel,
      input_tokens: inputTokens || research.metadata?.searches_performed || 0,
      output_tokens: outputTokens || research.metadata?.sources_cited || 0,
      credits_used: requiredCredits,
      metadata: {
        company_name: body.company_name,
        research_type: researchType,
        estimated_cost: research.metadata?.estimated_cost,
      },
    });

    // Calculate estimated cost from tokens
    const inputCost = (inputTokens / 1_000_000) * 2.50; // GPT-4o input pricing
    const outputCost = (outputTokens / 1_000_000) * 10.00; // GPT-4o output pricing
    const estimatedCost = Math.round((inputCost + outputCost) * 1000) / 1000;

    return NextResponse.json({
      success: true,
      session_id: session?.id,
      research,
      research_type: researchType,
      credits_used: requiredCredits,
      credits_remaining: subscription.credits_limit - subscription.credits_used - requiredCredits,
      duration_ms: durationMs,
      // Token usage for transparency
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      // Smart auto-push info
      has_existing_ghl_research: hasExistingGhlResearch,
      existing_ghl_pushed_at: existingGhlPushedAt,
    });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}
