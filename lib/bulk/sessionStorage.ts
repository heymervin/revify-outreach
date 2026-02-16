/**
 * Bulk Research Session Storage Utilities
 *
 * Provides localStorage-based persistence for bulk research sessions.
 * Allows users to recover their work if they accidentally close the browser.
 */

import {
  BulkSessionState,
  BulkFilterConfig,
  BULK_SESSION_EXPIRY_MS,
} from '@/types/bulkResearchTypes';

const STORAGE_KEY = 'revify_bulk_research_session';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique tab ID for multi-tab tracking
 */
export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new empty session state
 * @param tabId - Unique tab identifier for multi-tab tracking
 * @param ghlAccountId - Active GHL account ID to pin to this session
 */
export function createEmptySessionState(tabId: string, ghlAccountId?: string): BulkSessionState {
  const now = Date.now();
  return {
    sessionId: generateSessionId(),
    createdAt: now,
    lastUpdatedAt: now,
    tabId,
    ghlAccountId,
    currentStep: 1,
    researchType: 'standard',
    importSource: null,
    companies: [],
    filters: {},
    processedCompanyIds: [],
    tokenUsage: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCost: 0,
    },
  };
}

/**
 * Save bulk session state to localStorage
 * Returns true if successful, false otherwise
 */
export function saveBulkSession(state: BulkSessionState): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Update the lastUpdatedAt timestamp
    const stateToSave: BulkSessionState = {
      ...state,
      lastUpdatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    // localStorage might be full or disabled
    console.warn('Failed to save bulk session:', error);
    return false;
  }
}

/**
 * Load bulk session state from localStorage
 * Returns null if no valid session exists or session has expired
 */
export function loadBulkSession(): BulkSessionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: BulkSessionState = JSON.parse(stored);

    // Check if session has expired
    if (isSessionExpired(state)) {
      clearBulkSession();
      return null;
    }

    // Validate basic structure
    if (!state.sessionId || !state.createdAt || !Array.isArray(state.companies)) {
      clearBulkSession();
      return null;
    }

    return state;
  } catch (error) {
    console.warn('Failed to load bulk session:', error);
    clearBulkSession();
    return null;
  }
}

/**
 * Clear the saved bulk session from localStorage
 */
export function clearBulkSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear bulk session:', error);
  }
}

/**
 * Check if a restored session was started with a different GHL account.
 * Returns true if there's a mismatch (session should be discarded or user warned).
 */
export function isAccountMismatch(
  session: BulkSessionState,
  currentGhlAccountId: string | undefined
): boolean {
  if (!session.ghlAccountId || !currentGhlAccountId) return false;
  return session.ghlAccountId !== currentGhlAccountId;
}

/**
 * Check if a session has expired (older than 24 hours)
 */
export function isSessionExpired(state: BulkSessionState): boolean {
  const now = Date.now();
  const sessionAge = now - state.lastUpdatedAt;
  return sessionAge > BULK_SESSION_EXPIRY_MS;
}

/**
 * Get session age in a human-readable format
 */
export function getSessionAge(state: BulkSessionState): string {
  const now = Date.now();
  const ageMs = now - state.lastUpdatedAt;

  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'just now';
}

/**
 * Get session summary for restore dialog
 */
export function getSessionSummary(state: BulkSessionState): {
  totalCompanies: number;
  selectedCompanies: number;
  completedCompanies: number;
  failedCompanies: number;
  pendingCompanies: number;
  lastUpdated: string;
  currentStep: number;
  researchType: string;
  tokenUsage?: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEstimatedCost: number;
  };
} {
  const selected = state.companies.filter((c) => c.selected);
  const completed = state.companies.filter((c) => c.status === 'completed');
  const failed = state.companies.filter((c) => c.status === 'failed');
  const pending = state.companies.filter(
    (c) => c.selected && c.status === 'pending'
  );

  return {
    totalCompanies: state.companies.length,
    selectedCompanies: selected.length,
    completedCompanies: completed.length,
    failedCompanies: failed.length,
    pendingCompanies: pending.length,
    lastUpdated: getSessionAge(state),
    currentStep: state.currentStep,
    researchType: state.researchType,
    tokenUsage: state.tokenUsage,
  };
}

/**
 * Check if there are meaningful changes worth saving
 * Helps avoid unnecessary saves
 */
export function hasSignificantChanges(
  current: BulkSessionState | null,
  previous: BulkSessionState | null
): boolean {
  if (!current) return false;
  if (!previous) return current.companies.length > 0;

  // Check for step changes
  if (current.currentStep !== previous.currentStep) return true;

  // Check for research type changes
  if (current.researchType !== previous.researchType) return true;

  // Check for import source changes
  if (current.importSource !== previous.importSource) return true;

  // Check for company count changes
  if (current.companies.length !== previous.companies.length) return true;

  // Check for selection changes
  const currentSelected = current.companies.filter((c) => c.selected).length;
  const previousSelected = previous.companies.filter((c) => c.selected).length;
  if (currentSelected !== previousSelected) return true;

  // Check for status changes (processing progress)
  const currentProcessed = current.processedCompanyIds.length;
  const previousProcessed = previous.processedCompanyIds.length;
  if (currentProcessed !== previousProcessed) return true;

  // Check for filter changes
  if (JSON.stringify(current.filters) !== JSON.stringify(previous.filters)) {
    return true;
  }

  // Check for token usage changes
  if (current.tokenUsage && previous.tokenUsage) {
    if (current.tokenUsage.totalInputTokens !== previous.tokenUsage.totalInputTokens) {
      return true;
    }
    if (current.tokenUsage.totalOutputTokens !== previous.tokenUsage.totalOutputTokens) {
      return true;
    }
  }

  return false;
}
