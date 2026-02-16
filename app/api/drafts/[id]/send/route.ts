import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { validateInput, emailSendSchema } from '@/lib/validation';
import {
  handleApiError,
  AuthenticationError,
  NotFoundError,
  ConfigurationError,
  ValidationError,
  ExternalServiceError,
} from '@/lib/errors';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

// Maximum subject length per email best practices
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 50000;

// POST /api/drafts/[id]/send - Send email via GHL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new ValidationError('Invalid draft ID format');
    }

    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError();
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, email, full_name')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      throw new NotFoundError('Organization');
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from('email_drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (draftError || !draft) {
      throw new NotFoundError('Draft');
    }

    // Check if already sent
    if (draft.status === 'sent') {
      throw new ValidationError('This draft has already been sent');
    }

    // Validate draft content
    if (!draft.subject || draft.subject.trim().length === 0) {
      throw new ValidationError('Email subject is required');
    }

    if (draft.subject.length > MAX_SUBJECT_LENGTH) {
      throw new ValidationError(`Email subject must be ${MAX_SUBJECT_LENGTH} characters or less`);
    }

    if (!draft.body || draft.body.trim().length === 0) {
      throw new ValidationError('Email body is required');
    }

    if (draft.body.length > MAX_BODY_LENGTH) {
      throw new ValidationError(`Email body must be ${MAX_BODY_LENGTH} characters or less`);
    }

    // Get GHL config using admin client to bypass RLS
    const { data: ghlConfig } = await adminClient
      .from('ghl_config')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .single();

    if (!ghlConfig?.location_id) {
      throw new ConfigurationError(
        'GHL Location ID',
        'GoHighLevel not configured. Please add your Location ID in Settings.'
      );
    }

    // Get GHL API key
    const { data: apiKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', userData.organization_id)
      .eq('provider', 'ghl')
      .single();

    if (!apiKeyData?.encrypted_key) {
      throw new ConfigurationError(
        'GHL API Key',
        'GoHighLevel API key not configured. Please add it in Settings.'
      );
    }

    // Decrypt the GHL API key
    const ghlApiKey = decryptApiKey(apiKeyData.encrypted_key);

    // Get contact_id from request body or draft
    const body = await request.json().catch(() => ({}));
    const contactId = body.contact_id || draft.ghl_contact_id;

    if (!contactId) {
      throw new ValidationError('Contact ID is required to send email. Please select a GHL contact.');
    }

    // Build email payload
    const emailPayload = {
      type: 'Email',
      contactId: contactId,
      subject: draft.subject.trim(),
      html: draft.body.replace(/\n/g, '<br>'),
      emailFrom: ghlConfig.email_from || undefined,
    };

    console.log('[Draft Send] Sending email to contact:', contactId);

    // Send email via GHL Conversations API
    const response = await fetch(
      `${GHL_API_BASE}/conversations/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          Version: API_VERSION,
        },
        body: JSON.stringify(emailPayload),
      }
    );

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Draft Send] GHL API error:', response.status, errorData);

      // Parse GHL error messages for better user feedback
      let errorMessage = 'Failed to send email via GoHighLevel';

      if (response.status === 401) {
        errorMessage = 'GoHighLevel authentication failed. Please verify your API key is valid.';
      } else if (response.status === 404) {
        errorMessage = 'Contact not found in GoHighLevel. Please verify the contact exists.';
      } else if (response.status === 422) {
        errorMessage = errorData.message || 'Invalid email data. Please check subject and body.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait and try again.';
      } else if (errorData.message) {
        errorMessage = `GoHighLevel: ${errorData.message}`;
      }

      throw new ExternalServiceError('GoHighLevel', errorMessage);
    }

    const ghlResponse = await response.json();
    const messageId = ghlResponse.messageId || ghlResponse.id;

    console.log('[Draft Send] Email sent successfully. Message ID:', messageId);

    // Update draft status to sent
    await supabase
      .from('email_drafts')
      .update({
        status: 'sent',
        ghl_message_id: messageId,
        ghl_contact_id: contactId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Log to usage_records
    await supabase.from('usage_records').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      action_type: 'email_send',
      metadata: {
        draft_id: id,
        contact_id: contactId,
        message_id: messageId,
        subject: draft.subject.substring(0, 100), // Truncate for logging
        duration_ms: durationMs,
      },
    });

    // Log to audit_logs for compliance tracking
    try {
      await supabase.from('audit_logs').insert({
        organization_id: userData.organization_id,
        user_id: user.id,
        action: 'email_sent',
        resource_type: 'email_draft',
        resource_id: id,
        details: {
          contact_id: contactId,
          ghl_message_id: messageId,
          subject_preview: draft.subject.substring(0, 50),
          body_length: draft.body.length,
          sent_at: new Date().toISOString(),
          sender_email: userData.email,
          sender_name: userData.full_name,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      });
    } catch (auditErr) {
      // Don't fail the request if audit logging fails
      console.error('[Draft Send] Failed to create audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message_id: messageId,
      message: 'Email sent successfully',
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[Draft Send] Error:', error);
    return handleApiError(error);
  }
}
