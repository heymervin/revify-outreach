import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getActiveGHLAccount } from '@/lib/ghl';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  businessId?: string; // Links contact to a business record
  customFields?: Array<{
    id: string;
    key?: string;
    field_key?: string;
    value: string;
  }>;
}

interface GHLContactsResponse {
  contacts: GHLContact[];
  meta?: {
    total?: number;
    currentPage?: number;
    nextPage?: number;
    prevPage?: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('company_id'); // The business record ID
    const companyName = searchParams.get('company_name'); // Fallback for matching

    if (!businessId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

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

    // Get active GHL account (user-selected or primary)
    const ghlAccount = await getActiveGHLAccount(user.id, userData.organization_id);

    if (!ghlAccount?.location_id || !ghlAccount.access_token) {
      return NextResponse.json(
        { error: 'GHL account not configured. Please add a GHL account in Settings.' },
        { status: 400 }
      );
    }

    const ghlApiKey = ghlAccount.access_token;

    // Fetch ALL contacts from GHL (no companyId filter - GHL doesn't support it)
    // Then filter client-side by businessId or companyName
    const ghlUrl = new URL(`${GHL_API_BASE}/contacts/`);
    ghlUrl.searchParams.set('locationId', ghlAccount.location_id);
    ghlUrl.searchParams.set('limit', '100');

    console.log('[GHL Contacts] Request URL:', ghlUrl.toString());

    const response = await fetch(ghlUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        Version: API_VERSION,
      },
    });

    console.log('[GHL Contacts] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GHL Contacts] Error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'GHL Authentication Failed. Please verify your Private Integration Token is valid.' },
          { status: 401 }
        );
      }

      throw new Error(`Failed to fetch contacts from GHL: ${response.status}`);
    }

    const data: GHLContactsResponse = await response.json();
    const allContacts = data.contacts || [];

    console.log('[GHL Contacts] Total contacts fetched:', allContacts.length);

    // Filter contacts by businessId (primary) or companyName (fallback)
    let matchingContacts = allContacts.filter(c => c.businessId === businessId);
    console.log('[GHL Contacts] Contacts matching businessId:', matchingContacts.length);

    // If no contacts found by businessId, try matching by company name
    if (matchingContacts.length === 0 && companyName) {
      matchingContacts = allContacts.filter(
        c => c.companyName?.toLowerCase() === companyName.toLowerCase()
      );
      console.log('[GHL Contacts] Contacts matching companyName:', matchingContacts.length);
    }

    // Log sample contact for debugging
    if (matchingContacts[0]) {
      console.log('[GHL Contacts] Sample matching contact:', JSON.stringify(matchingContacts[0], null, 2));
    }

    // Transform contacts to our format
    const contacts = matchingContacts.map((contact) => {
      // Extract persona from custom fields
      let persona = '';
      if (contact.customFields) {
        const personaField = contact.customFields.find(
          (f) => f.key === 'persona' || f.field_key === 'persona' || f.key === 'contact.persona' || f.id?.toLowerCase().includes('persona')
        );
        if (personaField) {
          persona = personaField.value;
        }
      }

      // Build display name
      let name = contact.name;
      if (!name || name.trim() === '') {
        const firstName = contact.firstName || '';
        const lastName = contact.lastName || '';
        name = `${firstName} ${lastName}`.trim();
      }
      if (!name || name.trim() === '') {
        name = contact.email || `Contact ${contact.id.slice(0, 8)}`;
      }

      return {
        id: contact.id,
        name,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        companyName: contact.companyName || '',
        persona,
      };
    });

    return NextResponse.json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('[GHL Contacts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
