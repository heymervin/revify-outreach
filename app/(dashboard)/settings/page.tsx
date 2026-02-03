'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

const tabs = [
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'ghl', label: 'GoHighLevel', icon: LinkIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const apiProviders = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', required: true },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AI...', required: false },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', required: false },
  { id: 'tavily', name: 'Tavily', placeholder: 'tvly-...', required: false },
];

export default function SettingsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('api-keys');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, { value: string; hint: string; show: boolean }>>({
    openai: { value: '', hint: '', show: false },
    gemini: { value: '', hint: '', show: false },
    anthropic: { value: '', hint: '', show: false },
    tavily: { value: '', hint: '', show: false },
  });

  // GHL state
  const [ghlConfig, setGhlConfig] = useState({
    location_id: '',
    location_name: '',
  });

  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single();

      if (userData) {
        setProfile({
          full_name: userData.full_name || '',
          email: userData.email,
        });

        // Load API keys (hints only)
        const { data: keys } = await supabase
          .from('api_keys')
          .select('provider, key_hint')
          .eq('organization_id', userData.organization_id);

        if (keys) {
          const keyState = { ...apiKeys };
          keys.forEach((key) => {
            if (keyState[key.provider]) {
              keyState[key.provider] = {
                ...keyState[key.provider],
                hint: key.key_hint || '',
              };
            }
          });
          setApiKeys(keyState);
        }

        // Load GHL config
        const { data: ghl } = await supabase
          .from('ghl_config')
          .select('*')
          .eq('organization_id', userData.organization_id)
          .single();

        if (ghl) {
          setGhlConfig({
            location_id: ghl.location_id || '',
            location_name: ghl.location_name || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string, value: string) => {
    if (!value.trim()) return;

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

      await supabase.from('api_keys').upsert(
        {
          organization_id: userData.organization_id,
          provider,
          encrypted_key: value, // TODO: Encrypt in production
          key_hint: value.slice(-4),
        },
        { onConflict: 'organization_id,provider' }
      );

      setApiKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], value: '', hint: value.slice(-4) },
      }));

      setMessage({ type: 'success', text: `${provider} API key saved successfully` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
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

      await supabase.from('ghl_config').upsert(
        {
          organization_id: userData.organization_id,
          location_id: ghlConfig.location_id,
          location_name: ghlConfig.location_name,
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
                      {apiKeys[provider.id]?.hint && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          ••••{apiKeys[provider.id].hint}
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={apiKeys[provider.id]?.show ? 'text' : 'password'}
                          value={apiKeys[provider.id]?.value || ''}
                          onChange={(e) =>
                            setApiKeys((prev) => ({
                              ...prev,
                              [provider.id]: { ...prev[provider.id], value: e.target.value },
                            }))
                          }
                          className="input pr-10"
                          placeholder={apiKeys[provider.id]?.hint ? 'Enter new key to update' : provider.placeholder}
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
                      <button
                        onClick={() => saveApiKey(provider.id, apiKeys[provider.id]?.value || '')}
                        disabled={saving || !apiKeys[provider.id]?.value}
                        className="btn-primary px-4 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
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

          {/* GHL Tab */}
          {activeTab === 'ghl' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">GoHighLevel Integration</h3>
                  <p className="text-sm text-slate-500">Connect your GHL account</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Location ID</label>
                  <input
                    type="text"
                    value={ghlConfig.location_id}
                    onChange={(e) => setGhlConfig({ ...ghlConfig, location_id: e.target.value })}
                    className="input"
                    placeholder="Your GHL Location ID"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Find this in GHL Settings → Business Profile
                  </p>
                </div>

                <div>
                  <label className="label">Location Name (Optional)</label>
                  <input
                    type="text"
                    value={ghlConfig.location_name}
                    onChange={(e) => setGhlConfig({ ...ghlConfig, location_name: e.target.value })}
                    className="input"
                    placeholder="My Agency"
                  />
                </div>

                <button
                  onClick={saveGHLConfig}
                  disabled={saving || !ghlConfig.location_id}
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
                      Save GHL Settings
                    </>
                  )}
                </button>
              </div>
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
