import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { ResearchSession, GeneratedEmail, AppState } from '../types';

interface AppContextType extends AppState {
  addSession: (session: ResearchSession) => void;
  setCurrentSession: (id: string) => void;
  addEmail: (email: GeneratedEmail) => void;
  getSessionById: (id: string) => ResearchSession | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEBOUNCE_MS = 500;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<ResearchSession[]>(() => {
    const saved = localStorage.getItem('revify_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [emails, setEmails] = useState<GeneratedEmail[]>(() => {
    const saved = localStorage.getItem('revify_emails');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const sessionsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emailsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(sessionsTimer.current);
    sessionsTimer.current = setTimeout(() => {
      localStorage.setItem('revify_sessions', JSON.stringify(sessions));
    }, DEBOUNCE_MS);
    return () => clearTimeout(sessionsTimer.current);
  }, [sessions]);

  useEffect(() => {
    clearTimeout(emailsTimer.current);
    emailsTimer.current = setTimeout(() => {
      localStorage.setItem('revify_emails', JSON.stringify(emails));
    }, DEBOUNCE_MS);
    return () => clearTimeout(emailsTimer.current);
  }, [emails]);

  const addSession = useCallback((session: ResearchSession) => {
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(session.id);
  }, []);

  const setCurrentSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const addEmail = useCallback((email: GeneratedEmail) => {
    setEmails(prev => [email, ...prev]);
  }, []);

  const getSessionById = useCallback(
    (id: string) => sessions.find(s => s.id === id),
    [sessions]
  );

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
