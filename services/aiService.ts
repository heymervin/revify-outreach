import { AIProvider, ResearchSession, PersonaType, SettingsState, TokenUsage, PERSONA_DISPLAY_NAMES, RichPersonaKey } from '../types';
import { AIProviderInterface, ProviderConfig, RichResearchResult } from './providers';
import { GeminiProvider } from './providers/geminiProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { interpolateTemplate } from '../utils/templateEngine';
import { searchTavily, formatTavilyResultsForPrompt } from './tavilyService';

export interface ResearchResponse {
  data: Omit<ResearchSession, 'id' | 'timestamp'>;
  usage: TokenUsage;
  provider: AIProvider;
  model: string;
}

export interface EmailResponse {
  data: { subject: string; body: string };
  usage: TokenUsage;
  provider: AIProvider;
  model: string;
}

function createProvider(provider: AIProvider, config: ProviderConfig): AIProviderInterface {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const generateResearch = async (
  company: string,
  industry: string,
  website: string,
  settings: SettingsState
): Promise<ResearchResponse> => {
  const { modelSelection, apiKeys, promptTemplates, tavily } = settings;

  const apiKey = apiKeys[modelSelection.researchProvider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${modelSelection.researchProvider}. Please add your API key in Settings.`);
  }

  const provider = createProvider(modelSelection.researchProvider, {
    apiKey,
    model: modelSelection.researchModel,
  });

  const template = promptTemplates.find(t => t.type === 'research' && t.isDefault)
    || promptTemplates.find(t => t.type === 'research');

  if (!template) {
    throw new Error('No research prompt template configured');
  }

  let prompt = interpolateTemplate(template.content, {
    company,
    industry,
    website: website || 'Not provided',
  });

  // Add Tavily search results if enabled
  if (tavily.enabled && tavily.includeInResearch && apiKeys.tavily) {
    try {
      const searchQuery = `${company} ${industry} recent news developments`;
      const searchResults = await searchTavily(searchQuery, apiKeys.tavily, {
        searchDepth: tavily.searchDepth,
        maxResults: 5,
      });
      const formattedResults = formatTavilyResultsForPrompt(searchResults.results);
      if (formattedResults) {
        prompt += formattedResults;
      }
    } catch (error) {
      console.warn('Tavily search failed, proceeding without web results:', error);
    }
  }

  const result = await provider.generateResearch(prompt);

  // Handle rich format vs legacy format
  if (result.data.format === 'rich') {
    const richData = result.data as RichResearchResult;
    return {
      data: {
        companyName: company,
        industry,
        website,
        format: 'rich',
        richData: {
          company_profile: richData.company_profile,
          recent_signals: richData.recent_signals,
          pain_point_hypotheses: richData.pain_point_hypotheses,
          persona_angles: richData.persona_angles,
          outreach_priority: richData.outreach_priority,
          research_confidence: richData.research_confidence,
        },
      },
      usage: result.usage,
      provider: modelSelection.researchProvider,
      model: modelSelection.researchModel,
    };
  }

  // Legacy format
  return {
    data: {
      companyName: company,
      industry,
      website,
      format: 'legacy',
      ...result.data,
    },
    usage: result.usage,
    provider: modelSelection.researchProvider,
    model: modelSelection.researchModel,
  };
};

export const generateEmail = async (
  session: ResearchSession,
  persona: PersonaType | RichPersonaKey,
  settings: SettingsState
): Promise<EmailResponse> => {
  const { modelSelection, apiKeys, promptTemplates } = settings;

  const apiKey = apiKeys[modelSelection.emailProvider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${modelSelection.emailProvider}. Please add your API key in Settings.`);
  }

  const provider = createProvider(modelSelection.emailProvider, {
    apiKey,
    model: modelSelection.emailModel,
  });

  const template = promptTemplates.find(t => t.type === 'email' && t.isDefault)
    || promptTemplates.find(t => t.type === 'email');

  if (!template) {
    throw new Error('No email prompt template configured');
  }

  // Build context based on session format
  let templateVars: Record<string, string>;

  if (session.format === 'rich' && session.richData) {
    const rd = session.richData;
    const personaKey = persona as RichPersonaKey;
    const angle = rd.persona_angles[personaKey];

    templateVars = {
      persona: PERSONA_DISPLAY_NAMES[persona] || String(persona).replace('_', ' '),
      company: rd.company_profile.confirmed_name,
      brief: `${rd.company_profile.business_model}. ${rd.company_profile.market_position}`,
      hypotheses: rd.pain_point_hypotheses.map(h => `- ${h.hypothesis}`).join('\n'),
      primary_hook: angle?.primary_hook || '',
      supporting_point: angle?.supporting_point || '',
      question_to_pose: angle?.question_to_pose || '',
      timing_notes: rd.outreach_priority.timing_notes || '',
      cautions: rd.outreach_priority.cautions || '',
    };
  } else {
    // Legacy format
    templateVars = {
      persona: PERSONA_DISPLAY_NAMES[persona] || String(persona).replace('_', ' '),
      company: session.companyName,
      brief: session.brief || '',
      hypotheses: (session.hypotheses || []).map(h => `- ${h}`).join('\n'),
      primary_hook: '',
      supporting_point: '',
      question_to_pose: '',
      timing_notes: '',
      cautions: '',
    };
  }

  const prompt = interpolateTemplate(template.content, templateVars);

  console.log('Email generation - Template vars:', templateVars);
  console.log('Email generation - Prompt:', prompt.substring(0, 500) + '...');

  const result = await provider.generateEmail(prompt);

  console.log('Email generation - Result:', result);

  return {
    data: result.data,
    usage: result.usage,
    provider: modelSelection.emailProvider,
    model: modelSelection.emailModel,
  };
};
