import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  DEFAULT_RESEARCH_PROMPT,
  DEFAULT_EMAIL_PROMPT,
  RESEARCH_VARIABLES,
  EMAIL_VARIABLES,
} from './defaults';

// GET - List all prompts for organization
export async function GET(request: NextRequest) {
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

    // Get optional type filter
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = supabase
      .from('prompt_templates')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prompts: prompts || [],
      defaults: {
        research: {
          content: DEFAULT_RESEARCH_PROMPT,
          variables: RESEARCH_VARIABLES,
        },
        email: {
          content: DEFAULT_EMAIL_PROMPT,
          variables: EMAIL_VARIABLES,
        },
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new prompt template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Only admins can create prompts' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, content, is_default } = body;

    if (!name || !type || !content) {
      return NextResponse.json({ error: 'Name, type, and content are required' }, { status: 400 });
    }

    if (!['research', 'email'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "research" or "email"' }, { status: 400 });
    }

    // Extract variables from content
    const variableRegex = /\{(\w+)\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // If setting as default, unset existing default
    if (is_default) {
      await supabase
        .from('prompt_templates')
        .update({ is_default: false })
        .eq('organization_id', userData.organization_id)
        .eq('type', type)
        .eq('is_default', true);
    }

    const { data: prompt, error } = await supabase
      .from('prompt_templates')
      .insert({
        organization_id: userData.organization_id,
        name,
        type,
        content,
        variables,
        is_default: is_default || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prompt,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
