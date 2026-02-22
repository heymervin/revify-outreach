import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { matchPerson, enrichOrganization } from '@/lib/apollo';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    const organizationId = userData.organization_id;

    // Get Apollo API key
    const adminClient = createAdminClient();
    const { data: apiKeyData } = await adminClient
      .from('api_keys')
      .select('encrypted_key')
      .eq('organization_id', organizationId)
      .eq('provider', 'apollo')
      .single();

    if (!apiKeyData?.encrypted_key) {
      return NextResponse.json(
        { error: 'Apollo API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    const apolloApiKey = decryptApiKey(apiKeyData.encrypted_key);

    // Parse request body
    const body = await request.json();
    const { type, email, linkedin_url, first_name, last_name, domain, organization_name } = body;

    if (!type || (type !== 'person' && type !== 'organization')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "person" or "organization"' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'person') {
      // Need at least email, linkedin_url, or name+domain
      if (!email && !linkedin_url && !(first_name && (domain || organization_name))) {
        return NextResponse.json(
          { error: 'Provide an email, LinkedIn URL, or first name with a domain/company name' },
          { status: 400 }
        );
      }

      const person = await matchPerson(apolloApiKey, {
        email: email || undefined,
        linkedin_url: linkedin_url || undefined,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        domain: domain || undefined,
        organization_name: organization_name || undefined,
      });

      if (!person) {
        return NextResponse.json({ result: null, message: 'No matching person found' });
      }

      result = {
        id: person.id,
        name: person.name,
        first_name: person.first_name,
        last_name: person.last_name,
        title: person.title || '',
        company: person.organization?.name || '',
        location: [person.city, person.state, person.country].filter(Boolean).join(', '),
        seniority: person.seniority || '',
        email: person.email,
        linkedin_url: person.linkedin_url,
        photo_url: person.photo_url,
        headline: person.headline,
        departments: person.departments,
        employment_history: person.employment_history,
        organization: person.organization,
        _apollo_data: person,
      };
    } else {
      // Organization enrichment requires domain
      if (!domain) {
        return NextResponse.json(
          { error: 'Domain is required for organization lookup' },
          { status: 400 }
        );
      }

      const org = await enrichOrganization(apolloApiKey, domain);

      if (!org) {
        return NextResponse.json({ result: null, message: 'No matching organization found' });
      }

      result = {
        id: org.id,
        name: org.name,
        industry: org.industry || '',
        employees: org.estimated_num_employees ? String(org.estimated_num_employees) : '',
        revenue: org.annual_revenue_printed || '',
        location: [org.city, org.state, org.country].filter(Boolean).join(', '),
        website: org.website_url,
        linkedin_url: org.linkedin_url,
        logo_url: org.logo_url,
        description: org.short_description,
        founded_year: org.founded_year,
        keywords: org.keywords,
        _apollo_data: org,
      };
    }

    // Log usage
    await supabase.from('usage_records').insert({
      organization_id: organizationId,
      user_id: user.id,
      action_type: 'apollo_lookup',
      provider: 'apollo',
      credits_used: 0,
      metadata: {
        lookup_type: type,
        found: !!result,
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[Apollo Lookup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Apollo lookup failed' },
      { status: 500 }
    );
  }
}
