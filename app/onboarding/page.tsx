'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Link as LinkIcon,
  Key,
  Rocket,
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Welcome', icon: Sparkles },
  { id: 2, title: 'Connect GHL', icon: LinkIcon },
  { id: 3, title: 'API Keys', icon: Key },
  { id: 4, title: 'Ready!', icon: Rocket },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: '',
    tavily: '',
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update user as onboarded
      await supabase
        .from('users')
        .update({ onboarding_completed: true, onboarding_step: 4 })
        .eq('id', user.id);

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGHLConfig = async () => {
    if (!ghlLocationId.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated. Please log in again.');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('User lookup error:', userError);
        throw new Error('Unable to load user profile. Please ensure database tables are set up.');
      }

      if (!userData?.organization_id) {
        throw new Error('No organization found. Please run the database setup script in Supabase.');
      }

      const { error: upsertError } = await supabase.from('ghl_config').upsert(
        {
          organization_id: userData.organization_id,
          location_id: ghlLocationId.trim(),
        },
        { onConflict: 'organization_id' }
      );

      if (upsertError) {
        console.error('GHL config save error:', upsertError);
        throw new Error(`Failed to save: ${upsertError.message}`);
      }

      handleNext();
    } catch (error) {
      console.error('Error saving GHL config:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) throw new Error('No organization');

      // Save API keys (in production, these would be encrypted)
      const keysToSave = Object.entries(apiKeys)
        .filter(([_, value]) => value.trim())
        .map(([provider, key]) => ({
          organization_id: userData.organization_id,
          provider,
          encrypted_key: key, // TODO: Encrypt in production
          key_hint: key.slice(-4),
        }));

      if (keysToSave.length > 0) {
        for (const keyData of keysToSave) {
          await supabase.from('api_keys').upsert(keyData, {
            onConflict: 'organization_id,provider',
          });
        }
      }

      handleNext();
    } catch (error) {
      console.error('Error saving API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Progress */}
      <div className="hidden lg:flex lg:w-80 bg-white border-r border-slate-200 flex-col p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg">Revify</h1>
            <p className="text-xs text-slate-500">Outreach Intelligence</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  isCurrent
                    ? 'bg-emerald-50 border border-emerald-200'
                    : isCompleted
                    ? 'bg-slate-50'
                    : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isCurrent ? 'text-emerald-700' : isCompleted ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500">Step {step.id} of 4</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg w-full">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Welcome to Revify Outreach!
                </h2>
                <p className="text-slate-600 mb-8 text-lg">
                  Let&apos;s get you set up in just a few quick steps. You&apos;ll be researching
                  companies in no time.
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-left mb-8">
                  <h3 className="font-semibold text-emerald-800 mb-3">What you&apos;ll do:</h3>
                  <ul className="space-y-2 text-emerald-700">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Connect your GoHighLevel account
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Add your AI API keys
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Start researching companies
                    </li>
                  </ul>
                </div>
                <button onClick={handleNext} className="btn-primary w-full py-3 text-lg">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 2: Connect GHL */}
            {currentStep === 2 && (
              <div>
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LinkIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
                  Connect GoHighLevel
                </h2>
                <p className="text-slate-600 mb-8 text-center">
                  Enter your GHL Location ID to sync companies and contacts.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="label">GHL Location ID</label>
                    <input
                      type="text"
                      value={ghlLocationId}
                      onChange={(e) => setGhlLocationId(e.target.value)}
                      className="input"
                      placeholder="e.g., abc123xyz"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Find this in GHL Settings → Business Profile → Location ID
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <button onClick={handleBack} className="btn-secondary flex-1">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={ghlLocationId ? saveGHLConfig : handleSkip}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Saving...' : ghlLocationId ? 'Continue' : 'Skip for now'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: API Keys */}
            {currentStep === 3 && (
              <div>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
                  Add Your API Keys
                </h2>
                <p className="text-slate-600 mb-8 text-center">
                  Add at least one AI provider key to enable research.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="label">OpenAI API Key (Recommended)</label>
                    <input
                      type="password"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                      className="input"
                      placeholder="sk-..."
                    />
                  </div>

                  <div>
                    <label className="label">Google Gemini API Key</label>
                    <input
                      type="password"
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                      className="input"
                      placeholder="AI..."
                    />
                  </div>

                  <div>
                    <label className="label">Tavily API Key (For web search)</label>
                    <input
                      type="password"
                      value={apiKeys.tavily}
                      onChange={(e) => setApiKeys({ ...apiKeys, tavily: e.target.value })}
                      className="input"
                      placeholder="tvly-..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={handleBack} className="btn-secondary flex-1">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={Object.values(apiKeys).some((k) => k.trim()) ? saveApiKeys : handleSkip}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading
                      ? 'Saving...'
                      : Object.values(apiKeys).some((k) => k.trim())
                      ? 'Continue'
                      : 'Skip for now'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">You&apos;re all set!</h2>
                <p className="text-slate-600 mb-8 text-lg">
                  Your account is ready. Start researching companies and generating personalized
                  outreach.
                </p>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4">Quick tips:</h3>
                  <ul className="space-y-3 text-left text-slate-600">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-emerald-600 font-semibold text-sm">1</span>
                      </span>
                      Start with &quot;Quick Research&quot; for fast company insights
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-emerald-600 font-semibold text-sm">2</span>
                      </span>
                      Use &quot;Bulk Research&quot; to process multiple companies at once
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-emerald-600 font-semibold text-sm">3</span>
                      </span>
                      Push research results directly to GHL with one click
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn-primary w-full py-3 text-lg"
                >
                  {loading ? 'Setting up...' : 'Go to Dashboard'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
