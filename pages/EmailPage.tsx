import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { PersonaType, RICH_PERSONA_KEYS, PERSONA_DISPLAY_NAMES, RichPersonaKey, GHLContactInfo, GHL_PERSONA_TO_RICH_PERSONA } from '../types';
import { generateEmail, generateEmailForContact } from '../services/aiService';
import { Send, Copy, RefreshCw, Check, Loader2, ArrowLeft, Sparkles, Users, User, Mail, Building2, Database, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import GHLCompanySelector, { GHLCompanyData, CompanySource } from '../components/GHLCompanySelector';
import { GHLService } from '../services/ghlService';

const EmailPage: React.FC = () => {
  const { currentSessionId, getSessionById, addEmail } = useApp();
  const settingsContext = useSettings();
  const { addUsageRecord, apiKeys, ghl, modelSelection, promptTemplates, tavily, lastUpdated } = settingsContext;
  const session = currentSessionId ? getSessionById(currentSessionId) : null;

  // Reconstruct settings object for email generation
  const settings = { apiKeys, modelSelection, promptTemplates, tavily, ghl, lastUpdated };

  // Company selection state (for when no session or user wants to select different company)
  const [companySource, setCompanySource] = useState<CompanySource>('ghl');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selectedCompanyData, setSelectedCompanyData] = useState<GHLCompanyData | null>(null);
  const [useGHLCompany, setUseGHLCompany] = useState(!session); // Default to GHL selector if no session

  const hasGHLConfig = Boolean(apiKeys.ghl && ghl?.locationId);

  // Determine if we're using session contacts or GHL company contacts
  const activeCompanyName = useGHLCompany ? selectedCompanyName : session?.companyName;
  const activeContacts: GHLContactInfo[] = useGHLCompany
    ? (selectedCompanyData?.contacts || [])
    : (session?.ghlContacts || []);

  // Determine format type (only relevant when using session)
  const isRichFormat = session?.format === 'rich' && session?.richData;
  const isV3Format = session?.format === 'v3' && session?.v3Data;
  const isV3_1Format = session?.format === 'v3_1' && session?.v3_1Data;
  const isModernFormat = isRichFormat || isV3Format || isV3_1Format;

  // Get recommended personas based on format
  const getRecommendedPersonas = (): string[] => {
    if (!session) return [];
    if (isV3_1Format && session?.v3_1Data) {
      return session.v3_1Data.outreach_priority?.recommended_personas || [];
    }
    if (isV3Format && session?.v3Data) {
      return session.v3Data.outreach_priority?.recommended_personas || [];
    }
    if (isRichFormat && session?.richData) {
      return session.richData.outreach_priority?.recommended_personas || [];
    }
    return [];
  };
  const recommendedPersonas = getRecommendedPersonas();

  // Get default persona based on format
  const getDefaultPersona = (): PersonaType | RichPersonaKey => {
    if (isModernFormat && recommendedPersonas.length > 0) {
      return recommendedPersonas[0] as RichPersonaKey;
    }
    return 'cfo_finance'; // Default to modern persona key
  };

  const [selectedPersona, setSelectedPersona] = useState<PersonaType | RichPersonaKey>(getDefaultPersona());
  const [selectedContact, setSelectedContact] = useState<GHLContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update selected persona and contact when session changes
  useEffect(() => {
    setSelectedPersona(getDefaultPersona());
    setSelectedContact(null);
    setGeneratedEmail(null);
    if (session) {
      setUseGHLCompany(false);
    }
  }, [currentSessionId]);

  // Handle company selection from GHL
  const handleCompanyChange = (companyName: string, data?: GHLCompanyData) => {
    setSelectedCompanyName(companyName);
    setSelectedCompanyData(data || null);
    setSelectedContact(null);
    setGeneratedEmail(null);
  };

  const handleGenerate = async () => {
    // Need either a session or a selected contact for email generation
    if (!session && !selectedContact) {
      setError('Please select a contact to generate an email.');
      return;
    }

    setLoading(true);
    setCopied(false);
    setError(null);

    try {
      let result;

      // Debug: log settings being used
      console.log('[Email Generation] Settings:', {
        hasApiKeys: !!apiKeys,
        emailProvider: modelSelection?.emailProvider,
        emailModel: modelSelection?.emailModel,
        hasPromptTemplates: promptTemplates?.length > 0,
        emailTemplateExists: promptTemplates?.some(t => t.type === 'email'),
      });

      if (session && !useGHLCompany) {
        // Use session-based generation (with research data)
        result = selectedContact
          ? await generateEmailForContact(session, selectedPersona, selectedContact, settings)
          : await generateEmail(session, selectedPersona, settings);
      } else if (selectedContact) {
        // Generate email for GHL contact without research session
        // Check if there's saved research from GHL
        let sessionToUse;

        if (selectedCompanyData?.companyResearch) {
          try {
            const savedResearch = JSON.parse(selectedCompanyData.companyResearch);
            console.log('[Email Generation] Using saved research from GHL:', savedResearch);

            // Determine format from saved research
            if (savedResearch.company_profile && savedResearch.persona_angles) {
              // V3 format research
              sessionToUse = {
                id: uuidv4(),
                timestamp: Date.now(),
                companyName: selectedCompanyName || selectedContact.name,
                website: selectedCompanyData?.website || '',
                industry: selectedCompanyData?.industry || '',
                format: 'v3' as const,
                v3Data: savedResearch,
              };
            } else {
              // Legacy or unknown format - use as brief
              sessionToUse = {
                id: uuidv4(),
                timestamp: Date.now(),
                companyName: selectedCompanyName || selectedContact.name,
                website: selectedCompanyData?.website || '',
                industry: selectedCompanyData?.industry || '',
                format: 'legacy' as const,
                brief: typeof savedResearch === 'string' ? savedResearch : JSON.stringify(savedResearch),
              };
            }
          } catch (parseErr) {
            console.warn('[Email Generation] Failed to parse saved research:', parseErr);
            // Fall through to minimal session
          }
        }

        // If no saved research, create minimal session
        if (!sessionToUse) {
          sessionToUse = {
            id: uuidv4(),
            timestamp: Date.now(),
            companyName: selectedCompanyName || selectedContact.name,
            website: selectedCompanyData?.website || '',
            industry: selectedCompanyData?.industry || '',
            format: 'legacy' as const,
            brief: selectedCompanyData?.description || `${selectedCompanyData?.industry || ''} company`,
          };
        }

        console.log('[Email Generation] Using session:', sessionToUse);
        result = await generateEmailForContact(sessionToUse, selectedPersona, selectedContact, settings);
      } else {
        setError('Please select a contact to generate an email.');
        return;
      }

      // Normalize email data to handle different field names from providers
      const emailData = {
        subject: result.data.subject || (result.data as any).subject_line || '',
        body: result.data.body || (result.data as any).email_body || '',
      };

      console.log('[Email Generation] Normalized email data:', emailData);
      setGeneratedEmail(emailData);

      if (session) {
        addEmail({
          id: uuidv4(),
          sessionId: session.id,
          persona: selectedPersona as PersonaType,
          subject: emailData.subject,
          body: emailData.body,
          timestamp: Date.now()
        });
      }

      // Record token usage
      addUsageRecord({
        provider: result.provider,
        model: result.model,
        taskType: 'email',
        usage: result.usage,
      });
    } catch (err) {
      console.error("Failed to generate email", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate email. Please check your API key in Settings.';
      setError(errorMessage);
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

  const handleSaveToGHL = async () => {
    if (!generatedEmail || !selectedContact || !apiKeys.ghl || !ghl?.locationId) {
      setError('Cannot save: missing email, contact, or GHL configuration');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const service = new GHLService(apiKeys.ghl, ghl.locationId);
      await service.saveEmailToContact(selectedContact.id, generatedEmail);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save email to GHL:', err);
      setError(err instanceof Error ? err.message : 'Failed to save email to GHL');
    } finally {
      setSaving(false);
    }
  };

  // Can generate if we have a session OR if we have a selected contact from GHL
  const canGenerate = (session && !useGHLCompany) || selectedContact;
  // Can save if we have an email and a selected contact
  const canSave = generatedEmail && selectedContact && hasGHLConfig;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Outreach Generator</h1>
          <p className="text-slate-500 mt-1">
            {activeCompanyName
              ? `Draft personalized emails for ${activeCompanyName}.`
              : 'Select a company and contact to draft personalized emails.'
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Company Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-brand-500" />
              Company
            </h3>

            {/* Toggle between session and GHL */}
            {session && hasGHLConfig && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setUseGHLCompany(false)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    !useGHLCompany
                      ? 'bg-brand-100 text-brand-700 border border-brand-200'
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  From Research
                </button>
                <button
                  onClick={() => setUseGHLCompany(true)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center ${
                    useGHLCompany
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Database className="w-3 h-3 mr-1" />
                  From GHL
                </button>
              </div>
            )}

            {/* Show current session company or GHL selector */}
            {!useGHLCompany && session ? (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <div className="font-medium text-slate-900">{session.companyName}</div>
                {session.industry && (
                  <div className="text-xs text-slate-500 mt-1">{session.industry}</div>
                )}
                <Link
                  to="/research"
                  className="text-xs text-brand-600 hover:text-brand-700 mt-2 inline-block"
                >
                  View research →
                </Link>
              </div>
            ) : hasGHLConfig ? (
              <GHLCompanySelector
                value={selectedCompanyName}
                onChange={handleCompanyChange}
                source={companySource}
                onSourceChange={setCompanySource}
              />
            ) : (
              <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
                <p className="mb-2">No GHL configuration found.</p>
                <Link to="/settings" className="text-brand-600 hover:text-brand-700">
                  Configure GHL in Settings →
                </Link>
              </div>
            )}

            {!session && !hasGHLConfig && (
              <div className="mt-4 text-center">
                <Link to="/research" className="inline-flex items-center text-brand-600 font-medium hover:text-brand-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Research
                </Link>
              </div>
            )}
          </div>

          {/* Contact Selection */}
          {activeContacts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-500" />
                Contacts ({activeContacts.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Option for no contact (generic persona email) - only if session exists */}
                {session && !useGHLCompany && (
                  <button
                    onClick={() => setSelectedContact(null)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                      selectedContact === null
                        ? 'bg-purple-50 text-purple-700 font-medium border border-purple-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      Generic (no specific contact)
                    </span>
                  </button>
                )}
                {/* Contact options */}
                {activeContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      // Auto-select persona if contact has one
                      if (contact.persona) {
                        console.log('[Persona Debug] Contact persona:', contact.persona);
                        console.log('[Persona Debug] Available mappings:', Object.keys(GHL_PERSONA_TO_RICH_PERSONA));

                        // Try exact match first
                        let mappedPersona = GHL_PERSONA_TO_RICH_PERSONA[contact.persona];

                        // If no exact match, try case-insensitive match
                        if (!mappedPersona) {
                          const lowerPersona = contact.persona.toLowerCase();
                          const found = Object.entries(GHL_PERSONA_TO_RICH_PERSONA).find(
                            ([key]) => key.toLowerCase() === lowerPersona
                          );
                          if (found) {
                            mappedPersona = found[1];
                            console.log('[Persona Debug] Found via case-insensitive match:', mappedPersona);
                          }
                        }

                        if (mappedPersona) {
                          console.log('[Persona Debug] Setting persona to:', mappedPersona);
                          setSelectedPersona(mappedPersona);
                        } else {
                          console.log('[Persona Debug] No mapping found for:', contact.persona);
                        }
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                      selectedContact?.id === contact.id
                        ? 'bg-purple-50 text-purple-700 font-medium border border-purple-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-purple-400" />
                        {contact.name}
                      </span>
                      {contact.email && (
                        <Mail className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 ml-6 flex items-center gap-2">
                      {contact.title && <span className="truncate">{contact.title}</span>}
                      {contact.persona && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          {contact.persona}
                        </span>
                      )}
                      {!contact.title && !contact.persona && contact.email && (
                        <span className="truncate">{contact.email}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show message if company selected but no contacts */}
          {useGHLCompany && selectedCompanyName && activeContacts.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <h4 className="text-amber-900 font-medium text-sm mb-1">No Contacts Found</h4>
              <p className="text-amber-800 text-xs">
                No contacts are associated with this company in GHL. Add contacts in GHL to enable personalized emails.
              </p>
            </div>
          )}

          {/* Persona Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Target Persona</h3>
            <div className="space-y-2">
              {RICH_PERSONA_KEYS.map((persona) => {
                const isRecommended = recommendedPersonas.includes(persona);
                return (
                  <button
                    key={persona}
                    onClick={() => setSelectedPersona(persona)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                      selectedPersona === persona
                        ? 'bg-brand-50 text-brand-700 font-medium border border-brand-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      {PERSONA_DISPLAY_NAMES[persona]}
                      {isRecommended && (
                        <span className="inline-flex items-center text-xs text-green-600 font-medium">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Recommended
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3">
              {error && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
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
              {!canGenerate && (
                <p className="text-xs text-slate-500 text-center">
                  {useGHLCompany ? 'Select a contact to generate an email' : 'Select a persona to generate an email'}
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h4 className="text-blue-900 font-medium text-sm mb-2">Pro Tip</h4>
            <p className="text-blue-800 text-xs leading-relaxed">
              Emails to {PERSONA_DISPLAY_NAMES[selectedPersona]}s should focus on{' '}
              {selectedPersona === 'cfo_finance' ? 'ROI, cost efficiency, and financial metrics' :
               selectedPersona === 'pricing_rgm' ? 'pricing optimization and margin improvement' :
               selectedPersona === 'sales_commercial' ? 'sales productivity and customer profitability' :
               selectedPersona === 'ceo_gm' ? 'strategic growth and competitive positioning' :
               'data infrastructure and analytics capabilities'}.
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {canSave && (
                    <button
                      onClick={handleSaveToGHL}
                      disabled={saving}
                      className={`text-xs font-medium flex items-center transition-colors px-3 py-1.5 rounded-lg ${
                        saved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      } disabled:opacity-50`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Saved to GHL
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          Save to GHL
                        </>
                      )}
                    </button>
                  )}
                </div>
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
              <p className="text-slate-500 max-w-sm mt-2">
                {!activeCompanyName
                  ? 'Select a company from GHL to get started.'
                  : activeContacts.length === 0
                  ? 'No contacts found for this company.'
                  : 'Select a contact and persona, then click generate to draft a personalized email.'
                }
              </p>
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
