export interface ResearchSession {
  id: string;
  timestamp: number;
  companyName: string;
  website: string;
  industry: string;
  brief: string;
  hypotheses: string[];
  sentimentScore: number; // 0-100
  keyTrends: { name: string; value: number }[];
}

export interface GeneratedEmail {
  id: string;
  sessionId: string;
  persona: PersonaType;
  subject: string;
  body: string;
  timestamp: number;
}

export enum PersonaType {
  CEO = 'CEO',
  CFO = 'CFO',
  VP_SALES = 'VP_SALES',
  CTO = 'CTO',
  MARKETING_LEAD = 'MARKETING_LEAD'
}

export interface ResearchInput {
  companyName: string;
  website: string;
  industry: string;
}

export type AppState = {
  sessions: ResearchSession[];
  currentSessionId: string | null;
  emails: GeneratedEmail[];
};