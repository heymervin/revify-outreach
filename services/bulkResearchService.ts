/**
 * Bulk Research Service
 * Orchestrates research for 100-1,000 companies with filtering, progress tracking, and pause/resume
 */

import {
  BulkResearchSession,
  BulkFilterConfig,
  BulkCompanyItem,
  BulkProgressUpdate,
  BulkResearchResult,
  BulkResearchError,
  BulkSelectionStrategy,
  calculateBulkCostEstimate,
  createEmptyBulkSession,
  formatDuration,
} from '../types/bulkResearchTypes';
import { ResearchInputV3_1, ResearchOutputV3_1 } from '../types/researchTypesV3_1';
import { GHLCompanyOption, GHLService } from './ghlService';
import { executeResearchV3_2 } from './researchServiceV3_2';
import { SettingsState } from '../types';

// Storage key for bulk sessions
const BULK_SESSIONS_KEY = 'revify_bulk_sessions';

// ===== Filtering Functions =====

/**
 * Filter companies based on filter configuration
 */
export function filterCompanies(
  companies: GHLCompanyOption[],
  filters: BulkFilterConfig
): GHLCompanyOption[] {
  return companies.filter(company => {
    // Score filter
    if (filters.minScore !== undefined) {
      if (company.score === undefined || company.score < filters.minScore) {
        return false;
      }
    }
    if (filters.maxScore !== undefined) {
      if (company.score !== undefined && company.score > filters.maxScore) {
        return false;
      }
    }

    // Industry filter (match any of the specified industries)
    if (filters.industries && filters.industries.length > 0) {
      if (!company.industry) return false;
      const companyIndustry = company.industry.toLowerCase();
      const matchesIndustry = filters.industries.some(
        ind => companyIndustry.includes(ind.toLowerCase())
      );
      if (!matchesIndustry) return false;
    }

    // Website filter
    if (filters.hasWebsite === true) {
      if (!company.website || company.website.trim() === '') {
        return false;
      }
    }

    // Existing research filter
    if (filters.hasExistingResearch === true) {
      if (!company.companyResearch) {
        return false;
      }
    }
    if (filters.hasExistingResearch === false) {
      if (company.companyResearch) {
        return false;
      }
    }

    // Exclude specific companies
    if (filters.excludeCompanyIds && filters.excludeCompanyIds.length > 0) {
      if (filters.excludeCompanyIds.includes(company.id)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply selection strategy to get the final list
 */
export function applySelectionStrategy(
  companies: GHLCompanyOption[],
  strategy: BulkSelectionStrategy,
  customSelectedIds?: string[]
): GHLCompanyOption[] {
  switch (strategy) {
    case 'first_5':
      return companies.slice(0, 5);
    case 'first_10':
      return companies.slice(0, 10);
    case 'first_25':
      return companies.slice(0, 25);
    case 'first_50':
      return companies.slice(0, 50);
    case 'first_100':
      return companies.slice(0, 100);
    case 'top_10_by_score':
      return [...companies]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
    case 'top_25_by_score':
      return [...companies]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 25);
    case 'top_50_by_score':
      return [...companies]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 50);
    case 'custom':
      if (!customSelectedIds || customSelectedIds.length === 0) {
        return companies;
      }
      return companies.filter(c => customSelectedIds.includes(c.id));
    default:
      return companies;
  }
}

/**
 * Convert GHL companies to bulk company items
 */
export function toBulkCompanyItems(
  companies: GHLCompanyOption[],
  selected: boolean = true
): BulkCompanyItem[] {
  return companies.map(c => ({
    id: c.id,
    companyName: c.companyName,
    website: c.website,
    industry: c.industry,
    email: c.email,
    score: c.score,
    hasExistingResearch: !!c.companyResearch,
    selected,
  }));
}

/**
 * Get unique industries from companies
 */
export function getUniqueIndustries(companies: GHLCompanyOption[]): string[] {
  const industries = new Set<string>();
  companies.forEach(c => {
    if (c.industry) {
      industries.add(c.industry);
    }
  });
  return Array.from(industries).sort();
}

// ===== Session Management =====

/**
 * Save bulk sessions to localStorage
 */
export function saveBulkSessions(sessions: BulkResearchSession[]): void {
  try {
    localStorage.setItem(BULK_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save bulk sessions:', e);
  }
}

/**
 * Load bulk sessions from localStorage
 */
export function loadBulkSessions(): BulkResearchSession[] {
  try {
    const saved = localStorage.getItem(BULK_SESSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load bulk sessions:', e);
    return [];
  }
}

/**
 * Update a single session in storage
 */
export function updateSessionInStorage(session: BulkResearchSession): void {
  const sessions = loadBulkSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  saveBulkSessions(sessions);
}

/**
 * Delete a session from storage
 */
export function deleteSessionFromStorage(sessionId: string): void {
  const sessions = loadBulkSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveBulkSessions(filtered);
}

// ===== Bulk Research Execution =====

// Global flag to track pause requests
const pauseRequests = new Map<string, boolean>();

/**
 * Request pause for a session
 */
export function requestPause(sessionId: string): void {
  pauseRequests.set(sessionId, true);
}

/**
 * Clear pause request
 */
export function clearPauseRequest(sessionId: string): void {
  pauseRequests.delete(sessionId);
}

/**
 * Check if pause is requested
 */
function isPauseRequested(sessionId: string): boolean {
  return pauseRequests.get(sessionId) === true;
}

/**
 * Execute bulk research for a session
 */
export async function executeBulkResearch(
  session: BulkResearchSession,
  settings: SettingsState,
  ghlService: GHLService | null,
  onProgress: (update: BulkProgressUpdate) => void,
  onSessionUpdate: (session: BulkResearchSession) => void
): Promise<BulkResearchSession> {
  // Validate API keys
  const openaiKey = settings.apiKeys.openai;
  const tavilyKey = settings.apiKeys.tavily;

  if (!openaiKey) {
    throw new Error('OpenAI API key is required for bulk research');
  }
  if (!tavilyKey) {
    throw new Error('Tavily API key is required for bulk research');
  }

  // Clear any previous pause request
  clearPauseRequest(session.id);

  // Update session status
  session.status = 'researching';
  session.startedAt = session.startedAt || Date.now();
  onSessionUpdate(session);

  const startTime = Date.now();
  const selectedCompanies = session.selectedCompanies.filter(c => c.selected);
  session.totalCount = selectedCompanies.length;

  console.log(`[Bulk Research] Starting research for ${selectedCompanies.length} companies`);

  // Resume from where we left off
  const startIndex = session.currentCompanyIndex;

  for (let i = startIndex; i < selectedCompanies.length; i++) {
    // Check for pause request
    if (isPauseRequested(session.id)) {
      console.log(`[Bulk Research] Pause requested at company ${i + 1}/${selectedCompanies.length}`);
      session.status = 'paused';
      session.pausedAt = Date.now();
      session.currentCompanyIndex = i;
      session.totalElapsedMs += Date.now() - startTime;
      clearPauseRequest(session.id);
      onSessionUpdate(session);
      updateSessionInStorage(session);
      return session;
    }

    const company = selectedCompanies[i];
    const companyStartTime = Date.now();

    console.log(`[Bulk Research] Processing ${i + 1}/${selectedCompanies.length}: ${company.companyName}`);

    // Emit progress update
    const elapsedMs = session.totalElapsedMs + (Date.now() - startTime);
    const avgTimePerCompany = session.processedCount > 0
      ? elapsedMs / session.processedCount
      : 45000; // Default estimate: 45 seconds
    const remainingCompanies = selectedCompanies.length - i;
    const estimatedRemainingMs = avgTimePerCompany * remainingCompanies;

    onProgress({
      sessionId: session.id,
      currentCompanyId: company.id,
      currentCompanyName: company.companyName,
      processedCount: session.processedCount,
      totalCount: selectedCompanies.length,
      percentComplete: Math.round((session.processedCount / selectedCompanies.length) * 100),
      elapsedTimeMs: elapsedMs,
      estimatedRemainingMs,
      currentCost: session.actualCost,
      status: 'researching',
    });

    try {
      // Build research input
      const input: ResearchInputV3_1 = {
        companyName: company.companyName,
        website: company.website,
        industry: company.industry || 'Unknown',
        researchDepth: session.researchDepth,
      };

      // Execute research
      const result = await executeResearchV3_2(
        input,
        openaiKey,
        tavilyKey,
        (msg) => {
          // Update progress with research stage
          onProgress({
            sessionId: session.id,
            currentCompanyId: company.id,
            currentCompanyName: company.companyName,
            processedCount: session.processedCount,
            totalCount: selectedCompanies.length,
            percentComplete: Math.round((session.processedCount / selectedCompanies.length) * 100),
            elapsedTimeMs: session.totalElapsedMs + (Date.now() - startTime),
            estimatedRemainingMs,
            currentCost: session.actualCost,
            status: 'researching',
          });
        }
      );

      const executionTimeMs = Date.now() - companyStartTime;
      const cost = result.metadata?.estimated_cost || 0;

      // Store result
      const bulkResult: BulkResearchResult = {
        companyId: company.id,
        companyName: company.companyName,
        success: true,
        researchOutput: result,
        cost,
        executionTimeMs,
        savedToGhl: false,
        timestamp: Date.now(),
      };

      session.results[company.id] = bulkResult;
      session.actualCost += cost;
      session.successCount++;

      // Try to save to GHL if service is available
      if (ghlService) {
        try {
          onProgress({
            sessionId: session.id,
            currentCompanyId: company.id,
            currentCompanyName: company.companyName,
            processedCount: session.processedCount,
            totalCount: selectedCompanies.length,
            percentComplete: Math.round((session.processedCount / selectedCompanies.length) * 100),
            elapsedTimeMs: session.totalElapsedMs + (Date.now() - startTime),
            estimatedRemainingMs,
            currentCost: session.actualCost,
            status: 'saving_to_ghl',
          });

          await ghlService.updateBusinessResearch(
            company.id,
            JSON.stringify(result)
          );
          bulkResult.savedToGhl = true;
          session.savedToGhlCount++;
          console.log(`[Bulk Research] Saved research to GHL for ${company.companyName}`);
        } catch (ghlError) {
          console.warn(`[Bulk Research] Failed to save to GHL for ${company.companyName}:`, ghlError);
          // Don't fail the whole research, just log the error
          session.errors.push({
            companyId: company.id,
            companyName: company.companyName,
            stage: 'save_to_ghl',
            error: ghlError instanceof Error ? ghlError.message : String(ghlError),
            timestamp: Date.now(),
            retryable: true,
          });
        }
      }

      console.log(`[Bulk Research] Completed ${company.companyName} in ${executionTimeMs}ms, cost: $${cost.toFixed(2)}`);

    } catch (error) {
      console.error(`[Bulk Research] Failed for ${company.companyName}:`, error);

      const bulkError: BulkResearchError = {
        companyId: company.id,
        companyName: company.companyName,
        stage: 'research',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        retryable: true,
      };

      session.errors.push(bulkError);
      session.failureCount++;

      // Store failed result
      session.results[company.id] = {
        companyId: company.id,
        companyName: company.companyName,
        success: false,
        cost: 0,
        executionTimeMs: Date.now() - companyStartTime,
        savedToGhl: false,
        timestamp: Date.now(),
      };
    }

    // Update progress
    session.processedCount++;
    session.currentCompanyIndex = i + 1;

    // Save session periodically (every 5 companies)
    if (session.processedCount % 5 === 0) {
      updateSessionInStorage(session);
    }

    onSessionUpdate(session);
  }

  // Completed
  session.status = 'research_complete';
  session.completedAt = Date.now();
  session.totalElapsedMs += Date.now() - startTime;

  console.log(`[Bulk Research] Completed all ${selectedCompanies.length} companies`);
  console.log(`[Bulk Research] Success: ${session.successCount}, Failed: ${session.failureCount}`);
  console.log(`[Bulk Research] Total cost: $${session.actualCost.toFixed(2)}`);
  console.log(`[Bulk Research] Total time: ${formatDuration(session.totalElapsedMs)}`);

  onSessionUpdate(session);
  updateSessionInStorage(session);

  return session;
}

/**
 * Resume a paused bulk research session
 */
export async function resumeBulkResearch(
  sessionId: string,
  settings: SettingsState,
  ghlService: GHLService | null,
  onProgress: (update: BulkProgressUpdate) => void,
  onSessionUpdate: (session: BulkResearchSession) => void
): Promise<BulkResearchSession> {
  const sessions = loadBulkSessions();
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.status !== 'paused') {
    throw new Error(`Session is not paused (status: ${session.status})`);
  }

  console.log(`[Bulk Research] Resuming session from company ${session.currentCompanyIndex + 1}/${session.totalCount}`);

  return executeBulkResearch(session, settings, ghlService, onProgress, onSessionUpdate);
}

/**
 * Cancel a bulk research session
 */
export function cancelBulkResearch(sessionId: string): void {
  requestPause(sessionId);

  const sessions = loadBulkSessions();
  const session = sessions.find(s => s.id === sessionId);

  if (session) {
    session.status = 'cancelled';
    updateSessionInStorage(session);
  }
}

// ===== Cost Estimation =====

/**
 * Get estimated cost for a set of companies
 */
export function estimateBulkCost(
  companyCount: number,
  researchDepth: 'standard' | 'deep'
) {
  return calculateBulkCostEstimate(companyCount, researchDepth);
}

// ===== Exports =====

export {
  createEmptyBulkSession,
  formatDuration,
};
