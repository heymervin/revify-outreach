'use client';

/**
 * Bulk Session Persistence Hook
 *
 * Handles auto-saving session state to localStorage and restoring on page load.
 * Reconciles localStorage state with database results for completed research.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BulkSessionState,
  BulkSessionCompany,
  BulkFilterConfig,
} from '@/types/bulkResearchTypes';
import { ResearchOutputV3 } from '@/types/researchTypesV3';
import {
  saveBulkSession,
  loadBulkSession,
  clearBulkSession,
  createEmptySessionState,
  generateTabId,
  getSessionSummary,
  hasSignificantChanges,
} from '@/lib/bulk/sessionStorage';

// Types for the company with result (used in the page component)
export interface CompanyWithResult extends BulkSessionCompany {
  result?: ResearchOutputV3;
  error?: string;
}

export interface SessionSummary {
  totalCompanies: number;
  selectedCompanies: number;
  completedCompanies: number;
  failedCompanies: number;
  pendingCompanies: number;
  lastUpdated: string;
  currentStep: number;
  researchType: string;
}

export interface UseBulkSessionPersistenceOptions {
  onSessionRestored?: (state: BulkSessionState) => void;
}

export interface UseBulkSessionPersistenceReturn {
  // State
  hasSavedSession: boolean;
  savedSessionSummary: SessionSummary | null;
  savedSessionState: BulkSessionState | null;
  isRestoring: boolean;
  tabId: string;

  // Actions
  restoreSession: () => Promise<CompanyWithResult[]>;
  discardSession: () => void;
  saveCurrentState: (state: Partial<BulkSessionState>) => void;

  // Helpers
  buildSessionState: (params: {
    currentStep: 1 | 2 | 3;
    researchType: 'quick' | 'standard' | 'deep';
    importSource: 'ghl' | 'csv' | null;
    companies: CompanyWithResult[];
    filters: BulkFilterConfig;
  }) => BulkSessionState;
}

const DEBOUNCE_DELAY = 2000; // 2 seconds

export function useBulkSessionPersistence(
  supabase: any,
  options: UseBulkSessionPersistenceOptions = {}
): UseBulkSessionPersistenceReturn {
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedSession, setSavedSession] = useState<BulkSessionState | null>(null);
  const [savedSessionSummary, setSavedSessionSummary] = useState<SessionSummary | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeGhlAccountId, setActiveGhlAccountId] = useState<string | undefined>(undefined);

  // Tab ID for this instance
  const tabIdRef = useRef<string>(generateTabId());

  // Track current session state for debounced saving
  const currentStateRef = useRef<BulkSessionState | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<BulkSessionState | null>(null);

  // Fetch active GHL account on mount
  useEffect(() => {
    const fetchActiveAccount = async () => {
      try {
        const res = await fetch('/api/ghl/accounts');
        if (!res.ok) return;
        const data = await res.json();
        const accounts = data.accounts || [];
        if (!accounts.length) return;

        const selected = data.selected_account_id
          ? accounts.find((a: { id: string }) => a.id === data.selected_account_id)
          : null;
        const primary = accounts.find((a: { is_primary: boolean }) => a.is_primary);
        const active = selected || primary || accounts[0];
        setActiveGhlAccountId(active?.id);
      } catch {
        // Silent fail
      }
    };

    fetchActiveAccount();
  }, []);

  // Check for saved session on mount
  useEffect(() => {
    // Wait for active account to be fetched before loading session
    if (activeGhlAccountId === undefined) return;

    const session = loadBulkSession(activeGhlAccountId);
    if (session && session.companies.length > 0) {
      // Check if this is a different tab's active session
      // If the session was updated recently (within 30 seconds) by another tab, don't show restore
      const isActiveInOtherTab =
        session.tabId !== tabIdRef.current &&
        Date.now() - session.lastUpdatedAt < 30000;

      if (!isActiveInOtherTab) {
        setSavedSession(session);
        setSavedSessionSummary(getSessionSummary(session));
        setHasSavedSession(true);
      }
    }
  }, [activeGhlAccountId]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentStateRef.current && currentStateRef.current.companies.length > 0) {
        // Synchronous save on unload
        saveBulkSession(currentStateRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Build session state from current page state
  const buildSessionState = useCallback(
    (params: {
      currentStep: 1 | 2 | 3;
      researchType: 'quick' | 'standard' | 'deep';
      importSource: 'ghl' | 'csv' | null;
      companies: CompanyWithResult[];
      filters: BulkFilterConfig;
    }): BulkSessionState => {
      const { currentStep, researchType, importSource, companies, filters } = params;

      // Strip results from companies (too large for localStorage)
      // Normalize company names to ensure consistency with database matching
      const companiesForStorage: BulkSessionCompany[] = companies.map((c) => ({
        id: c.id,
        name: c.name.trim(), // Normalize whitespace
        website: c.website,
        industry: c.industry,
        score: c.score,
        selected: c.selected,
        status: c.status,
      }));

      // Track processed company IDs
      const processedCompanyIds = companies
        .filter((c) => c.status === 'completed' || c.status === 'failed')
        .map((c) => c.id);

      const existingSession = currentStateRef.current;

      return {
        sessionId: existingSession?.sessionId || `bulk_${Date.now()}`,
        createdAt: existingSession?.createdAt || Date.now(),
        lastUpdatedAt: Date.now(),
        tabId: tabIdRef.current,
        ghlAccountId: activeGhlAccountId,
        currentStep,
        researchType,
        importSource,
        companies: companiesForStorage,
        filters,
        processedCompanyIds,
      };
    },
    [activeGhlAccountId]
  );

  // Debounced save function
  const saveCurrentState = useCallback(
    (partialState: Partial<BulkSessionState>) => {
      // Build full state
      const newState: BulkSessionState = {
        ...(currentStateRef.current || createEmptySessionState(tabIdRef.current)),
        ...partialState,
        tabId: tabIdRef.current,
        lastUpdatedAt: Date.now(),
      };

      currentStateRef.current = newState;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Check if there are significant changes worth saving
      if (!hasSignificantChanges(newState, lastSavedStateRef.current)) {
        return;
      }

      // Debounced save
      saveTimeoutRef.current = setTimeout(() => {
        if (currentStateRef.current && currentStateRef.current.companies.length > 0) {
          const saved = saveBulkSession(currentStateRef.current);
          if (saved) {
            lastSavedStateRef.current = { ...currentStateRef.current };
          }
        }
      }, DEBOUNCE_DELAY);
    },
    []
  );

  // Restore session and reconcile with database
  const restoreSession = useCallback(async (): Promise<CompanyWithResult[]> => {
    if (!savedSession) return [];

    setIsRestoring(true);

    try {
      // Get the company names that were completed in the saved session
      // Normalize: lowercase and trim whitespace
      const completedCompanyNames = savedSession.companies
        .filter((c) => c.status === 'completed')
        .map((c) => c.name.toLowerCase().trim());

      // Query database for research results for these companies
      // Look for results created within the session timeframe
      let resultsMap: Record<string, ResearchOutputV3> = {};

      if (completedCompanyNames.length > 0 && supabase) {
        // Verify authentication before querying
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('[Session Restore] Not authenticated, cannot fetch results from database');
          // Continue without results - companies will be reset to pending
        } else {
          const { data: dbResults, error } = await supabase
            .from('research_sessions')
            .select('company_name, research_output, created_at')
            .gte('created_at', new Date(savedSession.createdAt - 60000).toISOString()) // 1 min buffer
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[Session Restore] Failed to fetch results from database:', error);
          } else if (dbResults) {
            console.log(`[Session Restore] Found ${dbResults.length} results in database`);

            // Map results by normalized company name
            for (const result of dbResults) {
              // Normalize: lowercase and trim whitespace
              const normalizedName = result.company_name?.toLowerCase().trim();
              if (
                normalizedName &&
                completedCompanyNames.some(name => name === normalizedName) &&
                result.research_output
              ) {
                // Only keep the most recent result per company
                if (!resultsMap[normalizedName]) {
                  resultsMap[normalizedName] = result.research_output;
                }
              }
            }

            console.log(`[Session Restore] Matched ${Object.keys(resultsMap).length} of ${completedCompanyNames.length} completed companies`);
          }
        }
      }

      // Rebuild companies with results
      const restoredCompanies: CompanyWithResult[] = savedSession.companies.map((company) => {
        // Normalize name the same way as DB results
        const normalizedName = company.name.toLowerCase().trim();
        const dbResult = resultsMap[normalizedName];

        // If we have a DB result, mark as completed with the result
        if (dbResult) {
          return {
            ...company,
            status: 'completed' as const,
            result: dbResult,
          };
        }

        // If it was marked as completed but no DB result, reset to pending
        if (company.status === 'completed') {
          return {
            ...company,
            status: 'pending' as const,
          };
        }

        // If it was processing, reset to pending
        if (company.status === 'processing') {
          return {
            ...company,
            status: 'pending' as const,
          };
        }

        return company;
      });

      // Log unmatched companies for debugging
      const unrestored = restoredCompanies.filter(
        c => c.status === 'pending' && savedSession.companies.find(sc => sc.id === c.id)?.status === 'completed'
      );
      if (unrestored.length > 0) {
        console.warn(`[Session Restore] ${unrestored.length} companies marked as completed but results not found:`,
          unrestored.map(c => c.name));
      }

      // Update the session state
      currentStateRef.current = {
        ...savedSession,
        tabId: tabIdRef.current,
        lastUpdatedAt: Date.now(),
      };
      lastSavedStateRef.current = { ...currentStateRef.current };

      // Clear the "has saved session" state since we've restored
      setHasSavedSession(false);
      setSavedSession(null);
      setSavedSessionSummary(null);

      // Call the onSessionRestored callback if provided
      if (options.onSessionRestored) {
        options.onSessionRestored(savedSession);
      }

      return restoredCompanies;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return [];
    } finally {
      setIsRestoring(false);
    }
  }, [savedSession, supabase, options]);

  // Discard saved session
  const discardSession = useCallback(() => {
    clearBulkSession();
    setHasSavedSession(false);
    setSavedSession(null);
    setSavedSessionSummary(null);
    currentStateRef.current = null;
    lastSavedStateRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Final save on unmount if there's state to save
      if (currentStateRef.current && currentStateRef.current.companies.length > 0) {
        saveBulkSession(currentStateRef.current);
      }
    };
  }, []);

  return {
    hasSavedSession,
    savedSessionSummary,
    savedSessionState: savedSession,
    isRestoring,
    tabId: tabIdRef.current,
    restoreSession,
    discardSession,
    saveCurrentState,
    buildSessionState,
  };
}
