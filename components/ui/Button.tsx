'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-teal-600 to-teal-700
    text-white font-semibold
    shadow-lg hover:shadow-xl
    hover:from-teal-700 hover:to-teal-800
    focus:ring-teal-500
    disabled:from-teal-400 disabled:to-teal-500 disabled:cursor-not-allowed disabled:shadow-none
  `,
  secondary: `
    bg-white text-slate-700 font-medium
    border border-slate-200
    hover:bg-slate-50 hover:border-slate-300
    focus:ring-teal-500
    disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
  `,
  danger: `
    bg-gradient-to-r from-danger-500 to-danger-600
    text-white font-semibold
    shadow-lg hover:shadow-xl
    hover:from-danger-600 hover:to-danger-700
    focus:ring-danger-500
    disabled:from-danger-300 disabled:to-danger-400 disabled:cursor-not-allowed disabled:shadow-none
  `,
  ghost: `
    bg-transparent text-slate-600 font-medium
    hover:bg-slate-100 hover:text-slate-900
    focus:ring-teal-500
    disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px] gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm min-h-[44px] gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base min-h-[52px] gap-2.5 rounded-xl',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          transition-all duration-200
          transform hover:-translate-y-0.5 active:translate-y-0
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'transform-none' : ''}
          ${className}
        `}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} aria-hidden="true" />
        ) : leftIcon ? (
          <span className={iconSizes[size]} aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        <span className={loading ? 'opacity-0' : ''}>{children}</span>

        {loading && (
          <span className="absolute">{children}</span>
        )}

        {!loading && rightIcon && (
          <span className={iconSizes[size]} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
