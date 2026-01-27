import { AIProvider, ResearchSession, PersonaType, SettingsState, TokenUsage, PERSONA_DISPLAY_NAMES, RichPersonaKey, ResearchMetadata, ResearchConfidence, ResearchAngleId, ResearchDepth } from '../types';
import { AIProviderInterface, ProviderConfig, RichResearchResult } from './providers';
import { GeminiProvider } from './providers/geminiProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { interpolateTemplate } from '../utils/templateEngine';
import { searchTavily, formatTavilyResultsForPrompt } from './tavilyService';
import { runResearchPipeline, formatPipelineResultsForPrompt, calculateConfidenceMetrics } from './researchPipeline';
import { normalizeResearchOutput, normalizeResearchOutputV2 } from './responseValidator';
import { executeResearchV2, executeResearchV2AllAngles, formatV2ResultsForPrompt, mergeV2IntoRichOutput } from './researchServiceV2';
import { getResearchAngle } from '../data/researchAngles';

export interface ResearchResponse {
  data: Omit<ResearchSession, 'id' | 'timestamp'>;
  usage: TokenUsage;
  provider: AIProvider;
  model: string;
  metadata?: ResearchMetadata; // Pipeline metadata when multi-stage research is used
}

export type AngleSelection = ResearchAngleId | 'all';

export interface ResearchV2Options {
  angle?: AngleSelection;
  depth?: ResearchDepth;
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

  // Check if multi-stage pipeline should be used
  const shouldUsePipeline = tavily.enabled && tavily.includeInResearch && apiKeys.tavily;

  let prompt = interpolateTemplate(template.content, {
    company,
    industry,
    website: website || 'Not provided',
  });

  let pipelineMetadata: ResearchMetadata | undefined;
  let confidenceMetrics: Pick<ResearchConfidence, 'financial_confidence' | 'signal_freshness' | 'source_quality' | 'search_coverage'> | undefined;

  if (shouldUsePipeline) {
    try {
      // Run the multi-stage research pipeline (including website scraping)
      console.log('Running multi-stage research pipeline...');
      const { stageResults, metadata } = await runResearchPipeline(
        company,
        industry,
        apiKeys.tavily!,
        { searchDepth: tavily.searchDepth },
        website // Pass website for scraping
      );

      // Format pipeline results for the prompt
      const researchData = formatPipelineResultsForPrompt(stageResults, metadata);
      const searchQueries = metadata.search_queries.join('\n');

      // Check if template has new variables, otherwise append data
      if (template.content.includes('{{research_data}}')) {
        prompt = prompt.replace('{{research_data}}', researchData);
        prompt = prompt.replace('{{search_queries}}', searchQueries);
      } else {
        // Append to prompt for backward compatibility with old templates
        prompt += `\n\n${researchData}\n\nSearch Queries Used:\n${searchQueries}`;
      }

      // Calculate confidence metrics from pipeline
      confidenceMetrics = calculateConfidenceMetrics(stageResults);

      pipelineMetadata = {
        ...metadata,
        timestamp: Date.now(),
      };

      console.log(`Pipeline completed: ${metadata.total_sources_found} sources from ${metadata.stages_completed.length} stages`);
    } catch (error) {
      console.warn('Research pipeline failed, falling back to single-shot:', error);
      // Fall back to legacy single-shot approach
      const legacyResults = await fallbackToLegacySearch(company, industry, apiKeys.tavily!, tavily.searchDepth);
      if (legacyResults) {
        prompt += legacyResults;
      }
    }
  } else if (tavily.enabled && tavily.includeInResearch && apiKeys.tavily) {
    // Legacy single-shot approach when pipeline is explicitly disabled
    const legacyResults = await fallbackToLegacySearch(company, industry, apiKeys.tavily!, tavily.searchDepth);
    if (legacyResults) {
      prompt += legacyResults;
    }
  }

  const result = await provider.generateResearch(prompt);

