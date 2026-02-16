'use client';

import { type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface WizardStepProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  showBack?: boolean;
  showSkip?: boolean;
  loading?: boolean;
  nextDisabled?: boolean;
  className?: string;
}

export function WizardStep({
  stepNumber,
  totalSteps,
  title,
  description,
  icon,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip for now',
  showBack = true,
  showSkip = false,
  loading = false,
  nextDisabled = false,
  className = '',
}: WizardStepProps) {
  return (
    <div
      className={`max-w-lg w-full ${className}`}
      role="region"
      aria-label={`Step ${stepNumber} of ${totalSteps}: ${title}`}
    >
      {/* Icon */}
      {icon && (
        <div className="flex justify-center mb-6" aria-hidden="true">
          {icon}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <p className="sr-only">Step {stepNumber} of {totalSteps}</p>
        <h2 className="text-2xl font-bold text-slate-900 font-heading mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-slate-600">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="mb-8">
        {children}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {showBack && stepNumber > 1 && (
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={loading}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Button>
        )}

        {showSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={loading}
          >
            {skipLabel}
          </Button>
        )}

        {onNext && (
          <Button
            variant="primary"
            onClick={onNext}
            loading={loading}
            disabled={nextDisabled}
            className="flex-1"
          >
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i + 1 === stepNumber
                ? 'bg-teal-600'
                : i + 1 < stepNumber
                ? 'bg-teal-300'
                : 'bg-slate-200'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

// Progress sidebar for desktop
interface WizardProgressProps {
  steps: Array<{
    id: number;
    title: string;
    icon: ReactNode;
  }>;
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <nav className="space-y-4" aria-label="Onboarding progress">
      {steps.map((step) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
              isCurrent
                ? 'bg-teal-50 border border-teal-200'
                : isCompleted
                ? 'bg-slate-50'
                : ''
            }`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isCompleted
                  ? 'bg-teal-500 text-white'
                  : isCurrent
                  ? 'bg-teal-100 text-teal-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
              aria-hidden="true"
            >
              {step.icon}
            </div>
            <div>
              <p
                className={`font-medium ${
                  isCurrent
                    ? 'text-teal-700'
                    : isCompleted
                    ? 'text-slate-900'
                    : 'text-slate-500'
                }`}
              >
                {step.title}
                {isCompleted && <span className="sr-only">(completed)</span>}
                {isCurrent && <span className="sr-only">(current)</span>}
              </p>
              <p className="text-xs text-slate-500">
                Step {step.id} of {steps.length}
              </p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default WizardStep;
