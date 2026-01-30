// Bulk Research Types
// For processing 100-1,000 companies at a time

import { ResearchOutputV3_1 } from './researchTypesV3_1';
import { GeneratedEmail, GHLContactInfo } from '../types';

// ===== Selection Strategy =====

export type BulkSelectionStrategy =
  | 'first_5'
  | 'first_10'
  | 'first_25'
  | 'first_50'
  | 'first_100'
  | 'top_10_by_score'
  | 'top_25_by_score'
  | 'top_50_by_score'
  | 'custom';

// ===== Filter Configuration =====

export interface BulkFilterConfig {
  minScore?: number;           // e.g., 55+ score from GHL
  maxScore?: number;           // e.g., max 90
  industries?: string[];       // Filter by industry (multiple)
  hasWebsite?: boolean;        // Only companies with website
  hasExistingResearch?: boolean; // Only companies with saved research
  excludeCompanyIds?: string[]; // Exclude specific companies
}

// ===== Company Selection Item =====

export interface BulkCompanyItem {
  id: string;                  // GHL record ID
  companyName: string;
  website?: string;
  industry?: string;
  email?: string;
  score?: number;              // GHL score field
  hasExistingResearch: boolean;
  selected: boolean;           // User selection state
}

// ===== Progress Update =====

export interface BulkProgressUpdate {
  sessionId: string;
  currentCompanyId: string;
  currentCompanyName: string;
  processedCount: number;
  totalCount: number;
  percentComplete: number;
  elapsedTimeMs: number;
  estimatedRemainingMs: number;
  currentCost: number;
  status: 'researching' | 'saving_to_ghl' | 'generating_email';
}

// ===== Error Entry =====

export interface BulkResearchError {
  companyId: string;
  companyName: string;
  stage: 'research' | 'save_to_ghl' | 'email_generation';
  error: string;
  timestamp: number;
  retryable: boolean;
}

// ===== Research Result Entry =====

export interface BulkResearchResult {
  companyId: string;
  companyName: string;
  success: boolean;
  researchOutput?: ResearchOutputV3_1;
  cost: number;
  executionTimeMs: number;
  savedToGhl: boolean;
  timestamp: number;
}

// ===== Email Batch Entry =====

export interface BulkEmailEntry {
  companyId: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  persona: string;
  email: GeneratedEmail;
  status: 'draft' | 'reviewed' | 'sent';
  editedBody?: string;        // If user edited the draft
}

// ===== Bulk Research Session =====

export type BulkSessionStatus =
  | 'draft'                    // Initial state, configuring
  | 'ready'                    // Companies selected, ready to start
  | 'researching'              // Research in progress
  | 'paused'                   // User paused
  | 'research_complete'        // All research done
  | 'generating_emails'        // Email generation in progress
  | 'completed'                // All done
  | 'cancelled';               // User cancelled

export interface BulkResearchSession {
  id: string;
  name: string;                // User-friendly name (e.g., "January Outreach Batch")

  // Configuration
  filters: BulkFilterConfig;
  selectionStrategy: BulkSelectionStrategy;
  researchDepth: 'standard' | 'deep';

  // Selected companies (IDs and basic info for display)
  selectedCompanies: BulkCompanyItem[];

  // Progress tracking
  status: BulkSessionStatus;
  processedCount: number;
  totalCount: number;
  currentCompanyIndex: number;  // For resume functionality

  // Results - keyed by company ID
  results: Record<string, BulkResearchResult>;

  // Generated emails - keyed by company ID
  emails: Record<string, BulkEmailEntry[]>;

  // Cost tracking
  estimatedCost: number;
  actualCost: number;

  // Timing
  createdAt: number;
  startedAt?: number;
  pausedAt?: number;
  completedAt?: number;
  totalElapsedMs: number;       // Accumulated time (for pause/resume)

  // Errors
  errors: BulkResearchError[];

  // Stats (calculated)
  successCount: number;
  failureCount: number;
  savedToGhlCount: number;
}

// ===== Cost Estimation =====

export interface BulkCostEstimate {
  companyCount: number;
  researchDepth: 'standard' | 'deep';
  minCost: number;
  maxCost: number;
  avgCostPerCompany: number;
  minTimeMinutes: number;
  maxTimeMinutes: number;
  avgTimePerCompanySeconds: number;
}

// ===== Batch Email Configuration =====

