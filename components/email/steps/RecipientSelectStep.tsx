'use client';

import { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Sparkles,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { mapGhlPersonaToInternal, getPersonaDisplayName } from '@/lib/utils/personaMapping';
import type { GHLCompany, Contact } from '../OutreachWizard';

interface RecipientSelectStepProps {
  company: GHLCompany | null;
  contacts: Contact[];
  loadingContacts: boolean;
  selectedContact: Contact | null;
  selectedPersona: string;
  selectedTone: string;
  onContactSelect: (contact: Contact | null) => void;
  onPersonaChange: (persona: string) => void;
  onToneChange: (tone: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  generating: boolean;
}

const personas = [
  { id: 'cfo_finance', label: 'CFO / Finance' },
  { id: 'ceo_gm', label: 'CEO / GM' },
  { id: 'pricing_rgm', label: 'Pricing / RGM' },
  { id: 'sales_commercial', label: 'Sales / Commercial' },
  { id: 'technology_analytics', label: 'Technology / Analytics' },
];

const tones = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'direct', label: 'Direct' },
  { id: 'consultative', label: 'Consultative' },
];

export function RecipientSelectStep({
  company,
  contacts,
  loadingContacts,
  selectedContact,
  selectedPersona,
  selectedTone,
  onContactSelect,
  onPersonaChange,
  onToneChange,
  onGenerate,
  onBack,
  generating,
}: RecipientSelectStepProps) {
  const [focusedContactIndex, setFocusedContactIndex] = useState(-1);
  const contactListRef = useRef<HTMLDivElement>(null);

  // Get contacts with email (selectable)
  const selectableContacts = contacts.filter(c => c.email);

  const handleContactClick = (contact: Contact) => {
    if (!contact.email) return;
    onContactSelect(contact);
    // Auto-detect persona from contact
    if (contact.persona) {
      const mappedPersona = mapGhlPersonaToInternal(contact.persona);
      if (mappedPersona) {
        onPersonaChange(mappedPersona);
      }
    }
  };

  // Scroll focused contact into view
  useEffect(() => {
    if (focusedContactIndex >= 0 && contactListRef.current) {
      const items = contactListRef.current.querySelectorAll('[role="option"]');
      const focusedItem = items[focusedContactIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedContactIndex]);

  // Keyboard navigation for contact list
  const handleContactKeyDown = (e: React.KeyboardEvent) => {
    if (selectableContacts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedContactIndex(prev =>
          prev < selectableContacts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedContactIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedContactIndex >= 0 && selectableContacts[focusedContactIndex]) {
          handleContactClick(selectableContacts[focusedContactIndex]);
        }
        break;
    }
  };

  const hasContactsWithEmail = contacts.some(c => c.email);

  return (
    <div className="space-y-6">
      {/* Contact Selection */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Select Recipient</h3>
            <p className="text-sm text-slate-500">
              {company?.companyName ? `Contacts from ${company.companyName}` : 'Choose who to reach out to'}
            </p>
          </div>
        </div>

        {loadingContacts ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-slate-500">Loading contacts...</span>
          </div>
        ) : contacts.length > 0 ? (
          <div
            ref={contactListRef}
            role="listbox"
            aria-label="Select a contact"
            tabIndex={0}
            onKeyDown={handleContactKeyDown}
            className="space-y-2 max-h-60 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl"
          >
            {contacts.map((contact, index) => {
              const hasEmail = !!contact.email;
              const mappedPersona = mapGhlPersonaToInternal(contact.persona);
              const isSelected = selectedContact?.id === contact.id;
              const selectableIndex = selectableContacts.findIndex(c => c.id === contact.id);
              const isFocused = selectableIndex === focusedContactIndex;

              return (
                <div
                  key={contact.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!hasEmail}
                  tabIndex={-1}
                  onClick={() => hasEmail && handleContactClick(contact)}
                  onMouseEnter={() => hasEmail && setFocusedContactIndex(selectableIndex)}
                  className={`w-full p-3 sm:p-4 rounded-xl text-left transition-all flex items-center justify-between min-h-[56px] ${
                    isSelected
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-500 ring-offset-2'
                      : hasEmail
                        ? isFocused
                          ? 'bg-indigo-50 ring-2 ring-indigo-300'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer'
                        : 'bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Email status indicator */}
                    {hasEmail ? (
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                        isSelected ? 'text-white' : 'text-emerald-500'
                      }`} aria-hidden="true" />
                    ) : (
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                        isSelected ? 'text-white/70' : 'text-amber-400'
                      }`} aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium block truncate">{contact.name}</span>
                      {contact.email ? (
                        <span className={`text-sm block truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          {contact.email}
                        </span>
                      ) : (
                        <span className={`text-sm ${
                          isSelected ? 'text-white/60' : 'text-amber-500'
                        }`}>
                          No email address
                        </span>
                      )}
                    </div>
                  </div>
                  {contact.persona && (
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 hidden sm:block ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : mappedPersona
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-200 text-slate-600'
                    }`}>
                      {mappedPersona ? getPersonaDisplayName(mappedPersona) : contact.persona}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-slate-600 font-medium">No contacts found</p>
            <p className="text-sm text-slate-500 mt-1">
              No contacts were found for this company in GHL.<br className="hidden sm:block" />
              You can still generate an email using persona targeting.
            </p>
          </div>
        )}

        {!hasContactsWithEmail && contacts.length > 0 && (
          <div className="text-amber-600 text-sm mt-3 flex items-center gap-2 p-3 bg-amber-50 rounded-lg" role="alert">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>None of the contacts have email addresses.</span>
          </div>
        )}

        {/* Keyboard hint for contacts */}
        {selectableContacts.length > 0 && (
          <p className="text-xs text-slate-400 mt-3 hidden sm:block">
            Use arrow keys to navigate contacts, Enter to select
          </p>
        )}
      </div>

      {/* Persona Selection */}
      <div className="card p-4 sm:p-6" id="persona-select">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <label id="persona-label" className="font-semibold text-slate-900 block">
              Target Persona
            </label>
            <p className="text-sm text-slate-500">
              {selectedContact?.persona ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Auto-detected from contact
                </span>
              ) : (
                'Who are you reaching out to?'
              )}
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="persona-label"
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {personas.map((persona) => (
            <button
              key={persona.id}
              role="radio"
              aria-checked={selectedPersona === persona.id}
              onClick={() => onPersonaChange(persona.id)}
              className={`p-3 rounded-xl text-sm font-medium text-left transition-all min-h-[48px] ${
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
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <label id="tone-label" className="font-semibold text-slate-900 block">
              Email Tone
            </label>
            <p className="text-sm text-slate-500">Set the communication style</p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="tone-label"
          className="flex flex-wrap gap-2"
        >
          {tones.map((tone) => (
            <button
              key={tone.id}
              role="radio"
              aria-checked={selectedTone === tone.id}
              onClick={() => onToneChange(tone.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
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

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 order-2 sm:order-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 min-h-[48px] order-1 sm:order-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Email
            </>
          )}
        </button>
      </div>

      {/* Info Note */}
      {!selectedContact && (
        <p className="text-center text-sm text-slate-500 px-4">
          No contact selected? The email will be generated for the <strong>{personas.find(p => p.id === selectedPersona)?.label}</strong> persona.
        </p>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {selectedContact && `Selected contact: ${selectedContact.name}`}
      </div>
    </div>
  );
}
