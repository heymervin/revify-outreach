'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CompanySelectStep,
  ResearchCheckStep,
  RecipientSelectStep,
  EmailEditorStep,
} from './steps';

export interface GHLCompany {
  id: string;
  companyName: string;
  website?: string;
  industry?: string;
  email?: string;
  phone?: string;
  hasResearch?: boolean;
  research?: ResearchData | null;
}

// Research data structure from GHL company_research field
export interface ResearchData {
  company_profile?: {
    confirmed_name: string;
    industry: string;
    estimated_revenue?: string;
    employee_count?: string;
    headquarters?: string;
  };
  pain_point_hypotheses?: Array<{
    hypothesis: string;
    evidence: string;
  }>;
  recent_signals?: Array<{
    type: string;
    headline?: string;
    description?: string;
    source_name?: string;
    date?: string;
  }>;
  persona_angles?: Record<string, {
    hook: string;
    supporting_point?: string;
    question?: string;
  }>;
  outreach_priority?: {
    recommended_personas?: string[];
    urgency?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  persona: string;
}

// Keep ResearchSession for compatibility but it's no longer primary
export interface ResearchSession {
  id: string;
  company_name: string;
  industry: string;
  created_at: string;
  ghl_company_id?: string;
  ghl_pushed_at?: string;
}

export interface Draft {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  research_results?: {
    company_name: string;
  };
}

type WizardStep = 1 | 2 | 3 | 4;

interface OutreachWizardState {
  step: WizardStep;
  selectedCompany: GHLCompany | null;
  researchSession: ResearchSession | null;
  researchData: ResearchData | null; // Research from GHL company_research field
  hasResearch: boolean;
  checkingResearch: boolean;
  selectedContact: Contact | null;
  contacts: Contact[];
  loadingContacts: boolean;
  selectedPersona: string;
  selectedTone: string;
  generatedEmail: { subject: string; body: string } | null;
  editedSubject: string;
  editedBody: string;
  currentDraftId: string | null;
}

const initialState: OutreachWizardState = {
  step: 1,
  selectedCompany: null,
  researchSession: null,
  researchData: null,
  hasResearch: false,
  checkingResearch: false,
  selectedContact: null,
  contacts: [],
  loadingContacts: false,
  selectedPersona: 'cfo_finance',
  selectedTone: 'professional',
  generatedEmail: null,
  editedSubject: '',
  editedBody: '',
  currentDraftId: null,
};

export function OutreachWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<OutreachWizardState>(initialState);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drafts sidebar state
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  // Handle returnTo param - auto-select company if coming back from research
  useEffect(() => {
    const ghlCompanyId = searchParams.get('ghl_company_id');
    const returnedFromResearch = searchParams.get('returned') === 'true';

    if (ghlCompanyId && returnedFromResearch) {
      // Fetch company details and pre-select it
      fetchCompanyById(ghlCompanyId);
    }
  }, [searchParams]);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const fetchCompanyById = async (companyId: string) => {
    try {
      const response = await fetch(`/api/ghl/companies?id=${companyId}`);
      const data = await response.json();
      if (response.ok && data.company) {
        handleCompanySelect(data.company);
      }
    } catch (error) {
      console.error('Failed to fetch company:', error);
    }
  };

