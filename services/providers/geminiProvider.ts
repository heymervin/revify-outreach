import { GoogleGenAI, Type } from "@google/genai";
import { AIProviderInterface, ProviderConfig, ResearchResult, EmailResult, ProviderResponse } from './index';
import { TokenUsage } from '../../types';

export class GeminiProvider implements AIProviderInterface {
  private ai: GoogleGenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  private extractUsage(response: any): TokenUsage {
    const usageMetadata = response.usageMetadata || {};
    return {
      inputTokens: usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0,
    };
  }

  // Helper to create persona angle schema
  private getPersonaAngleSchema() {
    return {
      type: Type.OBJECT,
      properties: {
        primary_hook: { type: Type.STRING },
        supporting_point: { type: Type.STRING },
        question_to_pose: { type: Type.STRING }
      },
      required: ["primary_hook", "supporting_point", "question_to_pose"]
    };
  }

  async generateResearch(prompt: string): Promise<ProviderResponse<ResearchResult>> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            company_profile: {
              type: Type.OBJECT,
              properties: {
                confirmed_name: { type: Type.STRING },
                industry: { type: Type.STRING },
                sub_segment: { type: Type.STRING },
                estimated_revenue: { type: Type.STRING },
                employee_count: { type: Type.STRING },
                business_model: { type: Type.STRING },
                headquarters: { type: Type.STRING },
                market_position: { type: Type.STRING }
              },
              required: ["confirmed_name", "industry", "sub_segment", "estimated_revenue",
                        "employee_count", "business_model", "headquarters", "market_position"]
            },
            recent_signals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  signal_type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  source: { type: Type.STRING },
                  date: { type: Type.STRING },
                  relevance_to_revology: { type: Type.STRING },
                  // Enhanced fields (optional)
                  source_url: { type: Type.STRING },
                  date_precision: { type: Type.STRING }, // 'exact' | 'month' | 'quarter' | 'year' | 'unknown'
                  credibility_score: { type: Type.NUMBER } // 0-1 scale
                },
                required: ["signal_type", "description", "source", "date", "relevance_to_revology"]
              }
            },
            pain_point_hypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hypothesis: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                  revology_solution_fit: { type: Type.STRING }
                },
                required: ["hypothesis", "evidence", "revology_solution_fit"]
              }
            },
            persona_angles: {
              type: Type.OBJECT,
              properties: {
                cfo_finance: this.getPersonaAngleSchema(),
                pricing_rgm: this.getPersonaAngleSchema(),
                sales_commercial: this.getPersonaAngleSchema(),
                ceo_gm: this.getPersonaAngleSchema(),
                technology_analytics: this.getPersonaAngleSchema()
              },
              required: ["cfo_finance", "pricing_rgm", "sales_commercial", "ceo_gm", "technology_analytics"]
            },
            outreach_priority: {
              type: Type.OBJECT,
              properties: {
                recommended_personas: { type: Type.ARRAY, items: { type: Type.STRING } },
                timing_notes: { type: Type.STRING },
                cautions: { type: Type.STRING }
              },
              required: ["recommended_personas", "timing_notes", "cautions"]
            },
            research_confidence: {
              type: Type.OBJECT,
              properties: {
                overall_score: { type: Type.NUMBER },
                gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                // Enhanced metrics (optional)
                financial_confidence: { type: Type.NUMBER }, // 0-1 scale
                signal_freshness: { type: Type.NUMBER }, // 0-1 scale
                source_quality: { type: Type.NUMBER }, // 0-1 scale
                search_coverage: { type: Type.NUMBER } // 0-1 scale
              },
              required: ["overall_score", "gaps"]
            }
          },
          required: ["company_profile", "recent_signals", "pain_point_hypotheses",
                    "persona_angles", "outreach_priority", "research_confidence"]
        }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    const parsed = JSON.parse(response.text);
    return {
      data: { format: 'rich', ...parsed },
      usage: this.extractUsage(response),
    };
  }

  async generateEmail(prompt: string): Promise<ProviderResponse<EmailResult>> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    return {
      data: JSON.parse(response.text),
      usage: this.extractUsage(response),
    };
  }
}
