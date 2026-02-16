import type {
  ApolloPeopleSearchFilters,
  ApolloPeopleSearchResponse,
  ApolloOrganizationSearchFilters,
  ApolloOrganizationSearchResponse,
  ApolloPerson,
  ApolloOrganization,
  ApolloHealthResponse,
} from '@/types/apolloTypes';

const APOLLO_API_BASE = 'https://api.apollo.io/v1';

function getHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Api-Key': apiKey,
  };
}

async function handleErrorResponse(response: Response, context: string): Promise<never> {
  const errorBody = await response.text().catch(() => '');
  console.error(`[Apollo] ${context} failed (${response.status}):`, errorBody);

  let message = '';
  try {
    const parsed = JSON.parse(errorBody);
    message = parsed.message || parsed.error || '';
  } catch {
    // not JSON
  }

  throw new Error(message || `Apollo API error: ${response.status} - ${errorBody.slice(0, 200)}`);
}

/**
 * Search for people in Apollo's database
 */
export async function searchPeople(
  apiKey: string,
  filters: ApolloPeopleSearchFilters
): Promise<ApolloPeopleSearchResponse> {
  const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      ...filters,
      page: filters.page || 1,
      per_page: filters.per_page || 25,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'People search');
  }

  const data = await response.json();

  return {
    people: data.people || [],
    pagination: {
      page: data.pagination?.page || filters.page || 1,
      per_page: data.pagination?.per_page || filters.per_page || 25,
      total_entries: data.pagination?.total_entries || 0,
      total_pages: data.pagination?.total_pages || 0,
    },
  };
}

/**
 * Search for organizations in Apollo's database
 */
export async function searchOrganizations(
  apiKey: string,
  filters: ApolloOrganizationSearchFilters
): Promise<ApolloOrganizationSearchResponse> {
  const response = await fetch(`${APOLLO_API_BASE}/mixed_companies/search`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      ...filters,
      page: filters.page || 1,
      per_page: filters.per_page || 25,
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Org search');
  }

  const data = await response.json();

  return {
    organizations: data.organizations || [],
    pagination: {
      page: data.pagination?.page || filters.page || 1,
      per_page: data.pagination?.per_page || filters.per_page || 25,
      total_entries: data.pagination?.total_entries || 0,
      total_pages: data.pagination?.total_pages || 0,
    },
  };
}

/**
 * Get a single person by ID
 */
export async function getPersonById(
  apiKey: string,
  personId: string
): Promise<ApolloPerson> {
  const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify({ id: personId }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Person lookup');
  }

  const data = await response.json();
  return data.person;
}

/**
 * Match/enrich a person by email, LinkedIn URL, or name+domain (free plan)
 */
export async function matchPerson(
  apiKey: string,
  params: {
    email?: string;
    linkedin_url?: string;
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    domain?: string;
  }
): Promise<ApolloPerson | null> {
  const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Person match');
  }

  const data = await response.json();
  return data.person || null;
}

/**
 * Enrich an organization by domain (free plan)
 */
export async function enrichOrganization(
  apiKey: string,
  domain: string
): Promise<ApolloOrganization | null> {
  const url = new URL(`${APOLLO_API_BASE}/organizations/enrich`);
  url.searchParams.set('domain', domain);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    await handleErrorResponse(response, 'Organization enrich');
  }

  const data = await response.json();
  return data.organization || null;
}

/**
 * Check API key health
 */
export async function checkHealth(apiKey: string): Promise<ApolloHealthResponse> {
  const response = await fetch(`${APOLLO_API_BASE}/auth/health`, {
    method: 'GET',
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(`Apollo health check failed: ${response.status}`);
  }

  return response.json();
}
