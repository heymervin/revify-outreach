import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getActiveGHLAccount } from '@/lib/ghl';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const DEFAULT_PAGE_LIMIT = 100;

// GHL Business Record structure from Custom Objects API
interface GHLBusinessRecord {
  id: string;
  locationId: string;
  objectKey: string;
  properties: {
    name?: string;
    website?: string;
    email?: string;
    phone?: string;
    industry?: string;
    score?: number | string;
    company_research?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface GHLBusinessSearchResponse {
  records: GHLBusinessRecord[];
  total?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pageLimit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_LIMIT), 10),
      DEFAULT_PAGE_LIMIT
    );

    // Support both 'skip' (offset-based) and 'page' (1-indexed) parameters
    const skipParam = searchParams.get('skip');
    const pageParam = searchParams.get('page');

    let page: number;
    let skip: number;

    if (skipParam !== null && skipParam !== '' && !isNaN(parseInt(skipParam, 10))) {
      skip = Math.max(0, parseInt(skipParam, 10));
      page = Math.floor(skip / pageLimit) + 1;
    } else if (pageParam !== null && pageParam !== '') {
      page = Math.max(1, parseInt(pageParam, 10) || 1);
      skip = (page - 1) * pageLimit;
    } else {
      page = 1;
      skip = 0;
    }

    const query = searchParams.get('query') || '';
    const companyId = searchParams.get('id');

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

    // Get active GHL account (user-selected or primary)
    const ghlAccount = await getActiveGHLAccount(user.id, organizationId);

    if (!ghlAccount?.location_id) {
      return NextResponse.json(
        { error: 'GHL not configured. Please add a GHL account in Settings.' },
        { status: 400 }
      );
    }

    if (!ghlAccount.access_token) {
      return NextResponse.json(
        { error: 'GHL access token not configured. Please update your GHL account in Settings.' },
        { status: 400 }
      );
    }

    const ghlApiKey = ghlAccount.access_token;
    const locationId = ghlAccount.location_id;

    // Handle single company fetch by ID
    if (companyId) {
      return handleSingleCompanyFetch(ghlApiKey, companyId);
    }

    // Use Custom Objects API endpoint
    const ghlUrl = `${GHL_API_BASE}/objects/business/records/search`;

    const requestBody: Record<string, unknown> = {
      locationId,
      page,
      pageLimit,
    };

    if (query) {
      requestBody.query = query;
    }

    console.log('[GHL API] Request:', { page, pageLimit, query: query || '(none)' });

    const response = await fetch(ghlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json',
        Version: API_VERSION,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GHL API] Error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'GHL Authentication Failed. Please verify your Private Integration Token is valid.' },
          { status: 401 }
        );
      }

      throw new Error(`Failed to fetch from GHL: ${response.status}`);
    }

    const data: GHLBusinessSearchResponse = await response.json();

    // Transform to our format
    const companies = (data.records || [])
      .filter((record) => record.properties?.name)
      .map((record) => {
        let score: number | undefined;
        if (record.properties.score !== undefined) {
          const rawScore = record.properties.score;
          score = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore));
          if (isNaN(score)) score = undefined;
        }

        return {
          id: record.id,
          companyName: record.properties.name || '',
          website: record.properties.website || '',
          industry: record.properties.industry || '',
          email: record.properties.email || '',
          phone: record.properties.phone || '',
          score,
          hasExistingResearch: false,
          selected: false,
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));

    const total = data.total || companies.length;
    const count = companies.length;
    const hasMore = page * pageLimit < total;

    return NextResponse.json({
      companies,
      total,
      count,
      hasMore,
      page,
      pageLimit,
      skip,
      limit: pageLimit,
    });
  } catch (error) {
    console.error('[GHL API] Companies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

/**
 * Handle fetching a single company by ID from GHL
 */
async function handleSingleCompanyFetch(
  ghlApiKey: string,
  companyId: string
): Promise<NextResponse> {
  const ghlUrl = `${GHL_API_BASE}/objects/business/records/${companyId}`;
  console.log('[GHL API] Fetching single business:', ghlUrl);

  const response = await fetch(ghlUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ghlApiKey}`,
      'Content-Type': 'application/json',
      Version: API_VERSION,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GHL API] Error fetching business by ID:', response.status, errorText);
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    );
  }

  const responseData = await response.json();
  // GHL wraps the record in { record: { ... } }
  const record: GHLBusinessRecord = responseData.record || responseData;

  if (!record || !record.properties) {
    console.error('[GHL API] Invalid business record structure:', responseData);
    return NextResponse.json(
      { error: 'Invalid business data from GHL' },
      { status: 500 }
    );
  }

  let companyResearch = null;
  let hasResearch = false;

  if (record.properties.company_research) {
    try {
      companyResearch = JSON.parse(record.properties.company_research);
      hasResearch = !!(companyResearch && Object.keys(companyResearch).length > 0);
    } catch (e) {
      console.error('[GHL API] Failed to parse company_research:', e);
    }
  }

  const company = {
    id: record.id,
    companyName: record.properties.name || '',
    website: record.properties.website || '',
    industry: record.properties.industry || '',
    email: record.properties.email || '',
    phone: record.properties.phone || '',
    hasResearch,
    research: companyResearch,
  };

  return NextResponse.json({ company });
}
