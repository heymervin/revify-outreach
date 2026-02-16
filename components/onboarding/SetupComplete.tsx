'use client';

import { Check, Rocket, Search, FileStack, Mail, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SetupStep {
  label: string;
  completed: boolean;
  skipped?: boolean;
}

interface SetupCompleteProps {
  steps: SetupStep[];
  onGetStarted: () => void;
  loading?: boolean;
}

export function SetupComplete({ steps, onGetStarted, loading = false }: SetupCompleteProps) {
  const completedCount = steps.filter((s) => s.completed && !s.skipped).length;
  const totalSteps = steps.length;

  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/30">
        <Rocket className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
        You&apos;re all set!
      </h2>
      <p className="text-slate-600 mb-8 text-lg">
        Your account is ready. Start researching companies and generating personalized outreach.
      </p>

      {/* Completion checklist */}
      <Card padding="md" className="mb-8 text-left">
        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
          Setup Summary
        </h4>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                step.completed ? 'bg-success-50' : step.skipped ? 'bg-slate-50' : 'bg-warning-50'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-success-500'
                    : step.skipped
                    ? 'bg-slate-300'
                    : 'bg-warning-500'
                }`}
              >
                <Check className="w-4 h-4 text-white" />
              </div>
              <span
                className={`text-sm ${
                  step.completed
                    ? 'text-success-700'
                    : step.skipped
                    ? 'text-slate-500'
                    : 'text-warning-700'
                }`}
              >
                {step.label}
                {step.skipped && (
                  <span className="text-xs text-slate-400 ml-2">(skipped)</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          {completedCount}/{totalSteps} steps completed. You can always update settings later.
        </p>
      </Card>

      {/* Quick tips */}
      <Card padding="md" className="mb-8 text-left">
        <h4 className="text-sm font-medium text-slate-900 mb-4">Quick tips to get started:</h4>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Start with Quick Research</p>
              <p className="text-sm text-slate-500">Get fast company insights in seconds</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileStack className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Try Bulk Research</p>
              <p className="text-sm text-slate-500">Process multiple companies at once</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Generate Outreach Emails</p>
              <p className="text-sm text-slate-500">Create personalized emails from research</p>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <Button
        variant="primary"
        size="lg"
        onClick={onGetStarted}
        loading={loading}
        className="w-full"
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}

export default SetupComplete;
