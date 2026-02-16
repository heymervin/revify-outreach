'use client';

/**
 * GHL Company Sync Hook
 * Simple version - just checks if GHL is configured via the companies API
 */

import { useState, useEffect, useRef } from 'react';

interface UseGHLCompanySyncReturn {
  isSyncing: boolean;
  isLoading: boolean;
  lastSyncedAt: Date | null;
  companiesCount: number;
  isConfigured: boolean;
  isStale: boolean;
  hasCache: boolean;
  error: string | null;
  syncJob: null;
  syncProgress: number;
  triggerSync: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useGHLCompanySync(): UseGHLCompanySyncReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedRef = useRef(false);

  // Check if GHL is configured by trying to fetch companies
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkConfig = async () => {
      try {
        // Just check if the API returns an error about configuration
        const response = await fetch('/api/ghl/companies?limit=1');
        const data = await response.json();

        if (response.ok) {
          setIsConfigured(true);
        } else if (data.error?.includes('not configured') || data.error?.includes('API key')) {
          setIsConfigured(false);
        } else {
          // Other errors - assume configured but has issues
          setIsConfigured(true);
          setError(data.error);
        }
      } catch (err) {
        console.error('[GHL Sync Hook] Config check error:', err);
        setError('Failed to check GHL configuration');
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  return {
    isSyncing: false,
    isLoading,
    lastSyncedAt: null,
    companiesCount: 0,
    isConfigured,
    isStale: false,
    hasCache: false,
    error,
    syncJob: null,
    syncProgress: 0,
    triggerSync: async () => {},
    refreshStatus: async () => {},
  };
}
