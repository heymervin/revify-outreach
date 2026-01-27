import React, { createContext, useContext, useState, useEffect } from 'react';
import { ResearchSession, GeneratedEmail, AppState } from '../types';

interface AppContextType extends AppState {
  addSession: (session: ResearchSession) => void;
  setCurrentSession: (id: string) => void;
  addEmail: (email: GeneratedEmail) => void;
  getSessionById: (id: string) => ResearchSession | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<ResearchSession[]>(() => {
    const saved = localStorage.getItem('revify_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [emails, setEmails] = useState<GeneratedEmail[]>(() => {
    const saved = localStorage.getItem('revify_emails');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('revify_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('revify_emails', JSON.stringify(emails));
  }, [emails]);

  const addSession = (session: ResearchSession) => {
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(session.id);
  };

  const setCurrentSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const addEmail = (email: GeneratedEmail) => {
    setEmails(prev => [email, ...prev]);
  };

  const getSessionById = (id: string) => sessions.find(s => s.id === id);

  return (
    <AppContext.Provider value={{
      sessions,
      currentSessionId,
      emails,
      addSession,
      setCurrentSession,
      addEmail,
      getSessionById
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};