import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SettingsState,
  APIKeysConfig,
  ModelSelectionConfig,
  PromptTemplate,
  TavilyConfig,
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
Research the target company below and produce a structured intelligence brief
that will enable personalized, insight-led outreach emails.

TARGET COMPANY:
- Company Name: {{company}}
- Industry: {{industry}}
- Website: {{website}}

If any input is marked as "Not provided", use available inputs to research
and infer the missing information.
</task>

<research_instructions>
1. COMPANY PROFILE (infer if not directly provided)
   - Confirm/determine industry vertical and sub-segment
   - Estimate company size (revenue range, employee count)
   - Identify business model (B2B, B2C, hybrid, distribution model)
   - Note geographic footprint and market position

2. RECENT SIGNALS (last 6-12 months) - Search for:
   - Financial performance (earnings, revenue trends, margin pressure)
   - Strategic moves (acquisitions, divestitures, new markets, product launches)
   - Pricing-related news (price increases, competitive pressure, promotions)
   - Leadership changes (new CFO, CEO, VP Sales, or analytics hires)
   - Technology investments (ERP, analytics tools, AI initiatives)
   - Industry headwinds or tailwinds affecting the company

3. PAIN POINT HYPOTHESIS
   Based on signals and industry context, hypothesize 2-3 specific pricing
   or margin challenges the company likely faces. Be specific and actionable.

4. PERSONA-SPECIFIC ANGLES
   For each target persona, identify the specific hook that would resonate:
   - CFO/Finance: Financial metrics, margin pressure, ROI focus
   - Pricing/RGM Lead: Pricing complexity, competitive dynamics, analytics gaps
   - Sales/Commercial Leader: Sales productivity, customer profitability, quota
   - CEO/GM: Strategic growth, competitive positioning, transformation
   - Technology/Analytics: Data infrastructure, AI/ML capabilities, integration
</research_instructions>

<quality_standards>
- Every signal must be specific and verifiable (no generic statements)
- Hypotheses must be actionable (something Revology can help with)
- Persona hooks must be distinct (don't repeat the same angle)
- Include at least 3 recent signals if publicly traded, 2 if private
- Confidence score reflects research quality, not company fit
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
        variables: ['company', 'industry', 'website'],
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

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.promptTemplates && parsed.promptTemplates.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through to defaults
      }
    }
    return initializeDefaults();
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageRecords));
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

  const getUsageStats = useCallback((): UsageStats => {
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
