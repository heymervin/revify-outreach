import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import {
  SettingsState,
  APIKeysConfig,
  ModelSelectionConfig,
  PromptTemplate,
  TavilyConfig,
  GHLConfig,
  DEFAULT_SETTINGS,
  UsageRecord,
  UsageStats,
  TokenUsage,
  AIProvider,
  TOKEN_COSTS
} from '../types';

const DEFAULT_RESEARCH_PROMPT = `<role>
You are a senior Revenue Growth Analytics research analyst preparing intelligence
briefs for B2B sales outreach. You specialize in identifying pricing inefficiencies,
margin optimization opportunities, and commercial analytics gaps in mid-market
companies across Manufacturing, Retail, CPG, and Distribution industries.
</role>

<context>
You are researching companies on behalf of Revology Analytics, a Revenue Growth
Analytics consultancy that helps mid-market companies with:
- Margin Analytics & Optimization (pricing strategy, profit pool analysis)
- Sales Growth Analytics (sales productivity, customer analytics)
- Promotion Effectiveness & Optimization (trade spend ROI, promo planning)
- Commercial Analytics Transformation (dashboards, AI/ML enablement)

Revology delivers results in 60-120 day engagements using their Outcome-Based
Analytics framework, transferring sustainable capabilities to clients.
</context>

<task>
Synthesize the research data below into a structured intelligence brief
that will enable personalized, insight-led outreach emails.

TARGET COMPANY:
- Company Name: {{company}}
- Industry: {{industry}}
- Website: {{website}}

If any input is marked as "Not provided", use available inputs to research
and infer the missing information.
</task>

{{research_data}}

<search_queries_used>
{{search_queries}}
</search_queries_used>

<research_instructions>
1. COMPANY PROFILE (extract from research data above)
   - Confirm/determine industry vertical and sub-segment
   - Estimate company size (revenue range, employee count) - cite source if found
   - Identify business model (B2B, B2C, hybrid, distribution model)
   - Note geographic footprint and market position

2. RECENT SIGNALS (extract from research data above)
   For each signal you include:
   - signal_type: One of 'financial', 'strategic', 'pricing', 'leadership', 'technology', 'industry'
   - description: Specific, detailed description of the signal
   - source: Name of the source publication/site
   - source_url: MUST include the URL from the research data (not just domain)
   - date: Use the specific date from the research data (e.g., "February 2025", not just "2025")
   - date_precision: 'exact' if full date, 'month' if month/year, 'quarter' if Q1/Q2/etc, 'year' if only year
   - credibility_score: Use the credibility percentage from the research data (convert to 0-1 scale)
   - relevance_to_revology: How this signal relates to pricing/analytics opportunities

   IMPORTANT: Only include signals from the last 12 months. Reject anything older.

3. PAIN POINT HYPOTHESIS
   Based on signals and industry context, hypothesize 2-3 specific pricing
   or margin challenges the company likely faces. Each hypothesis must
   reference at least one specific signal as evidence.

4. PERSONA-SPECIFIC ANGLES
   For each target persona, identify the specific hook that would resonate:
   - CFO/Finance: Financial metrics, margin pressure, ROI focus
   - Pricing/RGM Lead: Pricing complexity, competitive dynamics, analytics gaps
   - Sales/Commercial Leader: Sales productivity, customer profitability, quota
   - CEO/GM: Strategic growth, competitive positioning, transformation
   - Technology/Analytics: Data infrastructure, AI/ML capabilities, integration

5. RESEARCH CONFIDENCE
   - overall_score (1-5): Based on data completeness and source quality
   - gaps: List specific information that could not be found
   - financial_confidence (0-1): Confidence in financial data (high if revenue/size found)
   - signal_freshness (0-1): How recent the signals are (1 = all within 3 months)
   - source_quality (0-1): Average credibility of sources used
   - search_coverage (0-1): How comprehensively topics were covered
</research_instructions>

<quality_standards>
- Every signal MUST have a source_url (not just domain name) from the research data
- Signal dates MUST be specific (month/year minimum) - no "2023" or "recent"
- If revenue/employee data found, cite the specific source
- If financial data not found, explicitly state "Not available from public sources"
- Hypotheses must be actionable (something Revology can help with)
- Persona hooks must be distinct (don't repeat the same angle)
- Confidence scores must accurately reflect actual data quality
</quality_standards>`;

