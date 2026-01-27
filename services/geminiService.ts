import { GoogleGenAI, Type } from "@google/genai";
import { ResearchSession, PersonaType } from "../types";

// Initialize the client strictly according to guidelines using process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateResearch = async (
  company: string,
  industry: string,
  website: string
): Promise<Omit<ResearchSession, 'id' | 'timestamp'>> => {
  
  const model = "gemini-3-pro-preview";

  const prompt = `
    You are an expert market researcher. Conduct a deep dive analysis on the company "${company}" in the "${industry}" industry.
    Website: ${website}
    
    Provide:
    1. A concise research brief (approx 150 words) summarizing their business model, recent news, and market position.
    2. Three strategic hypotheses for why they might need new software/services.
    3. A sentiment score (0-100) based on market outlook.
    4. 4 key market trends relevant to them, with a relevance score (0-100) for visualization.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brief: { type: Type.STRING },
          hypotheses: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          sentimentScore: { type: Type.NUMBER },
          keyTrends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER }
              }
            }
          }
        },
        required: ["brief", "hypotheses", "sentimentScore", "keyTrends"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  const data = JSON.parse(response.text);
  
  return {
    companyName: company,
    industry: industry,
    website: website,
    brief: data.brief,
    hypotheses: data.hypotheses,
    sentimentScore: data.sentimentScore,
    keyTrends: data.keyTrends
  };
};

export const generateEmail = async (
  session: ResearchSession,
  persona: PersonaType
): Promise<{ subject: string; body: string }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert SDR. Write a cold email to the ${persona} of ${session.companyName}.
    
    Context:
    ${session.brief}
    
    Hypotheses:
    ${session.hypotheses.join('\n')}
    
    Requirements:
    - Subject line should be catchy but professional.
    - Body under 150 words.
    - Focus on value proposition related to the hypotheses.
    - Tone: Professional, slightly informal, persuasive.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text);
};