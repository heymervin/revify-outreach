import React, { useState } from 'react';
import { Search, Loader2, Globe, Factory, Zap, Brain, Users, RefreshCw, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { executeResearchV3_1 } from '../../services/researchServiceV3_1';
import { ResearchInputV3_1, ResearchOutputV3_1 } from '../../types/researchTypesV3_1';
import { GHLContactInfo } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import GHLCompanySelector, { CompanySource, GHLCompanyData } from '../GHLCompanySelector';
import { GHLService } from '../../services/ghlService';

const ResearchFormV3_1: React.FC = () => {
  const { addSession } = useApp();
  const { addUsageRecord, ...settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressMessage, setProgressMessage] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    researchDepth: 'standard' as 'standard' | 'deep'
  });
  const [companySource, setCompanySource] = useState<CompanySource>('manual');
  const [ghlContacts, setGhlContacts] = useState<GHLContactInfo[]>([]);
  const [ghlRecordId, setGhlRecordId] = useState<string | null>(null);
  const [existingResearch, setExistingResearch] = useState<ResearchOutputV3_1 | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  // Load existing research from GHL
  const handleLoadExistingResearch = () => {
    if (!existingResearch) return;

    setLoadingExisting(true);
    try {
      // Save to session history using the existing research
      addSession({
        id: uuidv4(),
        timestamp: Date.now(),
        companyName: formData.companyName.trim(),
        website: formData.website.trim() || '',
        industry: formData.industry.trim(),
        format: 'v3_1',
        v3_1Data: existingResearch,
        ghlContacts: ghlContacts.length > 0 ? ghlContacts : undefined
      });

      // Clear form on success
      setFormData({ companyName: '', website: '', industry: '', researchDepth: 'standard' });
      setGhlContacts([]);
      setGhlRecordId(null);
      setExistingResearch(null);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.industry.trim()) {
      setError('Industry is required');
      return;
    }

    // Check for required API key
    if (!settings.apiKeys?.openai) {
      setError('OpenAI API key required. Add it in Settings → API Keys.');
      return;
    }

    setError('');
    setLoading(true);
    setProgressMessage('Initializing...');

    try {
      const input: ResearchInputV3_1 = {
        companyName: formData.companyName.trim(),
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim(),
        researchDepth: formData.researchDepth
      };

      const result = await executeResearchV3_1(
        input,
        settings.apiKeys.openai,
        (msg) => setProgressMessage(msg)
      );

      // Save to session history
      addSession({
        id: uuidv4(),
        timestamp: Date.now(),
        companyName: input.companyName,
        website: input.website || '',
        industry: input.industry,
        format: 'v3_1',
        v3_1Data: result,
        ghlContacts: ghlContacts.length > 0 ? ghlContacts : undefined,
        ghlRecordId: ghlRecordId || undefined
      });

      // Record token usage
      addUsageRecord({
        provider: 'openai',
        model: formData.researchDepth === 'deep' ? 'o1' : 'gpt-4o',
        taskType: 'research',
        usage: {
          inputTokens: 5000,
          outputTokens: 2000,
          totalTokens: 7000
        }
      });

      // Clear form on success
      setFormData({ companyName: '', website: '', industry: '', researchDepth: 'standard' });
      setGhlContacts([]);
      setGhlRecordId(null);
      setExistingResearch(null);

    } catch (err) {
      console.error('V3.1 Research failed:', err);
      setError(err instanceof Error ? err.message : 'Research failed. Please try again.');
    } finally {
      setLoading(false);
      setProgressMessage('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Research Intelligence</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            V3.1
          </span>
        </div>
        <p className="text-slate-500 text-sm">
          AI-powered web search finds intent signals, firmographics, and recent news. Single API, better results.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Company Name */}
          <GHLCompanySelector
            value={formData.companyName}
            onChange={(companyName, data?: GHLCompanyData) => {
              setFormData(prev => ({
                ...prev,
                companyName,
                website: data?.website || prev.website,
                industry: data?.industry || prev.industry
              }));
              // Store contacts from GHL if available
              if (data?.contacts) {
                setGhlContacts(data.contacts.map(c => ({
                  id: c.id,
                  name: c.name,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  email: c.email,
                  phone: c.phone,
                  title: c.title
                })));
              } else if (!companyName) {
                setGhlContacts([]);
              }
              // Store GHL record ID for saving research back
              if (data?.ghlRecordId) {
                setGhlRecordId(data.ghlRecordId);
              } else {
                setGhlRecordId(null);
              }
              // Parse existing research if available
              if (data?.companyResearch) {
                try {
                  const parsed = JSON.parse(data.companyResearch) as ResearchOutputV3_1;
                  setExistingResearch(parsed);
                } catch (err) {
                  console.warn('Failed to parse existing research:', err);
                  setExistingResearch(null);
                }
              } else {
                setExistingResearch(null);
              }
            }}
            disabled={loading}
            source={companySource}
            onSourceChange={setCompanySource}
          />

          {/* Industry */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
              <Factory className="w-4 h-4 mr-1.5 text-slate-400" />
              Industry <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              placeholder="e.g., Industrial Manufacturing"
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-colors disabled:bg-slate-100"
            />
          </div>

          {/* Website */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-1.5">
              <Globe className="w-4 h-4 mr-1.5 text-slate-400" />
              Website <span className="text-slate-400 ml-1">(recommended)</span>
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="e.g., scovill.com"
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-colors disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* GHL Contacts Display */}
        {ghlContacts.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">
              {ghlContacts.length} contact{ghlContacts.length !== 1 ? 's' : ''} from GHL:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ghlContacts.slice(0, 5).map((contact) => (
                <span
                  key={contact.id}
                  className="px-2 py-0.5 bg-white text-purple-700 text-xs rounded border border-purple-200"
                  title={contact.email || contact.phone || ''}
                >
                  {contact.name}
                </span>
              ))}
              {ghlContacts.length > 5 && (
                <span className="px-2 py-0.5 text-purple-500 text-xs">
                  +{ghlContacts.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Existing Research from GHL */}
        {existingResearch && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Existing research found in GHL
              </span>
              <span className="text-xs text-green-600">
                ({existingResearch.company_profile?.confirmed_name || 'Saved'})
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadExistingResearch}
              disabled={loadingExisting || loading}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingExisting ? (
                <>
                  <Loader2 className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="-ml-0.5 mr-1.5 h-3.5 w-3.5" />
                  Load Research
                </>
              )}
            </button>
          </div>
        )}

        {/* Research Depth Toggle */}
        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-600">Research Depth:</span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, researchDepth: 'standard' }))}
              disabled={loading}
              className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${
                formData.researchDepth === 'standard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Standard
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, researchDepth: 'deep' }))}
              disabled={loading}
              className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${
                formData.researchDepth === 'deep'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              Deep (o1)
            </button>
          </div>
          <span className="text-xs text-slate-400">
            {formData.researchDepth === 'deep' ? '~$0.30-0.40' : '~$0.20-0.25'}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm flex items-center">
              <span className="w-1 h-1 bg-red-500 rounded-full mr-2" />
              {error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs text-slate-400">
              OpenAI Web Search • {previousYear}-{currentYear} data • Intent signal detection
            </p>
            {loading && progressMessage && (
              <p className="text-xs text-blue-600 mt-1 animate-pulse">
                {progressMessage}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Researching...
              </>
            ) : (
              <>
                <Search className="-ml-1 mr-2 h-4 w-4" />
                Start Research
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResearchFormV3_1;
