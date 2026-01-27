import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PersonaType } from '../types';
import { generateEmail } from '../services/geminiService';
import { Send, Copy, RefreshCw, Check, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const EmailPage: React.FC = () => {
  const { currentSessionId, getSessionById, addEmail } = useApp();
  const session = currentSessionId ? getSessionById(currentSessionId) : null;
  
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>(PersonaType.CEO);
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!session) return;
    setLoading(true);
    setCopied(false);
    try {
      const email = await generateEmail(session, selectedPersona);
      setGeneratedEmail(email);
      addEmail({
        id: uuidv4(),
        sessionId: session.id,
        persona: selectedPersona,
        subject: email.subject,
        body: email.body,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to generate email", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
         <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Send className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Session</h2>
        <p className="text-slate-500 mb-6">Please conduct research on a company first before generating outreach emails.</p>
        <Link to="/research" className="inline-flex items-center text-brand-600 font-medium hover:text-brand-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go to Research
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Outreach Generator</h1>
          <p className="text-slate-500 mt-1">Draft personalized emails based on your research for {session.companyName}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Target Persona</h3>
            <div className="space-y-2">
              {Object.values(PersonaType).map((persona) => (
                <button
                  key={persona}
                  onClick={() => setSelectedPersona(persona)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                    selectedPersona === persona
                      ? 'bg-brand-50 text-brand-700 font-medium border border-brand-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {persona.replace('_', ' ')}
                </button>
              ))}
            </div>
            
            <div className="mt-8">
               <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                    Generate Email
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h4 className="text-blue-900 font-medium text-sm mb-2">Pro Tip</h4>
            <p className="text-blue-800 text-xs leading-relaxed">
              Emails to {selectedPersona.replace('_', ' ')}s should focus on {
                selectedPersona === 'CEO' ? 'strategic growth and vision' :
                selectedPersona === 'CFO' ? 'ROI and cost efficiency' :
                selectedPersona === 'VP_SALES' ? 'pipeline velocity and close rates' :
                'technical scalability and security'
              }.
            </p>
          </div>
        </div>

        {/* Email Preview Panel */}
        <div className="lg:col-span-2">
          {generatedEmail ? (
            <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in-up">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <button 
                  onClick={handleCopy}
                  className="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              
              <div className="p-8 flex-1">
                <div className="mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</span>
                  <div className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">
                    {generatedEmail.subject}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Body</span>
                  <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {generatedEmail.body}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MailIcon className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Ready to Draft</h3>
              <p className="text-slate-500 max-w-sm mt-2">Select a persona and click generate to draft a highly personalized cold email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default EmailPage;