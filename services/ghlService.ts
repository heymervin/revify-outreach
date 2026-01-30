// GoHighLevel API Service
// Uses Private Integration Token (pit-...) for authentication
// API Docs: https://highlevel.stoplight.io/docs/integrations

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

// For debugging - log API calls
const DEBUG = true;

// GHL Business Record (from /objects/business/records/search endpoint)
export interface GHLBusinessRecord {
  id: string;
  locationId: string;
  objectKey: string;
  properties: {
    name?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    description?: string;
    industry?: string;
    // Additional common fields
    company_size?: string;
    annual_revenue?: string;
    linkedin_url?: string;
    notes?: string;
    // Research data field
    company_research?: string;
    // Score field for bulk filtering
    score?: number | string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GHLBusinessSearchResponse {
  records: GHLBusinessRecord[];
  total?: number;
}

export interface GHLCompanyOption {
  id: string;
  companyName: string;
  website?: string;
  email?: string;
  industry?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  contacts?: GHLAssociatedContact[];
  // Saved research JSON
  companyResearch?: string;
  // Score field for bulk filtering (from GHL)
  score?: number;
}

// GHL Contact from /contacts endpoint
export interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  businessId?: string; // Links contact to a business record
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  source?: string;
  dateAdded?: string;
  tags?: string[];
  persona?: string; // Direct persona field: CEO, CFO, Pricing, Technology, Sales
  customFields?: Array<{
    id: string;
    value: string;
  }>;
}

export interface GHLContactsResponse {
  contacts: GHLContact[];
  meta?: {
    total: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
  };
}

// GHL Relation (association between records)
export interface GHLRelation {
  id: string;
  associationId: string;
  firstRecordId: string;
  secondRecordId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLRelationsResponse {
  relations: GHLRelation[];
}

// Contact associated with a company
export interface GHLAssociatedContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  persona?: string; // GHL persona key: CEO, CFO, Pricing, Technology, Sales
}

export class GHLService {
  private apiKey: string;
  private locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${GHL_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Version': API_VERSION,
      'Content-Type': 'application/json',
    };

    if (DEBUG) {
      console.log('[GHL API] Request:', url);
      console.log('[GHL API] Method:', options.method || 'GET');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GHL API] Error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error(
          `GHL Authentication Failed: Please verify your Private Integration Token is valid and has the required scopes enabled. ` +
          `Go to GHL Settings → Integrations → Private Integrations to check/regenerate your token.`
        );
      }

