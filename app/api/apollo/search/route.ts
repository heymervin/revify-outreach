import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { searchPeople, searchOrganizations } from '@/lib/apollo';
import type {
  ApolloPeopleSearchFilters,
  ApolloOrganizationSearchFilters,
} from '@/types/apolloTypes';

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

    // Get Apollo API key using admin client
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
    const { type, filters, page, per_page } = body;

    // Validate request
    if (!type || (type !== 'people' && type !== 'organizations')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "people" or "organizations"' },
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { error: 'Filters object is required' },
        { status: 400 }
      );
    }

    // Add pagination to filters
    const searchFilters: any = {
      ...filters,
      page: page || 1,
      per_page: per_page || 25,
    };

    // Map UI filter names to Apollo API parameter names for people search
    if (type === 'people') {
      if (filters.departments) {
        searchFilters.person_departments = filters.departments.split(',').map((d: string) => d.trim());
        delete searchFilters.departments;
      }
      if (filters.email_status) {
        searchFilters.contact_email_status = filters.email_status.split(',').map((s: string) => s.trim());
        delete searchFilters.email_status;
      }
    }

    // Call appropriate search function
    let results;
    let pagination;

    if (type === 'people') {
      const response = await searchPeople(apolloApiKey, searchFilters as ApolloPeopleSearchFilters);
      results = (response.people || []).map((p) => ({
        id: p.id,
        name: p.name,
        title: p.title || '',
        company: p.organization?.name || '',
        location: [p.city, p.state, p.country].filter(Boolean).join(', '),
        seniority: p.seniority || '',
        email: p.email,
        email_status: p.email_status || '',
        linkedin_url: p.linkedin_url,
        _apollo_data: p,
      }));
      pagination = response.pagination;
    } else {
      try {
        const response = await searchOrganizations(apolloApiKey, searchFilters as ApolloOrganizationSearchFilters);
        results = (response.organizations || []).map((o) => ({
          id: o.id,
          name: o.name,
          industry: o.industry || '',
          employees: o.estimated_num_employees ? String(o.estimated_num_employees) : '',
          revenue: o.annual_revenue_printed || '',
          location: [o.city, o.state, o.country].filter(Boolean).join(', '),
          website: o.website_url,
          linkedin_url: o.linkedin_url,
          _apollo_data: o,
        }));
        pagination = response.pagination;
      } catch (orgError) {
        const msg = orgError instanceof Error ? orgError.message : '';
        if (msg.includes('403') || msg.includes('not accessible')) {
          return NextResponse.json(
            { error: 'Organization search requires an Apollo paid plan. Try People search instead.' },
            { status: 403 }
          );
        }
        throw orgError;
      }
    }

    // Log usage to usage_records table
    await supabase.from('usage_records').insert({
      organization_id: organizationId,
      user_id: user.id,
      action_type: 'apollo_search',
      provider: 'apollo',
      credits_used: 0, // Apollo search is free
      metadata: {
        search_type: type,
        results_count: results.length,
        page: pagination.page,
      },
    });

    return NextResponse.json({
      results,
      total: pagination.total_entries,
      page: pagination.page,
      per_page: pagination.per_page,
      total_pages: pagination.total_pages,
    });
  } catch (error) {
    console.error('[Apollo Search] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Apollo search failed' },
      { status: 500 }
    );
  }
}
