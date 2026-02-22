import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET - Get single prompt by ID
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

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { data: prompt, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single();

    if (error || !prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
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

// PUT - Update prompt
export async function PUT(
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

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Only admins can update prompts' }, { status: 403 });
    }

    // Verify prompt belongs to org
    const { data: existingPrompt } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single();

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, content, is_default } = body;

    // Extract variables from content if content is being updated
    let variables = existingPrompt.variables;
    if (content) {
      const variableRegex = /\{(\w+)\}/g;
      variables = [];
      let match;
      while ((match = variableRegex.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
    }

    // If setting as default, unset existing default
    if (is_default && !existingPrompt.is_default) {
      await supabase
        .from('prompt_templates')
        .update({ is_default: false })
        .eq('organization_id', userData.organization_id)
        .eq('type', existingPrompt.type)
        .eq('is_default', true);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) {
      updateData.content = content;
      updateData.variables = variables;
    }
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data: prompt, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt:', error);
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
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

// DELETE - Soft delete prompt (set is_active = false)
export async function DELETE(
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

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Only admins can delete prompts' }, { status: 403 });
    }

    // Verify prompt belongs to org
    const { data: existingPrompt } = await supabase
      .from('prompt_templates')
      .select('id, is_default, type')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single();

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabase
      .from('prompt_templates')
      .update({ is_active: false, is_default: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting prompt:', error);
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
