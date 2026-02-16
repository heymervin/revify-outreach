/**
 * Persona Mapping Utility
 * Maps GHL contact personas to internal persona IDs with fuzzy matching
 */

const PERSONA_ALIASES: Record<string, string[]> = {
  cfo_finance: [
    'cfo',
    'chief financial officer',
    'finance director',
    'vp finance',
    'vp of finance',
    'finance',
    'controller',
    'financial controller',
    'head of finance',
    'finance manager',
    'treasurer',
    'financial',
  ],
  ceo_gm: [
    'ceo',
    'chief executive officer',
    'general manager',
    'gm',
    'president',
    'founder',
    'co-founder',
    'owner',
    'managing director',
    'md',
    'principal',
    'executive director',
  ],
  pricing_rgm: [
    'pricing',
    'rgm',
    'revenue growth',
    'pricing manager',
    'pricing director',
    'revenue management',
    'pricing analyst',
    'head of pricing',
    'vp pricing',
    'revenue growth manager',
    'pricing strategy',
  ],
  sales_commercial: [
    'sales',
    'commercial',
    'vp sales',
    'vp of sales',
    'sales director',
    'head of sales',
    'cro',
    'chief revenue officer',
    'sales manager',
    'commercial director',
    'business development',
    'bd',
    'account executive',
  ],
  technology_analytics: [
    'technology',
    'tech',
    'analytics',
    'cto',
    'cio',
    'it director',
    'data',
    'chief technology officer',
    'chief information officer',
    'head of technology',
    'vp technology',
    'vp engineering',
    'data analytics',
    'data science',
    'it manager',
  ],
};

const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  cfo_finance: 'CFO / Finance',
  ceo_gm: 'CEO / GM',
  pricing_rgm: 'Pricing / RGM',
  sales_commercial: 'Sales / Commercial',
  technology_analytics: 'Technology / Analytics',
};

/**
 * Maps a GHL persona string to an internal persona ID
 * Uses fuzzy matching against known aliases
 * @param ghlPersona - The persona string from GHL contact
 * @returns The internal persona ID or null if no match found
 */
export function mapGhlPersonaToInternal(ghlPersona: string | null | undefined): string | null {
  if (!ghlPersona) return null;

  const normalized = ghlPersona.toLowerCase().trim();

  // Direct match check first
  if (PERSONA_ALIASES[normalized]) {
    return normalized;
  }

  // Check each persona's aliases
  for (const [personaId, aliases] of Object.entries(PERSONA_ALIASES)) {
    // Check if any alias is contained in or contains the input
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return personaId;
      }
    }
  }

  // Fallback: check if the persona string contains key identifiers
  const keywordMatches: Record<string, string> = {
    finance: 'cfo_finance',
    financial: 'cfo_finance',
    cfo: 'cfo_finance',
    ceo: 'ceo_gm',
    general: 'ceo_gm',
    owner: 'ceo_gm',
    founder: 'ceo_gm',
    president: 'ceo_gm',
    pricing: 'pricing_rgm',
    revenue: 'pricing_rgm',
    sales: 'sales_commercial',
    commercial: 'sales_commercial',
    technology: 'technology_analytics',
    tech: 'technology_analytics',
    analytics: 'technology_analytics',
    data: 'technology_analytics',
    it: 'technology_analytics',
  };

  for (const [keyword, personaId] of Object.entries(keywordMatches)) {
    if (normalized.includes(keyword)) {
      return personaId;
    }
  }

  return null;
}

/**
 * Gets the display name for a persona ID
 * @param personaId - The internal persona ID
 * @returns The display name or the ID itself if not found
 */
export function getPersonaDisplayName(personaId: string): string {
  return PERSONA_DISPLAY_NAMES[personaId] || personaId;
}

/**
 * Gets all valid persona IDs
 */
export function getValidPersonaIds(): string[] {
  return Object.keys(PERSONA_ALIASES);
}

/**
 * Checks if a persona ID is valid
 */
export function isValidPersonaId(personaId: string): boolean {
  return personaId in PERSONA_ALIASES;
}

export { PERSONA_ALIASES, PERSONA_DISPLAY_NAMES };