const DEFAULT_EMAIL_PROMPT = `You are an expert SDR. Write a cold email to the {{persona}} of {{company}}.

Context:
{{brief}}

Key Pain Points:
{{hypotheses}}

Persona-Specific Angle:
- Primary Hook: {{primary_hook}}
- Supporting Point: {{supporting_point}}
- Question to Consider: {{question_to_pose}}

Timing Context: {{timing_notes}}

Requirements:
- Subject line should be catchy but professional.
- Body under 150 words.
- Focus on the persona-specific hook and supporting point.
- Include the question naturally in the email.
- Tone: Professional, slightly informal, persuasive.`;

interface SettingsContextType extends SettingsState {
  updateApiKey: (provider: keyof APIKeysConfig, key: string) => void;
  clearApiKey: (provider: keyof APIKeysConfig) => void;
  hasValidApiKey: (provider: keyof APIKeysConfig) => boolean;
  updateModelSelection: (config: Partial<ModelSelectionConfig>) => void;
  addPromptTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  deletePromptTemplate: (id: string) => void;
  getActiveTemplate: (type: 'research' | 'email') => PromptTemplate | undefined;
  setDefaultTemplate: (id: string) => void;
  updateTavilyConfig: (config: Partial<TavilyConfig>) => void;
  updateGHLConfig: (config: Partial<GHLConfig>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  // Usage tracking
  usageRecords: UsageRecord[];
  addUsageRecord: (record: Omit<UsageRecord, 'id' | 'timestamp' | 'estimatedCost'>) => void;
  getUsageStats: () => UsageStats;
  clearUsageHistory: () => void;
}

const STORAGE_KEY = 'revify_settings';
const USAGE_STORAGE_KEY = 'revify_usage';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function initializeDefaults(): SettingsState {
  return {
    ...DEFAULT_SETTINGS,
    promptTemplates: [
      {
        id: 'default-research',
        name: 'Default Research Prompt',
        type: 'research',
        content: DEFAULT_RESEARCH_PROMPT,
        variables: ['company', 'industry', 'website', 'research_data', 'search_queries'],
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'default-email',
        name: 'Default Email Prompt',
        type: 'email',
        content: DEFAULT_EMAIL_PROMPT,
        variables: ['persona', 'company', 'brief', 'hypotheses'],
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    lastUpdated: Date.now(),
  };
}

function calculateCost(provider: AIProvider, usage: TokenUsage): number {
  const costs = TOKEN_COSTS[provider];
  const inputCost = (usage.inputTokens / 1_000_000) * costs.input;
  const outputCost = (usage.outputTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const defaults = initializeDefaults();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.promptTemplates && parsed.promptTemplates.length > 0) {
          // Merge with defaults to handle new properties
          return {
            ...defaults,
            ...parsed,
            ghl: { ...defaults.ghl, ...parsed.ghl },
            tavily: { ...defaults.tavily, ...parsed.tavily },
          };
        }
      } catch {
        // Fall through to defaults
      }
    }
    return defaults;
  });

  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>(() => {
    const saved = localStorage.getItem(USAGE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const settingsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const usageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, 500);
    return () => clearTimeout(settingsTimer.current);
  }, [settings]);

  useEffect(() => {
    clearTimeout(usageTimer.current);
    usageTimer.current = setTimeout(() => {
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageRecords));
    }, 500);
    return () => clearTimeout(usageTimer.current);
  }, [usageRecords]);

  const updateApiKey = useCallback((provider: keyof APIKeysConfig, key: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: key },
      lastUpdated: Date.now(),
    }));
  }, []);

  const clearApiKey = useCallback((provider: keyof APIKeysConfig) => {
    setSettings(prev => {
      const newApiKeys = { ...prev.apiKeys };
      delete newApiKeys[provider];
      return { ...prev, apiKeys: newApiKeys, lastUpdated: Date.now() };
    });
  }, []);

  const hasValidApiKey = useCallback((provider: keyof APIKeysConfig) => {
    return Boolean(settings.apiKeys[provider]?.trim());
  }, [settings.apiKeys]);

  const updateModelSelection = useCallback((config: Partial<ModelSelectionConfig>) => {
    setSettings(prev => ({
      ...prev,
      modelSelection: { ...prev.modelSelection, ...config },
      lastUpdated: Date.now(),
    }));
  }, []);

  const addPromptTemplate = useCallback((template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSettings(prev => ({
      ...prev,
      promptTemplates: [...prev.promptTemplates, newTemplate],
      lastUpdated: Date.now(),
    }));
  }, []);

  const updatePromptTemplate = useCallback((id: string, updates: Partial<PromptTemplate>) => {
    setSettings(prev => ({
      ...prev,
      promptTemplates: prev.promptTemplates.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
      lastUpdated: Date.now(),
    }));
  }, []);

  const deletePromptTemplate = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      promptTemplates: prev.promptTemplates.filter(t => t.id !== id),
      lastUpdated: Date.now(),
    }));
  }, []);

  const getActiveTemplate = useCallback((type: 'research' | 'email') => {
    const templates = settings.promptTemplates.filter(t => t.type === type);
    return templates.find(t => t.isDefault) || templates[0];
  }, [settings.promptTemplates]);

  const setDefaultTemplate = useCallback((id: string) => {
    setSettings(prev => {
      const template = prev.promptTemplates.find(t => t.id === id);
      if (!template) return prev;

      return {
        ...prev,
        promptTemplates: prev.promptTemplates.map(t => ({
          ...t,
          isDefault: t.type === template.type ? t.id === id : t.isDefault,
          updatedAt: t.id === id ? Date.now() : t.updatedAt,
        })),
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const updateTavilyConfig = useCallback((config: Partial<TavilyConfig>) => {
    setSettings(prev => ({
      ...prev,
      tavily: { ...prev.tavily, ...config },
      lastUpdated: Date.now(),
    }));
  }, []);

  const updateGHLConfig = useCallback((config: Partial<GHLConfig>) => {
    setSettings(prev => ({
      ...prev,
      ghl: { ...prev.ghl, ...config },
      lastUpdated: Date.now(),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const currentApiKeys = settings.apiKeys;
    setSettings({
      ...initializeDefaults(),
      apiKeys: currentApiKeys,
    });
  }, [settings.apiKeys]);

  const exportSettings = useCallback(() => {
    const exportable = {
      ...settings,
      apiKeys: {},
    };
    return JSON.stringify(exportable, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json) as Partial<SettingsState>;
      setSettings(prev => ({
        ...prev,
        ...imported,
        apiKeys: prev.apiKeys,
        lastUpdated: Date.now(),
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  // Usage tracking methods
  const addUsageRecord = useCallback((record: Omit<UsageRecord, 'id' | 'timestamp' | 'estimatedCost'>) => {
    const newRecord: UsageRecord = {
      ...record,
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      estimatedCost: calculateCost(record.provider, record.usage),
    };
    setUsageRecords(prev => [newRecord, ...prev]);
  }, []);

  const usageStats = useMemo((): UsageStats => {
    const stats: UsageStats = {
      records: usageRecords,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalEstimatedCost: 0,
    };

    for (const record of usageRecords) {
      stats.totalInputTokens += record.usage.inputTokens;
      stats.totalOutputTokens += record.usage.outputTokens;
      stats.totalTokens += record.usage.totalTokens;
      stats.totalEstimatedCost += record.estimatedCost || 0;
    }

    return stats;
  }, [usageRecords]);

  const getUsageStats = useCallback((): UsageStats => usageStats, [usageStats]);

  const clearUsageHistory = useCallback(() => {
    setUsageRecords([]);
  }, []);

  return (
    <SettingsContext.Provider value={{
      ...settings,
      updateApiKey,
      clearApiKey,
      hasValidApiKey,
      updateModelSelection,
      addPromptTemplate,
      updatePromptTemplate,
      deletePromptTemplate,
      getActiveTemplate,
      setDefaultTemplate,
      updateTavilyConfig,
      updateGHLConfig,
      resetToDefaults,
      exportSettings,
      importSettings,
      usageRecords,
      addUsageRecord,
      getUsageStats,
      clearUsageHistory,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
