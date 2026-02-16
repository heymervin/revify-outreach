'use client';

import { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  danger: 'bg-danger-100 text-danger-700 border-danger-200',
  info: 'bg-info-100 text-info-700 border-info-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-slate-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};

function Badge({
  variant = 'neutral',
  size = 'sm',
  icon,
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

// Confidence-specific badge component
export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceBadgeProps extends Omit<BadgeProps, 'variant'> {
  level: ConfidenceLevel;
  score?: number;
  showScore?: boolean;
}

const confidenceConfig: Record<
  ConfidenceLevel,
  { variant: BadgeVariant; label: string }
> = {
  high: { variant: 'success', label: 'High' },
  medium: { variant: 'warning', label: 'Medium' },
  low: { variant: 'danger', label: 'Low' },
};

function ConfidenceBadge({
  level,
  score,
  showScore = false,
  size = 'sm',
  className = '',
  ...props
}: ConfidenceBadgeProps) {
  const config = confidenceConfig[level];

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      className={className}
      title={score !== undefined ? `Confidence: ${score}%` : undefined}
      {...props}
    >
      {config.label}
      {showScore && score !== undefined && (
        <span className="font-mono text-xs ml-0.5">({score}%)</span>
      )}
    </Badge>
  );
}

export { Badge, ConfidenceBadge };
export type { BadgeProps, ConfidenceBadgeProps };