      throw new Error(`GHL API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async searchBusinesses(
    query?: string,
    page: number = 1,
    pageLimit: number = 100
  ): Promise<GHLBusinessSearchResponse> {
    const body: Record<string, unknown> = {
      locationId: this.locationId,
      page,
      pageLimit,
    };

    // Add query if provided
    if (query) {
      body.query = query;
    }

    return this.request<GHLBusinessSearchResponse>(
      '/objects/business/records/search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  // Fetch ALL businesses across multiple pages (for bulk operations)
  async searchAllBusinesses(
    query?: string,
    pageLimit: number = 100,
    maxRecords: number = 1000
  ): Promise<GHLBusinessRecord[]> {
    const allRecords: GHLBusinessRecord[] = [];
    let page = 1;
    let hasMore = true;

    if (DEBUG) {
      console.log('[GHL API] Starting bulk fetch, maxRecords:', maxRecords);
    }

    while (hasMore && allRecords.length < maxRecords) {
      const response = await this.searchBusinesses(query, page, pageLimit);
      const records = response.records || [];

      if (DEBUG) {
        console.log(`[GHL API] Page ${page}: fetched ${records.length} records, total so far: ${allRecords.length + records.length}`);
      }

      if (records.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...records);

        // Check if we've reached the total
        if (response.total && allRecords.length >= response.total) {
          hasMore = false;
        }

        // Check if this page was not full (meaning no more records)
        if (records.length < pageLimit) {
          hasMore = false;
        }

        page++;
      }
    }

    if (DEBUG) {
      console.log('[GHL API] Bulk fetch complete, total records:', allRecords.length);
    }

    return allRecords.slice(0, maxRecords);
  }

  async getCompanyOptions(searchQuery?: string): Promise<GHLCompanyOption[]> {
    const response = await this.searchBusinesses(searchQuery);
    const records = response.records || [];

    return records
      .filter(record => record.properties?.name)
      .map(record => this.mapRecordToOption(record))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  // Get ALL company options for bulk operations (fetches multiple pages)
  async getAllCompanyOptions(
    maxRecords: number = 1000
  ): Promise<GHLCompanyOption[]> {
    const records = await this.searchAllBusinesses(undefined, 100, maxRecords);

    return records
      .filter(record => record.properties?.name)
      .map(record => this.mapRecordToOption(record))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  // Helper to map a business record to company option
  private mapRecordToOption(record: GHLBusinessRecord): GHLCompanyOption {
    // Parse score - handle both number and string formats
    let score: number | undefined;
    if (record.properties.score !== undefined) {
      const rawScore = record.properties.score;
      score = typeof rawScore === 'number' ? rawScore : parseFloat(rawScore);
      if (isNaN(score)) score = undefined;
    }

    return {
      id: record.id,
      companyName: record.properties.name!,
      website: record.properties.website,
      email: record.properties.email,
      industry: record.properties.industry,
      phone: record.properties.phone,
      address: record.properties.address,
      city: record.properties.city,
      state: record.properties.state,
      description: record.properties.description,
      companyResearch: record.properties.company_research,
      score,
    };
  }

  // Get a single business record by ID
  async getBusinessRecord(recordId: string): Promise<GHLBusinessRecord> {
    return this.request<GHLBusinessRecord>(
      `/objects/business/records/${recordId}`
    );
  }

  // Update a business record with research data
  async updateBusinessResearch(recordId: string, researchJson: string): Promise<GHLBusinessRecord> {
    // PUT /objects/business/records/{recordId}?locationId={locationId}
    // Body must have properties wrapper for custom fields
    const body = {
      properties: {
        company_research: researchJson,
      },
    };

    if (DEBUG) {
      console.log('[GHL API] Updating business record:', recordId);
      console.log('[GHL API] PUT /objects/business/records/' + recordId + '?locationId=' + this.locationId);
      console.log('[GHL API] Update body (truncated):', JSON.stringify(body).substring(0, 500) + '...');
    }

    const result = await this.request<GHLBusinessRecord>(
      `/objects/business/records/${recordId}?locationId=${this.locationId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );

    if (DEBUG) {
      console.log('[GHL API] Update response:', JSON.stringify(result).substring(0, 500) + '...');
    }

    return result;
  }

  // Get all relations for a specific record (e.g., business)
  async getRelationsForRecord(recordId: string, skip: number = 0, limit: number = 100, associationIds?: string[]): Promise<GHLRelationsResponse> {
    const params = new URLSearchParams({
      locationId: this.locationId,
      skip: skip.toString(),
      limit: limit.toString(),
    });
    // Add association IDs filter if provided
    if (associationIds && associationIds.length > 0) {
      associationIds.forEach(id => params.append('associationIds', id));
    }
    return this.request<GHLRelationsResponse>(
      `/associations/relations/${recordId}?${params.toString()}`
    );
  }

  // Get a single contact by ID
  async getContact(contactId: string): Promise<GHLContact> {
    return this.request<GHLContact>(
      `/contacts/${contactId}`
    );
  }