  // Handle rich format vs legacy format
  if (result.data.format === 'rich') {
    // Normalize the AI response to ensure correct data types
    const normalizedData = normalizeResearchOutput(result.data);

    // Merge pipeline confidence metrics with AI-generated confidence
    const enhancedConfidence: ResearchConfidence = {
      ...normalizedData.research_confidence,
      ...(confidenceMetrics || {}),
    };

    return {
      data: {
        companyName: company,
        industry,
        website,
        format: 'rich',
        richData: {
          company_profile: normalizedData.company_profile,
          recent_signals: normalizedData.recent_signals,
          pain_point_hypotheses: normalizedData.pain_point_hypotheses,
          persona_angles: normalizedData.persona_angles,
          outreach_priority: normalizedData.outreach_priority,
          research_confidence: enhancedConfidence,
          metadata: pipelineMetadata,
        },
      },
      usage: result.usage,
      provider: modelSelection.researchProvider,
      model: modelSelection.researchModel,
      metadata: pipelineMetadata,
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
    metadata: pipelineMetadata,
  };
};

// Helper for legacy fallback
async function fallbackToLegacySearch(
  company: string,
  industry: string,
  tavilyKey: string,
  searchDepth: 'basic' | 'advanced'
): Promise<string> {
  try {
    const searchQuery = `${company} ${industry} recent news developments`;
    const searchResults = await searchTavily(searchQuery, tavilyKey, {
      searchDepth,
      maxResults: 5,
    });
    return formatTavilyResultsForPrompt(searchResults.results);
  } catch (error) {
    console.warn('Tavily search failed:', error);
    return '';
  }
}

/**
 * V2 Research Generation with Research Angles and Hypothesis Matching
 */
export const generateResearchV2 = async (
  company: string,
  industry: string,
  website: string,
  settings: SettingsState,
  options: ResearchV2Options = {}
): Promise<ResearchResponse> => {
  const { modelSelection, apiKeys, promptTemplates, tavily } = settings;
  const { angle = 'margin_analytics', depth = 'standard' } = options;

  // Validate API keys
  const apiKey = apiKeys[modelSelection.researchProvider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${modelSelection.researchProvider}. Please add your API key in Settings.`);
  }

  if (!apiKeys.tavily) {
    throw new Error('Tavily API key required for V2 research. Please add your Tavily API key in Settings.');
  }

  const provider = createProvider(modelSelection.researchProvider, {
    apiKey,
    model: modelSelection.researchModel,
  });

  // Get research template
  const template = promptTemplates.find(t => t.type === 'research' && t.isDefault)
    || promptTemplates.find(t => t.type === 'research');

  if (!template) {
    throw new Error('No research prompt template configured');
  }

  // Check if researching all angles or single angle
  const isAllAngles = angle === 'all';
  const singleAngle = isAllAngles ? 'margin_analytics' : angle;
  const angleInfo = getResearchAngle(singleAngle);

  console.log(`Starting V2 research for ${company}:`);
  console.log(`  Mode: ${isAllAngles ? 'ALL ANGLES (Comprehensive)' : angleInfo?.name || angle}`);
  console.log(`  Depth: ${depth}`);

  // Execute V2 research pipeline
  let pipelineResult;
  let v2Result;
  let angleResults;

  if (isAllAngles) {
    // Research all angles comprehensively
    const allAnglesResult = await executeResearchV2AllAngles(
      company,
      industry,
      website,
      apiKeys.tavily!,
      { depth }
    );
    pipelineResult = allAnglesResult.pipelineResult;
    v2Result = allAnglesResult.v2Result;
    angleResults = allAnglesResult.angleResults;
  } else {
    // Research single angle
    const singleResult = await executeResearchV2(
      company,
      industry,
      website,
      apiKeys.tavily!,
      { angle: singleAngle, depth }
    );
    pipelineResult = singleResult.pipelineResult;
    v2Result = singleResult.v2Result;
  }

  // Build the prompt with V2-enhanced data
  const v2FormattedData = formatV2ResultsForPrompt(pipelineResult, v2Result);
  const searchQueries = pipelineResult.metadata.search_queries.join('\n');

  let prompt = interpolateTemplate(template.content, {
    company,
    industry,
    website: website || 'Not provided',
  });

  // Inject V2 research data
  if (template.content.includes('{{research_data}}')) {
    prompt = prompt.replace('{{research_data}}', v2FormattedData);
    prompt = prompt.replace('{{search_queries}}', searchQueries);
  } else {
    // Append for backward compatibility
    prompt += `\n\n${v2FormattedData}\n\nSearch Queries Used:\n${searchQueries}`;
  }

  // Add V2-specific instructions to the prompt
  if (isAllAngles) {
    prompt += `\n\n=== V2 RESEARCH INSTRUCTIONS (COMPREHENSIVE - ALL ANGLES) ===
Research Mode: Comprehensive Analysis across ALL 4 Service Lines
- Margin Analytics & Optimization
- Sales Growth Analytics
- Promotion Effectiveness & Optimization
- Commercial Analytics Transformation

Please ensure your analysis:
1. Incorporates ALL pre-matched hypotheses from the Pain Point Library above
2. Organizes findings by service line relevance
3. Identifies cross-cutting themes that span multiple service lines
4. Maps discoveries to the most appropriate personas across all angles
5. Notes any gaps in the research that should be addressed
`;
  } else {
    prompt += `\n\n=== V2 RESEARCH INSTRUCTIONS ===
Research Angle: ${angleInfo?.name || angle}
Service Line Focus: ${angleInfo?.service_line || 'General'}

Please ensure your analysis:
1. Incorporates the pre-matched hypotheses from the Pain Point Library above
2. Prioritizes signals relevant to ${angleInfo?.name || 'the selected research angle'}
3. Maps discoveries to the appropriate personas for this angle
4. Notes any gaps in the research that should be addressed
`;
  }

  // Generate research with the AI provider
  const result = await provider.generateResearch(prompt);

  // Normalize and merge V2 data
  const normalizedData = normalizeResearchOutputV2(result.data, v2Result);

  // Build pipeline metadata
  const pipelineMetadata: ResearchMetadata = {
    ...pipelineResult.metadata,
    timestamp: Date.now(),
  };

  console.log(`V2 research completed for ${company}:`);
  console.log(`  Sources: ${pipelineResult.metadata.total_sources_found}`);
  console.log(`  Hypotheses: ${v2Result.matchedHypotheses.length}`);
  console.log(`  Confidence: ${v2Result.confidenceBreakdown.overall.toFixed(2)}`);

  // For 'all' angles, store as undefined in the session (will display as "All Angles")
  const storedAngle = isAllAngles ? undefined : singleAngle;

  return {
    data: {
      companyName: company,
      industry,
      website,
      format: 'rich_v2',
      researchAngle: storedAngle,
      researchDepth: depth,
      richData: {
        company_profile: normalizedData.company_profile,
        recent_signals: normalizedData.recent_signals,
        pain_point_hypotheses: normalizedData.pain_point_hypotheses,
        persona_angles: normalizedData.persona_angles,
        outreach_priority: normalizedData.outreach_priority,
        research_confidence: normalizedData.research_confidence,
        metadata: pipelineMetadata,
        // V2 additions
        research_angle: storedAngle,
        research_depth: depth,
        matched_pain_points: v2Result.matchedHypotheses,
        confidence_breakdown: v2Result.confidenceBreakdown,
        research_gaps_actionable: v2Result.researchGaps,
        // For all angles, include breakdown by angle
        ...(isAllAngles && angleResults ? { angle_results: angleResults } : {}),
      },
    },
    usage: result.usage,
    provider: modelSelection.researchProvider,
    model: modelSelection.researchModel,
    metadata: pipelineMetadata,
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
