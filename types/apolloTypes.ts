// ============================================
// APOLLO.IO API TYPES
// ============================================

// ===== Common =====

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

// ===== People Types =====

export interface ApolloEmploymentHistory {
  current: boolean;
  title: string;
  organization_name: string;
  start_date?: string;
  end_date?: string;
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  headline?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  photo_url?: string;
  city?: string;
  state?: string;
  country?: string;
  seniority?: string;
  departments?: string[];
  employment_history?: ApolloEmploymentHistory[];
  organization_id?: string;
  organization?: ApolloOrganization;
}

export interface ApolloPeopleSearchFilters {
  q_keywords?: string;
  person_titles?: string[];
  person_seniorities?: string[];
  person_departments?: string[];
  q_organization_domains?: string[];
  organization_ids?: string[];
  organization_industry_tag_ids?: string[];
  person_locations?: string[];
  contact_email_status?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloPeopleSearchResponse {
  people: ApolloPerson[];
  pagination: ApolloPagination;
}

// ===== Organization Types =====

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  phone?: string;
  founded_year?: number;
  industry?: string;
  keywords?: string[];
  estimated_num_employees?: number;
  annual_revenue?: number;
  annual_revenue_printed?: string;
  city?: string;
  state?: string;
  country?: string;
  short_description?: string;
  logo_url?: string;
  primary_domain?: string;
  seo_description?: string;
  publicly_traded_symbol?: string;
  publicly_traded_exchange?: string;
}

export interface ApolloOrganizationSearchFilters {
  q_organization_keyword_tags?: string[];
  q_organization_name?: string;
  organization_domains?: string[];
  organization_industry_tag_ids?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_revenue_ranges?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloOrganizationSearchResponse {
  organizations: ApolloOrganization[];
  pagination: ApolloPagination;
}

// ===== Health Check =====

export interface ApolloHealthResponse {
  is_logged_in: boolean;
}

// ===== Import Types =====

export type ApolloImportType = 'companies' | 'contacts' | 'both';
export type ApolloImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type ApolloImportRecordStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface ApolloImportJob {
  id: string;
  organization_id: string;
  user_id?: string;
  import_type: ApolloImportType;
  status: ApolloImportStatus;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  error_log: Array<{ record_id: string; error: string }>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ApolloImportRecord {
  id: string;
  import_id: string;
  apollo_id: string;
  record_type: 'company' | 'contact';
  apollo_data: ApolloOrganization | ApolloPerson;
  ghl_id?: string;
  ghl_business_id?: string;
  status: ApolloImportRecordStatus;
  error_message?: string;
  created_at: string;
}