  // Update a contact with custom field data
  async updateContact(contactId: string, data: Record<string, unknown>): Promise<GHLContact> {
    if (DEBUG) {
      console.log('[GHL API] Updating contact:', contactId, data);
    }
    return this.request<GHLContact>(
      `/contacts/${contactId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  // Save drafted email to a contact's custom field
  async saveEmailToContact(contactId: string, email: { subject: string; body: string }): Promise<GHLContact> {
    const emailContent = `Subject: ${email.subject}\n\n${email.body}`;
    // Update the contact with the drafted_outreach_email custom field
    return this.updateContact(contactId, {
      customFields: [
        {
          key: 'drafted_outreach_email',
          field_value: emailContent,
        }
      ]
    });
  }

  // Get contacts list with optional query
  async getContacts(query?: string, limit: number = 100): Promise<GHLContactsResponse> {
    const params = new URLSearchParams({
      locationId: this.locationId,
      limit: limit.toString(),
    });
    if (query) {
      params.append('query', query);
    }
    return this.request<GHLContactsResponse>(
      `/contacts/?${params.toString()}`
    );
  }

  // Get contacts associated with a specific business record
  async getContactsForBusiness(businessRecordId: string, companyName?: string): Promise<GHLAssociatedContact[]> {
    try {
      console.log('[GHL] Fetching contacts for business:', businessRecordId, 'companyName:', companyName);

      // Search all contacts and filter by businessId
      const contactsResponse = await this.getContacts();
      const allContacts = contactsResponse.contacts || [];
      console.log('[GHL] Total contacts fetched:', allContacts.length);

      // Filter contacts that have this businessId
      const matchingContacts = allContacts.filter(c => c.businessId === businessRecordId);
      console.log('[GHL] Contacts matching businessId:', matchingContacts.length);

      // If no contacts found by businessId, try matching by company name
      if (matchingContacts.length === 0 && companyName) {
        console.log('[GHL] No contacts found by businessId, trying company name match');
        const byName = allContacts.filter(
          c => c.companyName?.toLowerCase() === companyName.toLowerCase()
        );
        console.log('[GHL] Contacts matching company name:', byName.length);
        matchingContacts.push(...byName);
      }

      if (matchingContacts.length === 0) {
        return [];
      }

      // Fetch full contact details for each matching contact to get custom fields
      const contacts: GHLAssociatedContact[] = [];
      for (const basicContact of matchingContacts) {
        try {
          // Fetch full contact data to get custom fields
          const fullContact = await this.getContact(basicContact.id);

          // Log contact data to identify persona field
          console.log('[GHL] Full contact data:', {
            id: fullContact.id,
            name: fullContact.name,
            persona: fullContact.persona,
            customFields: fullContact.customFields,
          });

          // Extract persona - check direct field first, then custom fields
          let persona: string | undefined = fullContact.persona;
          if (!persona && fullContact.customFields) {
            // Log all custom fields to find persona
            console.log('[GHL] Custom fields for', fullContact.name, ':', fullContact.customFields);
            const personaField = fullContact.customFields.find(
              field => field.id.toLowerCase().includes('persona')
            );
            if (personaField) {
              console.log('[GHL] Found persona field:', personaField);
              persona = personaField.value;
            }
          }

          // Construct name from available fields with better fallbacks
          let contactName = fullContact.name;
          if (!contactName || contactName.trim() === '') {
            const firstName = fullContact.firstName || '';
            const lastName = fullContact.lastName || '';
            contactName = `${firstName} ${lastName}`.trim();
          }
          // Final fallback to email or "Unknown Contact"
          if (!contactName || contactName.trim() === '') {
            contactName = fullContact.email || `Contact ${fullContact.id.slice(0, 8)}`;
          }

          contacts.push({
            id: fullContact.id,
            name: contactName,
            firstName: fullContact.firstName,
            lastName: fullContact.lastName,
            email: fullContact.email,
            phone: fullContact.phone,
            persona,
          });
        } catch (err) {
          console.warn(`[GHL] Could not fetch full contact ${basicContact.id}:`, err);
          // Fallback to basic contact data with same name logic
          let fallbackName = basicContact.name;
          if (!fallbackName || fallbackName.trim() === '') {
            const firstName = basicContact.firstName || '';
            const lastName = basicContact.lastName || '';
            fallbackName = `${firstName} ${lastName}`.trim();
          }
          if (!fallbackName || fallbackName.trim() === '') {
            fallbackName = basicContact.email || `Contact ${basicContact.id.slice(0, 8)}`;
          }

          contacts.push({
            id: basicContact.id,
            name: fallbackName,
            firstName: basicContact.firstName,
            lastName: basicContact.lastName,
            email: basicContact.email,
            phone: basicContact.phone,
          });
        }
      }

      console.log('[GHL] Returning contacts:', contacts.length);
      return contacts;
    } catch (err) {
      console.error('[GHL] Error fetching contacts for business:', err);
      return [];
    }
  }
}

// Factory function to create GHL service from settings
export function createGHLService(
  apiKey: string | undefined,
  locationId: string | undefined
): GHLService | null {
  if (!apiKey || !locationId) {
    return null;
  }
  return new GHLService(apiKey, locationId);
}
