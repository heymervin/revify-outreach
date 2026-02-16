'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Key,
  Link as LinkIcon,
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Loader2,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Copy,
} from 'lucide-react';
import { GHLAccountsSection } from '@/components/settings/GHLAccountsSection';
import { ModelConfigSection } from '@/components/settings/ModelConfigSection';
import { Sparkles } from 'lucide-react';

const tabs = [
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'models', label: 'AI Models', icon: Sparkles },
  { id: 'prompts', label: 'Prompts', icon: FileText },
  { id: 'ghl', label: 'GoHighLevel', icon: LinkIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

interface PromptTemplate {
  id: string;
  name: string;
  type: 'research' | 'email';
  content: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const apiProviders = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', required: true },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AI...', required: false },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', required: false },
  { id: 'tavily', name: 'Tavily', placeholder: 'tvly-...', required: false },
  { id: 'apollo', name: 'Apollo.io', placeholder: 'Your Apollo API key', required: false },
];

export default function SettingsPage() {
  // Use ref to prevent re-creating Supabase client and duplicate fetches
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const hasFetched = useRef(false);

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const validTabs = tabs.map((t) => t.id);
  const [activeTab, setActiveTab] = useState(
    initialTab && validTabs.includes(initialTab) ? initialTab : 'api-keys'
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, { value: string; hint: string; show: boolean }>>({
    openai: { value: '', hint: '', show: false },
    gemini: { value: '', hint: '', show: false },
    anthropic: { value: '', hint: '', show: false },
    tavily: { value: '', hint: '', show: false },
    apollo: { value: '', hint: '', show: false },
  });

  // GHL state
  const [ghlConfig, setGhlConfig] = useState({
    location_id: '',
  });
  const [ghlApiKey, setGhlApiKey] = useState({ value: '', hint: '', show: false });

  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
  });

  // Prompts state
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<{
    research: { content: string; variables: string[] };
    email: { content: string; variables: string[] };
  } | null>(null);
  const [promptModal, setPromptModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    prompt: Partial<PromptTemplate> | null;
  }>({ open: false, mode: 'create', prompt: null });
  const [promptSaving, setPromptSaving] = useState(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadSettings();
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      if (data.success) {
        setPrompts(data.prompts);
        setDefaultPrompts(data.defaults);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const savePrompt = async () => {
    if (!promptModal.prompt?.name || !promptModal.prompt?.type || !promptModal.prompt?.content) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setPromptSaving(true);
    try {
      const url = promptModal.mode === 'edit' && promptModal.prompt.id
        ? `/api/prompts/${promptModal.prompt.id}`
        : '/api/prompts';

      const res = await fetch(url, {
        method: promptModal.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptModal.prompt),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Prompt ${promptModal.mode === 'edit' ? 'updated' : 'created'} successfully` });
        setPromptModal({ open: false, mode: 'create', prompt: null });
        loadPrompts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save prompt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save prompt' });
    } finally {
      setPromptSaving(false);
    }
  };

  const deletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Prompt deleted' });
        loadPrompts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete prompt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete prompt' });
    }
  };

  const setDefaultPrompt = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Default prompt updated' });
        loadPrompts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to set default' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to set default' });
    }
  };

  const duplicatePrompt = (prompt: PromptTemplate) => {
    setPromptModal({
      open: true,
      mode: 'create',
      prompt: {
        name: `${prompt.name} (Copy)`,
        type: prompt.type,
        content: prompt.content,
        is_default: false,
      },
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[Settings] Auth user:', user?.id, 'Error:', userError);
      if (!user) return;

      // Load user profile
      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single();

      console.log('[Settings] User data:', userData, 'Error:', profileError);

      if (userData) {
        setProfile({
          full_name: userData.full_name || '',
          email: userData.email,
        });

        // Load API keys (hints only)
        const { data: keys, error: keysError } = await supabase
          .from('api_keys')
          .select('provider, key_hint')
          .eq('organization_id', userData.organization_id);

        console.log('[Settings] API keys:', keys, 'Error:', keysError);

        if (keys) {
          const keyState = { ...apiKeys };
          keys.forEach((key) => {
            if (keyState[key.provider]) {
              keyState[key.provider] = {
                ...keyState[key.provider],
                hint: key.key_hint || '',
              };
            }
            // Handle GHL API key separately
            if (key.provider === 'ghl') {
              setGhlApiKey((prev) => ({ ...prev, hint: key.key_hint || '' }));
            }
          });
          setApiKeys(keyState);
        }

        // Load GHL config
        const { data: ghl, error: ghlError } = await supabase
          .from('ghl_config')
          .select('*')
          .eq('organization_id', userData.organization_id)
          .single();

        console.log('[Settings] GHL config:', ghl, 'Error:', ghlError);

        if (ghl) {
          setGhlConfig({
            location_id: ghl.location_id || '',
          });
        }
      }
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string, value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    setSaving(true);
    setMessage(null);

    try {
      // Use server-side API endpoint for encryption
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: trimmedValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      setApiKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], value: '', hint: data.hint },
      }));

      setMessage({ type: 'success', text: data.message || `${provider} API key saved successfully` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  const saveGHLConfig = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) throw new Error('No organization');

      const trimmedLocationId = ghlConfig.location_id.trim();
      if (!trimmedLocationId) {
        throw new Error('Location ID cannot be empty');
      }

      await supabase.from('ghl_config').upsert(
        {
          organization_id: userData.organization_id,
          location_id: trimmedLocationId,
        },
        { onConflict: 'organization_id' }
      );

      setMessage({ type: 'success', text: 'GoHighLevel settings saved' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save GHL settings' });
    } finally {
      setSaving(false);
    }
  };

  const saveGHLApiKey = async () => {
    const trimmedValue = ghlApiKey.value.trim();
    if (!trimmedValue) return;

    setSaving(true);
    setMessage(null);

    try {
      // Use server-side API endpoint for encryption
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ghl', key: trimmedValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save GHL API key');
      }

      setGhlApiKey((prev) => ({ ...prev, value: '', hint: data.hint }));
      setMessage({ type: 'success', text: data.message || 'GHL API key saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save GHL API key' });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('users')
        .update({ full_name: profile.full_name })
        .eq('id', user.id);

      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and integrations</p>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message.text}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">API Keys</h3>
                  <p className="text-sm text-slate-500">Connect your AI providers</p>
                </div>
              </div>

              <div className="space-y-6">
                {apiProviders.map((provider) => (
                  <div key={provider.id} className="space-y-2">
                    <label className="flex items-center gap-2">
                      <span className="label mb-0">{provider.name}</span>
                      {provider.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                      {apiKeys[provider.id]?.hint && !apiKeys[provider.id]?.value && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Key saved
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      {/* SAVED STATE: Show masked value with Change button */}
                      {apiKeys[provider.id]?.hint && !apiKeys[provider.id]?.value ? (
                        <>
                          <input
                            type="text"
                            value={`••••••••••••${apiKeys[provider.id].hint}`}
                            disabled
                            className="input flex-1 bg-slate-100 text-slate-600 cursor-not-allowed"
                          />
                          <button
                            onClick={() =>
                              setApiKeys((prev) => ({
                                ...prev,
                                [provider.id]: { ...prev[provider.id], value: ' ' }, // Set to space to trigger edit mode, will be trimmed
                              }))
                            }
                            className="btn-secondary px-4"
                          >
                            Change
                          </button>
                        </>
                      ) : (
                        /* EDITING STATE: Show editable input with Save button */
                        <>
                          <div className="relative flex-1">
                            <input
                              type={apiKeys[provider.id]?.show ? 'text' : 'password'}
                              value={apiKeys[provider.id]?.value === ' ' ? '' : (apiKeys[provider.id]?.value || '')}
                              onChange={(e) =>
                                setApiKeys((prev) => ({
                                  ...prev,
                                  [provider.id]: { ...prev[provider.id], value: e.target.value },
                                }))
                              }
                              className="input pr-10"
                              placeholder={provider.placeholder}
                              autoFocus={apiKeys[provider.id]?.hint ? true : undefined}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setApiKeys((prev) => ({
                                  ...prev,
                                  [provider.id]: { ...prev[provider.id], show: !prev[provider.id].show },
                                }))
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {apiKeys[provider.id]?.show ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {apiKeys[provider.id]?.hint && (
                            <button
                              onClick={() =>
                                setApiKeys((prev) => ({
                                  ...prev,
                                  [provider.id]: { ...prev[provider.id], value: '' }, // Cancel edit
                                }))
                              }
                              className="btn-secondary px-4"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => saveApiKey(provider.id, apiKeys[provider.id]?.value?.trim() || '')}
                            disabled={saving || !apiKeys[provider.id]?.value?.trim()}
                            className="btn-primary px-4 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Your keys are secure</p>
                    <p>API keys are encrypted and stored securely. We never share them with third parties.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Models Tab */}
          {activeTab === 'models' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">AI Model Configuration</h3>
                  <p className="text-sm text-slate-500">Choose which AI models to use for different operations</p>
                </div>
              </div>

              <ModelConfigSection />
            </div>
          )}

          {/* Prompts Tab */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Prompt Templates</h3>
                      <p className="text-sm text-slate-500">Customize prompts for research and email generation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPromptModal({ open: true, mode: 'create', prompt: { type: 'research', is_default: false } })}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Create Prompt
                  </button>
                </div>

                {/* Research Prompts */}
                <div className="mb-8">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Research Prompts
                  </h4>
                  <div className="space-y-3">
                    {prompts.filter(p => p.type === 'research').length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                        No custom research prompts. Using system default.
                        <button
                          onClick={() => setPromptModal({
                            open: true,
                            mode: 'create',
                            prompt: {
                              name: 'My Research Prompt',
                              type: 'research',
                              content: defaultPrompts?.research.content || '',
                              is_default: true,
                            },
                          })}
                          className="block mx-auto mt-2 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Create from default template
                        </button>
                      </div>
                    ) : (
                      prompts.filter(p => p.type === 'research').map((prompt) => (
                        <div
                          key={prompt.id}
                          className="p-4 bg-slate-50 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{prompt.name}</span>
                              {prompt.is_default && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Variables: {prompt.variables.map(v => `{${v}}`).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!prompt.is_default && (
                              <button
                                onClick={() => setDefaultPrompt(prompt.id)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Set as default"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => duplicatePrompt(prompt)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPromptModal({ open: true, mode: 'edit', prompt })}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Email Prompts */}
                <div>
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Email Prompts
                  </h4>
                  <div className="space-y-3">
                    {prompts.filter(p => p.type === 'email').length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                        No custom email prompts. Using system default.
                        <button
                          onClick={() => setPromptModal({
                            open: true,
                            mode: 'create',
                            prompt: {
                              name: 'My Email Prompt',
                              type: 'email',
                              content: defaultPrompts?.email.content || '',
                              is_default: true,
                            },
                          })}
                          className="block mx-auto mt-2 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Create from default template
                        </button>
                      </div>
                    ) : (
                      prompts.filter(p => p.type === 'email').map((prompt) => (
                        <div
                          key={prompt.id}
                          className="p-4 bg-slate-50 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{prompt.name}</span>
                              {prompt.is_default && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Variables: {prompt.variables.map(v => `{${v}}`).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!prompt.is_default && (
                              <button
                                onClick={() => setDefaultPrompt(prompt.id)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Set as default"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => duplicatePrompt(prompt)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPromptModal({ open: true, mode: 'edit', prompt })}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Available Variables Reference */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h4 className="font-semibold text-slate-700 mb-3">Available Variables</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Research Prompts</p>
                    <div className="flex flex-wrap gap-2">
                      {defaultPrompts?.research.variables.map((v) => (
                        <code key={v} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                          {`{${v}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Email Prompts</p>
                    <div className="flex flex-wrap gap-2">
                      {defaultPrompts?.email.variables.map((v) => (
                        <code key={v} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                          {`{${v}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Modal */}
          {promptModal.open && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="font-bold text-lg text-slate-900">
                    {promptModal.mode === 'edit' ? 'Edit Prompt' : 'Create Prompt'}
                  </h3>
                  <button
                    onClick={() => setPromptModal({ open: false, mode: 'create', prompt: null })}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <div className="space-y-4">
                    <div>
                      <label className="label">Name</label>
                      <input
                        type="text"
                        value={promptModal.prompt?.name || ''}
                        onChange={(e) => setPromptModal({
                          ...promptModal,
                          prompt: { ...promptModal.prompt, name: e.target.value },
                        })}
                        className="input"
                        placeholder="My Custom Prompt"
                      />
                    </div>

                    <div>
                      <label className="label">Type</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setPromptModal({
                            ...promptModal,
                            prompt: { ...promptModal.prompt, type: 'research' },
                          })}
                          className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                            promptModal.prompt?.type === 'research'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Research
                        </button>
                        <button
                          onClick={() => setPromptModal({
                            ...promptModal,
                            prompt: { ...promptModal.prompt, type: 'email' },
                          })}
                          className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                            promptModal.prompt?.type === 'email'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Email
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label">Prompt Content</label>
                      <textarea
                        value={promptModal.prompt?.content || ''}
                        onChange={(e) => setPromptModal({
                          ...promptModal,
                          prompt: { ...promptModal.prompt, content: e.target.value },
                        })}
                        className="input min-h-[300px] font-mono text-sm"
                        placeholder="Enter your prompt template..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use {'{variable_name}'} for dynamic values. Available: {
                          promptModal.prompt?.type === 'research'
                            ? defaultPrompts?.research.variables.map(v => `{${v}}`).join(', ')
                            : defaultPrompts?.email.variables.map(v => `{${v}}`).join(', ')
                        }
                      </p>
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={promptModal.prompt?.is_default || false}
                        onChange={(e) => setPromptModal({
                          ...promptModal,
                          prompt: { ...promptModal.prompt, is_default: e.target.checked },
                        })}
                        className="w-5 h-5 rounded text-emerald-500"
                      />
                      <div>
                        <p className="font-medium text-slate-900">Set as default</p>
                        <p className="text-sm text-slate-500">Use this prompt automatically for all {promptModal.prompt?.type} requests</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                  <button
                    onClick={() => setPromptModal({ open: false, mode: 'create', prompt: null })}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePrompt}
                    disabled={promptSaving || !promptModal.prompt?.name || !promptModal.prompt?.content}
                    className="btn-primary disabled:opacity-50"
                  >
                    {promptSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {promptModal.mode === 'edit' ? 'Update Prompt' : 'Create Prompt'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GHL Tab */}
          {activeTab === 'ghl' && (
            <div className="space-y-6">
              {/* GHL Accounts Management */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">GoHighLevel Accounts</h3>
                    <p className="text-sm text-slate-500">Each account has its own Location ID and API key</p>
                  </div>
                </div>

                <GHLAccountsSection />
              </div>

              {/* DEPRECATED: Old shared GHL API Key section - hidden since API keys are now per-account */}
              {false && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">GHL API Key</h3>
                    <p className="text-sm text-slate-500">Private Integration Token for API access</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    This API key is shared across all your GHL accounts above. It authenticates your
                    organization with GoHighLevel &mdash; individual accounts are identified by their Location ID.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <span className="label mb-0">API Key</span>
                      {ghlApiKey.hint && !ghlApiKey.value && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Key saved
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      {ghlApiKey.hint && !ghlApiKey.value ? (
                        <>
                          <input
                            type="text"
                            value={`••••••••••••${ghlApiKey.hint}`}
                            disabled
                            className="input flex-1 bg-slate-100 text-slate-600 cursor-not-allowed"
                          />
                          <button
                            onClick={() => setGhlApiKey((prev) => ({ ...prev, value: ' ' }))}
                            className="btn-secondary px-4"
                          >
                            Change
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="relative flex-1">
                            <input
                              type={ghlApiKey.show ? 'text' : 'password'}
                              value={ghlApiKey.value === ' ' ? '' : (ghlApiKey.value || '')}
                              onChange={(e) => setGhlApiKey((prev) => ({ ...prev, value: e.target.value }))}
                              className="input pr-10"
                              placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                              autoFocus={ghlApiKey.hint ? true : undefined}
                            />
                            <button
                              type="button"
                              onClick={() => setGhlApiKey((prev) => ({ ...prev, show: !prev.show }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {ghlApiKey.show ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {ghlApiKey.hint && (
                            <button
                              onClick={() => setGhlApiKey((prev) => ({ ...prev, value: '' }))}
                              className="btn-secondary px-4"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={saveGHLApiKey}
                            disabled={saving || !ghlApiKey.value?.trim()}
                            className="btn-primary px-4 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Get your Private Integration Token from GHL Settings &rarr; API Keys
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Profile</h3>
                  <p className="text-sm text-slate-500">Your account information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="input"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    className="input bg-slate-50"
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Billing & Subscription</h3>
                  <p className="text-sm text-slate-500">Manage your plan and credits</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <p className="text-slate-600 mb-4">
                  Billing features coming soon. Currently using the free tier.
                </p>
                <p className="text-sm text-slate-500">
                  Contact support for enterprise plans.
                </p>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Notifications</h3>
                  <p className="text-sm text-slate-500">Manage your notification preferences</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Low credit alerts</p>
                    <p className="text-sm text-slate-500">Get notified when credits are running low</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-emerald-500" />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Research completed</p>
                    <p className="text-sm text-slate-500">Email when bulk research finishes</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded text-emerald-500" />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">Product updates</p>
                    <p className="text-sm text-slate-500">New features and improvements</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-emerald-500" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
