'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  Key,
  Search,
  Link as LinkIcon,
  Rocket,
  Check,
  Zap,
} from 'lucide-react';
import { WizardStep, WizardProgress } from '@/components/onboarding/WizardStep';
import { ApiKeySetup, type AIProvider } from '@/components/onboarding/ApiKeySetup';
import { SampleResearch } from '@/components/onboarding/SampleResearch';
import { GHLConnect } from '@/components/onboarding/GHLConnect';
import { SetupComplete } from '@/components/onboarding/SetupComplete';
import { validateApiKey } from '@/lib/onboarding/validateApiKey';

const WIZARD_STEPS = [
  { id: 1, title: 'Welcome', icon: <Sparkles className="w-5 h-5" /> },
  { id: 2, title: 'API Keys', icon: <Key className="w-5 h-5" /> },
  { id: 3, title: 'Try Research', icon: <Search className="w-5 h-5" /> },
  { id: 4, title: 'Connect GHL', icon: <LinkIcon className="w-5 h-5" /> },
  { id: 5, title: 'Ready!', icon: <Rocket className="w-5 h-5" /> },
];

const STORAGE_KEY = 'revify_onboarding_progress';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
    tavily: '',
  });
  const [validationStatuses, setValidationStatuses] = useState<
    Record<AIProvider, 'idle' | 'validating' | 'valid' | 'invalid'>
  >({
    openai: 'idle',
    anthropic: 'idle',
    gemini: 'idle',
    tavily: 'idle',
  });
  const [validationErrors, setValidationErrors] = useState<Record<AIProvider, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
    tavily: '',
  });

  const [ghlLocationId, setGhlLocationId] = useState('');
  const [ghlStatus, setGhlStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [ghlError, setGhlError] = useState<string>('');

  const [researchCompleted, setResearchCompleted] = useState(false);
  const [setupSteps, setSetupSteps] = useState([
    { label: 'API Keys configured', completed: false, skipped: false },
    { label: 'Sample research tried', completed: false, skipped: false },
    { label: 'GHL connected', completed: false, skipped: false },
  ]);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        if (progress.currentStep) setCurrentStep(progress.currentStep);
        if (progress.apiKeys) setApiKeys(progress.apiKeys);
        if (progress.ghlLocationId) setGhlLocationId(progress.ghlLocationId);
        if (progress.setupSteps) setSetupSteps(progress.setupSteps);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save progress
  useEffect(() => {
    const progress = {
      currentStep,
      apiKeys,
      ghlLocationId,
      setupSteps,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [currentStep, apiKeys, ghlLocationId, setupSteps]);

  const hasAnyApiKey = Object.values(apiKeys).some((k) => k.trim());
  const hasValidApiKey = Object.values(validationStatuses).some((s) => s === 'valid');

  const handleValidateKey = useCallback(async (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key.trim()) return;

    setValidationStatuses((prev) => ({ ...prev, [provider]: 'validating' }));
    setValidationErrors((prev) => ({ ...prev, [provider]: '' }));

    const result = await validateApiKey(provider, key);

    setValidationStatuses((prev) => ({
      ...prev,
      [provider]: result.valid ? 'valid' : 'invalid',
    }));

    if (!result.valid && result.error) {
      setValidationErrors((prev) => ({ ...prev, [provider]: result.error || '' }));
    }
  }, [apiKeys]);

  const handleSaveApiKeys = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) throw new Error('No organization found');

      // Save API keys
      const keysToSave = Object.entries(apiKeys)
        .filter(([_, value]) => value.trim())
        .map(([provider, key]) => ({
          organization_id: userData.organization_id,
          provider,
          encrypted_key: key, // TODO: Encrypt in production
          key_hint: key.slice(-4),
          is_valid: validationStatuses[provider as AIProvider] === 'valid',
        }));

      if (keysToSave.length > 0) {
        for (const keyData of keysToSave) {
          await supabase.from('api_keys').upsert(keyData, {
            onConflict: 'organization_id,provider',
          });
        }
      }

      // Update setup steps
      setSetupSteps((prev) =>
        prev.map((step) =>
          step.label === 'API Keys configured'
            ? { ...step, completed: keysToSave.length > 0, skipped: keysToSave.length === 0 }
            : step
        )
      );

      setCurrentStep(3);
    } catch (err) {
      console.error('Error saving API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGHL = async () => {
    if (!ghlLocationId.trim()) {
      setSetupSteps((prev) =>
        prev.map((step) =>
          step.label === 'GHL connected' ? { ...step, skipped: true } : step
        )
      );
      setCurrentStep(5);
      return;
    }

    setLoading(true);
    setGhlStatus('connecting');
    setGhlError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) throw new Error('No organization found');

      await supabase.from('ghl_config').upsert(
        {
          organization_id: userData.organization_id,
          location_id: ghlLocationId.trim(),
        },
        { onConflict: 'organization_id' }
      );

      setGhlStatus('connected');
      setSetupSteps((prev) =>
        prev.map((step) =>
          step.label === 'GHL connected' ? { ...step, completed: true } : step
        )
      );
      setCurrentStep(5);
    } catch (err) {
      console.error('Error saving GHL config:', err);
      setGhlStatus('error');
      setGhlError(err instanceof Error ? err.message : 'Failed to save GHL config');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('users')
        .update({ onboarding_completed: true, onboarding_step: 5 })
        .eq('id', user.id);

      // Clear saved progress
      localStorage.removeItem(STORAGE_KEY);

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" role="main" aria-label="Onboarding wizard">
      {/* Left Side - Progress (Desktop) */}
      <div className="hidden lg:flex lg:w-80 bg-white border-r border-slate-200 flex-col p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg font-heading">Revify</h1>
            <p className="text-xs text-slate-500">Outreach Intelligence</p>
          </div>
        </div>

        <WizardProgress steps={WIZARD_STEPS} currentStep={currentStep} />
      </div>

      {/* Right Side - Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <WizardStep
              stepNumber={1}
              totalSteps={5}
              title="Welcome to Revify Outreach!"
              description="Let's get you set up in just a few quick steps."
              icon={
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              }
              showBack={false}
              onNext={() => setCurrentStep(2)}
              nextLabel="Get Started"
            >
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-left">
                <h3 className="font-semibold text-teal-800 mb-3">What you&apos;ll do:</h3>
                <ul className="space-y-2 text-teal-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Add your AI provider API keys
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Try a sample company research
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Connect GoHighLevel (optional)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Start generating insights!
                  </li>
                </ul>
              </div>
            </WizardStep>
          )}

          {/* Step 2: API Keys */}
          {currentStep === 2 && (
            <WizardStep
              stepNumber={2}
              totalSteps={5}
              title="Add Your API Keys"
              description="Add at least one AI provider key to enable research."
              icon={
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
              }
              onBack={() => setCurrentStep(1)}
              onNext={handleSaveApiKeys}
              onSkip={() => {
                setSetupSteps((prev) =>
                  prev.map((step) =>
                    step.label === 'API Keys configured' ? { ...step, skipped: true } : step
                  )
                );
                setCurrentStep(3);
              }}
              showSkip={!hasAnyApiKey}
              nextLabel={hasAnyApiKey ? 'Save & Continue' : 'Continue'}
              loading={loading}
            >
              <ApiKeySetup
                apiKeys={apiKeys}
                onApiKeysChange={setApiKeys}
                validationStatuses={validationStatuses}
                validationErrors={validationErrors}
                onValidateKey={handleValidateKey}
              />
              {error && (
                <div
                  className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}
            </WizardStep>
          )}

          {/* Step 3: Sample Research */}
          {currentStep === 3 && (
            <WizardStep
              stepNumber={3}
              totalSteps={5}
              title="Try Sample Research"
              description="See Revify in action with a quick company research."
              icon={
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <Search className="w-8 h-8 text-teal-600" />
                </div>
              }
              onBack={() => setCurrentStep(2)}
              onNext={() => {
                if (!researchCompleted) {
                  setSetupSteps((prev) =>
                    prev.map((step) =>
                      step.label === 'Sample research tried' ? { ...step, skipped: true } : step
                    )
                  );
                }
                setCurrentStep(4);
              }}
              nextLabel={researchCompleted ? 'Continue' : 'Skip for now'}
              showSkip={false}
            >
              <SampleResearch
                hasApiKey={hasValidApiKey}
                onResearchComplete={() => {
                  setResearchCompleted(true);
                  setSetupSteps((prev) =>
                    prev.map((step) =>
                      step.label === 'Sample research tried' ? { ...step, completed: true } : step
                    )
                  );
                }}
              />
            </WizardStep>
          )}

          {/* Step 4: Connect GHL */}
          {currentStep === 4 && (
            <WizardStep
              stepNumber={4}
              totalSteps={5}
              title="Connect GoHighLevel"
              description="Import companies and sync research to GHL."
              icon={
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <LinkIcon className="w-8 h-8 text-purple-600" />
                </div>
              }
              onBack={() => setCurrentStep(3)}
              onNext={handleSaveGHL}
              nextLabel={ghlLocationId ? 'Connect & Continue' : 'Skip for now'}
              loading={loading}
            >
              <GHLConnect
                locationId={ghlLocationId}
                onLocationIdChange={setGhlLocationId}
                connectionStatus={ghlStatus}
                connectionError={ghlError}
              />
            </WizardStep>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="max-w-lg w-full">
              <SetupComplete
                steps={setupSteps}
                onGetStarted={handleComplete}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
