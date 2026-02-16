'use client';

import { Info } from 'lucide-react';
import { type ConfidenceLevel } from '@/types/researchTypesV3';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number; // 0-100
  sourceCount?: number;
  showScore?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const levelConfig: Record<
  ConfidenceLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  high: {
    label: 'High',
    bg: 'bg-success-100',
    text: 'text-success-700',
    border: 'border-success-200',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-warning-100',
    text: 'text-warning-700',
    border: 'border-warning-200',
  },
  low: {
    label: 'Low',
    bg: 'bg-danger-100',
    text: 'text-danger-700',
    border: 'border-danger-200',
  },
};

const dotColors: Record<ConfidenceLevel, string> = {
  high: 'bg-success-500',
  medium: 'bg-warning-500',
  low: 'bg-danger-500',
};

export function ConfidenceBadge({
  level,
  score,
  sourceCount,
  showScore = false,
  showTooltip = true,
  size = 'sm',
  className = '',
}: ConfidenceBadgeProps) {
  const config = levelConfig[level];

  const tooltipText = [
    score !== undefined ? `Confidence: ${score}%` : null,
    sourceCount !== undefined ? `${sourceCount} source${sourceCount !== 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bg} ${config.text} ${config.border}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5'}
        ${className}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      <span
        className={`rounded-full ${dotColors[level]} ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        aria-hidden="true"
      />
      {config.label}
      {showScore && score !== undefined && (
        <span className="font-mono ml-0.5">({score}%)</span>
      )}
      {showTooltip && tooltipText && (
        <Info
          className={`opacity-60 ${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
          aria-hidden="true"
        />
      )}
      {/* Screen reader only text for confidence info */}
      <span className="sr-only">
        Confidence level: {config.label}
        {score !== undefined && `, score: ${score}%`}
        {sourceCount !== undefined && `, based on ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`}
      </span>
    </span>
  );
}

// Calculate confidence level from score
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// Calculate confidence from overall_score (0-1)
export function normalizeConfidenceScore(score: number): number {
  return Math.round(score * 100);
}

export default ConfidenceBadge;
