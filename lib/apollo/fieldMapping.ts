import type { ApolloOrganization, ApolloPerson } from '@/types/apolloTypes';

/**
 * Maps Apollo Organization data to GHL Business payload
 * Uses only fields accepted by POST /businesses/
 */
export function mapApolloOrgToGHLBusiness(org: ApolloOrganization): Record<string, string> {
  const biz: Record<string, string> = {};

  if (org.name) biz.name = org.name;
  if (org.website_url) biz.website = org.website_url;
  if (org.phone) biz.phone = org.phone;
  if (org.city) biz.city = org.city;
  if (org.state) biz.state = org.state;
  if (org.country) biz.country = org.country;

  // Build description with extra Apollo data
  const descParts: string[] = [];
  if (org.short_description) descParts.push(org.short_description);
  if (org.industry) descParts.push(`Industry: ${org.industry}`);
  if (org.estimated_num_employees) descParts.push(`Employees: ${org.estimated_num_employees}`);
  if (org.annual_revenue_printed) descParts.push(`Revenue: ${org.annual_revenue_printed}`);
  if (org.linkedin_url) descParts.push(`LinkedIn: ${org.linkedin_url}`);
  if (org.primary_domain) descParts.push(`Domain: ${org.primary_domain}`);
  if (descParts.length > 0) biz.description = descParts.join(' | ');

  return biz;
}

/**
 * Maps Apollo Person data to GHL Contact payload
 */
export function mapApolloPersonToGHLContact(
  person: ApolloPerson,
  locationId: string
): Record<string, unknown> {
  const contact: Record<string, unknown> = {
    locationId,
  };

  if (person.first_name) contact.firstName = person.first_name;
  if (person.last_name) contact.lastName = person.last_name;
  if (person.email) contact.email = person.email;
  if (person.organization?.name) contact.companyName = person.organization.name;

  // Custom fields - GHL V2 API requires array format: [{ key, field_value }]
  const customFields: Array<{ key: string; field_value: string }> = [];
  if (person.title) customFields.push({ key: 'contact.title', field_value: person.title });
  if (person.seniority) customFields.push({ key: 'contact.seniority', field_value: person.seniority });
  if (person.departments?.length) customFields.push({ key: 'contact.department', field_value: person.departments[0] });

  if (customFields.length > 0) {
    contact.customFields = customFields;
  }

  contact.source = 'apollo';
  contact.tags = ['apollo-import'];

  // Store LinkedIn URL in website field (closest native GHL field)
  if (person.linkedin_url) contact.website = person.linkedin_url;

  return contact;
}
