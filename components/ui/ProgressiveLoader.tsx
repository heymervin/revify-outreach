'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, Circle, X, Clock } from 'lucide-react';
import { Button } from './Button';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
}

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error';

interface ProgressiveLoaderProps {
  steps: ProgressStep[];
  currentStep: number;
  stepStatus?: Record<string, StepStatus>;
  estimatedTime?: number; // in seconds
  onCancel?: () => void;
  cancelLabel?: string;
  title?: string;
  showTimeRemaining?: boolean;
  className?: string;
}

function ProgressiveLoader({
  steps,
  currentStep,
  stepStatus = {},
  estimatedTime,
  onCancel,
  cancelLabel = 'Cancel',
  title = 'Processing...',
  showTimeRemaining = true,
  className = '',
}: ProgressiveLoaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate progress percentage
  const progressPercent = Math.min(
    ((currentStep + 1) / steps.length) * 100,
    100
  );

  // Calculate time remaining
  const timeRemaining = estimatedTime
    ? Math.max(estimatedTime - elapsedTime, 0)
    : null;

  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  const getStepStatus = (index: number): StepStatus => {
    const step = steps[index];
    if (stepStatus[step.id]) {
      return stepStatus[step.id];
    }
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'in_progress';
    return 'pending';
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'complete':
        return (
          <div className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 rounded-full bg-danger-500 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
            <Circle className="w-3 h-3 text-slate-300" />
          </div>
        );
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}
      role="progressbar"
      aria-valuenow={progressPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 font-heading">
            {title}
          </h3>
          {showTimeRemaining && timeRemaining !== null && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>
                {timeRemaining > 0
                  ? `~${formatTime(timeRemaining)} remaining`
                  : 'Almost done...'}
              </span>
            </p>
          )}
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isActive = index === currentStep;

          return (
            <div
              key={step.id}
              className={`
                flex items-start gap-3 p-3 rounded-xl transition-colors
                ${isActive ? 'bg-teal-50' : ''}
                ${status === 'error' ? 'bg-danger-50' : ''}
              `}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">{getStepIcon(status)}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`
                    text-sm font-medium
                    ${status === 'complete' ? 'text-slate-500' : ''}
                    ${status === 'in_progress' ? 'text-teal-700' : ''}
                    ${status === 'error' ? 'text-danger-700' : ''}
                    ${status === 'pending' ? 'text-slate-400' : ''}
                  `}
                >
                  {step.label}
                </p>
                {step.description && isActive && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Status indicator for screen readers */}
              <span className="sr-only">
                {status === 'complete' && 'Completed'}
                {status === 'in_progress' && 'In progress'}
                {status === 'error' && 'Error'}
                {status === 'pending' && 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline loader for smaller spaces
interface InlineLoaderProps {
  message?: string;
  className?: string;
}

function InlineLoader({ message = 'Loading...', className = '' }: InlineLoaderProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin text-teal-600" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// Skeleton loader for content placeholders
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`
        bg-slate-200 animate-pulse
        ${variantStyles[variant]}
        ${className}
      `}
      style={{
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'circular' ? width : undefined),
      }}
      aria-hidden="true"
    />
  );
}

export { ProgressiveLoader, InlineLoader, Skeleton };
export type { ProgressiveLoaderProps, InlineLoaderProps, SkeletonProps };