export interface BulkEmailConfig {
  generateForAll: boolean;      // Generate for all successful research
  selectedCompanyIds?: string[]; // Or specific subset
  persona: string;              // Which persona to generate for
  useContactPersona: boolean;   // Use contact's persona if available
  includeContactName: boolean;  // Personalize with contact name
}

// ===== Filter Presets =====

export const BULK_FILTER_PRESETS: Record<string, BulkFilterConfig> = {
  'high_score': {
    minScore: 55,
  },
  'high_score_with_website': {
    minScore: 55,
    hasWebsite: true,
  },
  'no_research_yet': {
    hasExistingResearch: false,
  },
  'all': {},
};

// ===== Selection Strategy Labels =====

export const SELECTION_STRATEGY_LABELS: Record<BulkSelectionStrategy, string> = {
  'first_5': 'First 5 companies',
  'first_10': 'First 10 companies',
  'first_25': 'First 25 companies',
  'first_50': 'First 50 companies',
  'first_100': 'First 100 companies',
  'top_10_by_score': 'Top 10 by score',
  'top_25_by_score': 'Top 25 by score',
  'top_50_by_score': 'Top 50 by score',
  'custom': 'Custom selection',
};

// ===== Cost Constants (from V3.1) =====

export const BULK_COST_ESTIMATES = {
  // Per company estimates (standard depth)
  STANDARD_MIN_COST: 0.30,
  STANDARD_MAX_COST: 0.60,
  STANDARD_AVG_COST: 0.45,

  // Per company estimates (deep depth)
  DEEP_MIN_COST: 0.40,
  DEEP_MAX_COST: 0.70,
  DEEP_AVG_COST: 0.55,

  // Time estimates (seconds per company)
  STANDARD_MIN_TIME: 30,
  STANDARD_MAX_TIME: 60,
  STANDARD_AVG_TIME: 45,

  DEEP_MIN_TIME: 45,
  DEEP_MAX_TIME: 90,
  DEEP_AVG_TIME: 67,
};

// ===== Helper Functions =====

export function calculateBulkCostEstimate(
  companyCount: number,
  researchDepth: 'standard' | 'deep'
): BulkCostEstimate {
  const isDeep = researchDepth === 'deep';

  const minCost = companyCount * (isDeep ? BULK_COST_ESTIMATES.DEEP_MIN_COST : BULK_COST_ESTIMATES.STANDARD_MIN_COST);
  const maxCost = companyCount * (isDeep ? BULK_COST_ESTIMATES.DEEP_MAX_COST : BULK_COST_ESTIMATES.STANDARD_MAX_COST);
  const avgCostPerCompany = isDeep ? BULK_COST_ESTIMATES.DEEP_AVG_COST : BULK_COST_ESTIMATES.STANDARD_AVG_COST;

  const minTimeSeconds = companyCount * (isDeep ? BULK_COST_ESTIMATES.DEEP_MIN_TIME : BULK_COST_ESTIMATES.STANDARD_MIN_TIME);
  const maxTimeSeconds = companyCount * (isDeep ? BULK_COST_ESTIMATES.DEEP_MAX_TIME : BULK_COST_ESTIMATES.STANDARD_MAX_TIME);
  const avgTimePerCompanySeconds = isDeep ? BULK_COST_ESTIMATES.DEEP_AVG_TIME : BULK_COST_ESTIMATES.STANDARD_AVG_TIME;

  return {
    companyCount,
    researchDepth,
    minCost: Math.round(minCost * 100) / 100,
    maxCost: Math.round(maxCost * 100) / 100,
    avgCostPerCompany,
    minTimeMinutes: Math.round(minTimeSeconds / 60),
    maxTimeMinutes: Math.round(maxTimeSeconds / 60),
    avgTimePerCompanySeconds,
  };
}

export function createEmptyBulkSession(name: string): BulkResearchSession {
  return {
    id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    filters: {},
    selectionStrategy: 'custom',
    researchDepth: 'standard',
    selectedCompanies: [],
    status: 'draft',
    processedCount: 0,
    totalCount: 0,
    currentCompanyIndex: 0,
    results: {},
    emails: {},
    estimatedCost: 0,
    actualCost: 0,
    createdAt: Date.now(),
    totalElapsedMs: 0,
    errors: [],
    successCount: 0,
    failureCount: 0,
    savedToGhlCount: 0,
  };
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
