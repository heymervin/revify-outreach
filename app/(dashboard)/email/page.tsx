'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  User,
  Building2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Send,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface ResearchSession {
  id: string;
  company_name: string;
  industry: string;
  created_at: string;
}

const personas = [
  { id: 'cfo_finance', label: 'CFO / Finance', color: 'emerald' },
  { id: 'ceo_gm', label: 'CEO / GM', color: 'blue' },
  { id: 'pricing_rgm', label: 'Pricing / RGM', color: 'purple' },
  { id: 'sales_commercial', label: 'Sales / Commercial', color: 'amber' },
  { id: 'technology_analytics', label: 'Technology / Analytics', color: 'red' },
];

const tones = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'direct', label: 'Direct' },
  { id: 'consultative', label: 'Consultative' },
];

export default function EmailPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState('cfo_finance');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('research_sessions')
        .select('id, company_name, industry, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setSessions(data);
        if (data.length > 0) {
          setSelectedSession(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmail = async () => {
    if (!selectedSession) return;

    setGenerating(true);
    setEmail(null);

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          persona: selectedPersona,
          tone: selectedTone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(data.email);
      } else {
        throw new Error(data.error || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Failed to generate email:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!email) return;

    const text = `Subject: ${email.subject}\n\n${email.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedSessionData = sessions.find((s) => s.id === selectedSession);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Email Generation</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Create personalized outreach emails from research
            </p>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Company Selection */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Select Company</h3>
                    <p className="text-sm text-slate-500">Choose from recent research</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="input appearance-none pr-10"
                    >
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.company_name} - {session.industry || 'Unknown'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-4">
                    No research sessions found. Run some research first!
                  </p>
                )}
              </div>

              {/* Persona Selection */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Target Persona</h3>
                    <p className="text-sm text-slate-500">Who are you reaching out to?</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona.id)}
                      className={`p-3 rounded-xl text-sm font-medium text-left transition-all ${
                        selectedPersona === persona.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {persona.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Email Tone</h3>
                    <p className="text-sm text-slate-500">Set the communication style</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tones.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedTone === tone.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateEmail}
                disabled={generating || !selectedSession}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Email
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Email Preview */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Email Preview</h3>
                    <p className="text-sm text-slate-500">
                      {selectedSessionData?.company_name || 'Select a company'}
                    </p>
                  </div>
                </div>
                {email && (
                  <div className="flex gap-2">
                    <button
                      onClick={generateEmail}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {generating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                  <p className="text-slate-500">Crafting your email...</p>
                </div>
              ) : email ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Subject
                    </label>
                    <p className="text-slate-900 font-medium mt-1">{email.subject}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Body
                    </label>
                    <div className="mt-2 p-4 bg-slate-50 rounded-xl">
                      <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {email.body}
                      </p>
                    </div>
                  </div>
                  <button className="btn-primary w-full">
                    <Send className="w-4 h-4" />
                    Send via GHL
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Mail className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-500">
                    Configure your settings and click<br />
                    <span className="font-semibold">Generate Email</span> to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
