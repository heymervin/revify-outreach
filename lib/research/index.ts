/**
 * Research Module Exports
 * Tiered research system: Quick, Standard, Deep
 */

// V3.2 Deep Research Engine
export { executeResearchV3_2 } from './researchServiceV3_2';

// Tavily Service
export {
  scrapeWebsite,
  searchBusinessDatabases,
  searchTavily,
  batchSearchTavily,
  formatTavilyResultsForPrompt,
  scoreSourceCredibility,
  extractPublicationDate,
} from './tavilyService';

// Re-export types
export type {
  TavilySearchResult,
  TavilyResponse,
  EnhancedTavilyResult,
  BatchSearchResult,
} from './tavilyService';