  const loadDrafts = async () => {
    try {
      const response = await fetch('/api/drafts?status=draft');
      const data = await response.json();
      if (data.drafts) {
        setDrafts(data.drafts);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  };

  // Update state helper
  const updateState = useCallback((updates: Partial<OutreachWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Step 1: Company Selection
  // When a company is selected from the list, we need to fetch full details to get research
  const handleCompanySelect = useCallback(async (company: GHLCompany) => {
    updateState({
      selectedCompany: company,
      checkingResearch: true,
      researchSession: null,
      researchData: null,
      hasResearch: false,
    });

    // Fetch full company details including research from GHL
    try {
      const response = await fetch(`/api/ghl/companies?id=${company.id}`);
      const data = await response.json();

      if (response.ok && data.company) {
        const fullCompany = data.company;
        updateState({
          selectedCompany: fullCompany,
          hasResearch: !!fullCompany.hasResearch,
          researchData: fullCompany.research || null,
          checkingResearch: false,
        });
      } else {
        // If fetch fails, just use the company without research
        updateState({
          hasResearch: false,
          researchData: null,
          checkingResearch: false,
        });
      }
    } catch (error) {
      console.error('Error fetching company research:', error);
      updateState({
        hasResearch: false,
        researchData: null,
        checkingResearch: false,
      });
    }
  }, [updateState]);

  const handleCompanyClear = useCallback(() => {
    updateState({
      selectedCompany: null,
      researchSession: null,
      researchData: null,
      hasResearch: false,
      contacts: [],
      selectedContact: null,
    });
  }, [updateState]);

  // Step navigation
  const goToStep = useCallback((step: WizardStep) => {
    updateState({ step });
  }, [updateState]);

  const handleNextFromStep1 = useCallback(() => {
    if (!state.selectedCompany) return;
    // Go to step 2 (research check)
    goToStep(2);
  }, [state.selectedCompany, goToStep]);

  const handleResearchNow = useCallback(() => {
    if (!state.selectedCompany) return;
    // Navigate to research page with return parameters
    router.push(`/research?ghl_company_id=${state.selectedCompany.id}&returnTo=email`);
  }, [state.selectedCompany, router]);

  const handleSkipResearch = useCallback(() => {
    // Skip to step 3 without research
    goToStep(3);
  }, [goToStep]);

  const handleContinueFromStep2 = useCallback(() => {
    // Continue to step 3 with research
    goToStep(3);
  }, [goToStep]);

  // Step 3: Fetch contacts when entering
  useEffect(() => {
    if (state.step === 3 && state.selectedCompany?.id) {
      fetchContacts(state.selectedCompany.id);
    }
  }, [state.step, state.selectedCompany?.id]);

  const fetchContacts = async (ghlCompanyId: string) => {
    updateState({ loadingContacts: true, contacts: [] });
    try {
      const response = await fetch(`/api/ghl/contacts?company_id=${ghlCompanyId}`);
      const data = await response.json();

      if (response.ok && data.contacts && data.contacts.length > 0) {
        updateState({
          contacts: data.contacts,
          loadingContacts: false,
        });
      } else {
        updateState({
          contacts: [],
          loadingContacts: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      updateState({ loadingContacts: false });
    }
  };

  const handleContactSelect = useCallback((contact: Contact | null) => {
    updateState({ selectedContact: contact });
  }, [updateState]);

  const handlePersonaChange = useCallback((persona: string) => {
    updateState({ selectedPersona: persona });
  }, [updateState]);

  const handleToneChange = useCallback((tone: string) => {
    updateState({ selectedTone: tone });
  }, [updateState]);

  // Step 4: Email Generation
  const handleGenerateEmail = async () => {
    if (!state.selectedCompany) return;

    setGenerating(true);
    setError(null);
    updateState({ generatedEmail: null, currentDraftId: null });

    try {
      // Build request body
      const requestBody: Record<string, unknown> = {
        persona: state.selectedPersona,
        tone: state.selectedTone,
        company_name: state.selectedCompany.companyName,
        industry: state.selectedCompany.industry,
      };

      // If we have research data from GHL, include it
      if (state.researchData) {
        requestBody.research_data = state.researchData;
      }

      // Add contact info if selected
      if (state.selectedContact) {
        requestBody.contact = {
          id: state.selectedContact.id,
          firstName: state.selectedContact.firstName,
          name: state.selectedContact.name,
        };
      }

      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        updateState({
          generatedEmail: data.email,
          editedSubject: data.email.subject,
          editedBody: data.email.body,
          step: 4,
        });
      } else {
        throw new Error(data.error || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Failed to generate email:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSubject = useCallback((subject: string) => {
    updateState({ editedSubject: subject });
  }, [updateState]);

  const handleEditBody = useCallback((body: string) => {
    updateState({ editedBody: body });
  }, [updateState]);

  const handleSaveDraft = async () => {
    if (!state.editedSubject || !state.editedBody) return;

    setSaving(true);
    setError(null);

    try {
      if (state.currentDraftId) {
        // Update existing draft
        const response = await fetch(`/api/drafts/${state.currentDraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: state.editedSubject,
            body: state.editedBody,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update draft');
        }
      } else {
        // Create new draft
        const response = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: state.editedSubject,
            body: state.editedBody,
            original_body: state.generatedEmail?.body || state.editedBody,
            ghl_contact_id: state.selectedContact?.id,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save draft');
        }
        updateState({ currentDraftId: data.draft.id });
      }

      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      loadDrafts();
    } catch (error) {
      console.error('Failed to save draft:', error);
      setError(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!state.editedSubject || !state.editedBody) return;
    if (!state.selectedContact?.email) {
      setError('Please select a contact with an email address');
      return;
    }

    setSending(true);
    setError(null);

    try {
      let draftId = state.currentDraftId;

      // Create draft if it doesn't exist
      if (!draftId) {
        const draftResponse = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: state.editedSubject,
            body: state.editedBody,
            original_body: state.generatedEmail?.body || state.editedBody,
            ghl_contact_id: state.selectedContact.id,
          }),
        });

        const draftData = await draftResponse.json();
        if (!draftResponse.ok) {
          throw new Error(draftData.error || 'Failed to save draft before sending');
        }
        draftId = draftData.draft.id;
      }

      // Send the email
      const sendResponse = await fetch(`/api/drafts/${draftId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: state.selectedContact.id,
        }),
      });

      const sendData = await sendResponse.json();
      if (!sendResponse.ok) {
        throw new Error(sendData.error || 'Failed to send email');
      }

      setSuccess('Email sent successfully!');
      // Reset wizard
      setTimeout(() => {
        setState(initialState);
        setSuccess(null);
      }, 2000);
      loadDrafts();
    } catch (error) {
      console.error('Failed to send email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleBackFromStep = useCallback((fromStep: WizardStep) => {
    switch (fromStep) {
      case 2:
        goToStep(1);
        break;
      case 3:
        goToStep(state.hasResearch ? 2 : 1);
        break;
      case 4:
        goToStep(3);
        break;
    }
  }, [state.hasResearch, goToStep]);

  const loadDraft = (draft: Draft) => {
    updateState({
      generatedEmail: { subject: draft.subject, body: draft.body },
      editedSubject: draft.subject,
      editedBody: draft.body,
      currentDraftId: draft.id,
      step: 4,
    });
    setShowDrafts(false);
  };

  return (
    <div className="min-h-screen">
      {/* Progress Steps Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Create Outreach</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Step {state.step} of 4
            </p>
          </div>
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
            aria-label={`View drafts (${drafts.length} saved)`}
          >
            <span className="hidden sm:inline">Drafts</span>
            <span className="sm:hidden">📝</span>
            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-xs">{drafts.length}</span>
          </button>
        </div>

        {/* Step Indicators */}
        <nav aria-label="Progress steps">
          <ol className="flex items-center gap-1 sm:gap-2">
            {[1, 2, 3, 4].map((stepNum) => {
              const stepLabels = ['Company', 'Research', 'Recipient', 'Email'];
              const stepLabel = stepLabels[stepNum - 1];
              const isCurrent = stepNum === state.step;
              const isComplete = stepNum < state.step;

              return (
                <li key={stepNum} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-500 text-white'
                        : isComplete
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isComplete ? '✓' : stepNum}
                  </div>
                  <span className={`ml-1.5 sm:ml-2 text-xs sm:text-sm hidden sm:block ${
                    isCurrent ? 'text-slate-900 font-medium' : 'text-slate-500'
                  }`}>
                    {stepLabel}
                  </span>
                  {/* Mobile: show label only for current step */}
                  {isCurrent && (
                    <span className="ml-1.5 text-xs text-slate-900 font-medium sm:hidden">
                      {stepLabel}
                    </span>
                  )}
                  {stepNum < 4 && (
                    <div className={`flex-1 h-0.5 mx-1.5 sm:mx-3 rounded ${
                      isComplete ? 'bg-emerald-200' : 'bg-slate-200'
                    }`} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      {/* Error/Success Alerts */}
      {(error || success) && (
        <div className="px-4 sm:px-8 pt-4">
          {error && (
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
              role="alert"
            >
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {state.step === 4 && (
                  <button
                    onClick={handleGenerateEmail}
                    disabled={generating}
                    className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => setError(null)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  aria-label="Dismiss error"
                >
                  <span aria-hidden="true" className="text-lg">&times;</span>
                </button>
              </div>
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700"
              role="status"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                aria-label="Dismiss message"
              >
                <span aria-hidden="true" className="text-lg">&times;</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drafts Sidebar */}
      {showDrafts && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drafts-title">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowDrafts(false)}
            aria-label="Close drafts panel"
          />
          <div className="relative w-full sm:w-96 bg-white h-full shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 id="drafts-title" className="font-semibold text-slate-900">Saved Drafts</h3>
              <button
                onClick={() => setShowDrafts(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close drafts"
              >
                <span aria-hidden="true" className="text-xl">&times;</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {drafts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No drafts saved yet</p>
              ) : (
                drafts.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => loadDraft(draft)}
                    className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <p className="font-medium text-slate-900 text-sm truncate">{draft.subject}</p>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{draft.body}</p>
                    <p className="text-slate-400 text-xs mt-2">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          {state.step === 1 && (
            <CompanySelectStep
              selectedCompany={state.selectedCompany}
              onCompanySelect={handleCompanySelect}
              onCompanyClear={handleCompanyClear}
              onNext={handleNextFromStep1}
              checkingResearch={state.checkingResearch}
              hasResearch={state.hasResearch}
            />
          )}

          {state.step === 2 && (
            <ResearchCheckStep
              company={state.selectedCompany}
              hasResearch={state.hasResearch}
              researchData={state.researchData}
              onResearchNow={handleResearchNow}
              onSkip={handleSkipResearch}
              onContinue={handleContinueFromStep2}
              onBack={() => handleBackFromStep(2)}
            />
          )}

          {state.step === 3 && (
            <RecipientSelectStep
              company={state.selectedCompany}
              contacts={state.contacts}
              loadingContacts={state.loadingContacts}
              selectedContact={state.selectedContact}
              selectedPersona={state.selectedPersona}
              selectedTone={state.selectedTone}
              onContactSelect={handleContactSelect}
              onPersonaChange={handlePersonaChange}
              onToneChange={handleToneChange}
              onGenerate={handleGenerateEmail}
              onBack={() => handleBackFromStep(3)}
              generating={generating}
            />
          )}

          {state.step === 4 && (
            <EmailEditorStep
              company={state.selectedCompany}
              contact={state.selectedContact}
              subject={state.editedSubject}
              body={state.editedBody}
              onSubjectChange={handleEditSubject}
              onBodyChange={handleEditBody}
              onBack={() => handleBackFromStep(4)}
              onSaveDraft={handleSaveDraft}
              onRegenerate={handleGenerateEmail}
              onSend={handleSendEmail}
              saving={saving}
              sending={sending}
              generating={generating}
              hasChanges={
                state.generatedEmail !== null && (
                  state.editedSubject !== state.generatedEmail.subject ||
                  state.editedBody !== state.generatedEmail.body
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
