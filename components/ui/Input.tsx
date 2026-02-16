'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 min-h-[36px] text-sm rounded-lg',
  md: 'px-4 py-2.5 min-h-[44px] text-sm rounded-xl',
  lg: 'px-4 py-3 min-h-[52px] text-base rounded-xl',
};

const iconPadding = {
  sm: { left: 'pl-9', right: 'pr-9' },
  md: { left: 'pl-10', right: 'pr-10' },
  lg: { left: 'pl-11', right: 'pr-11' },
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      size = 'md',
      required,
      disabled,
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${
                size === 'lg' ? 'left-4' : ''
              }`}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={hasError || undefined}
            aria-required={required || undefined}
            aria-describedby={
              [hasError ? errorId : null, helperText ? helperId : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={`
              w-full bg-white border
              text-slate-900 placeholder:text-slate-400
              transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
              disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
              ${sizeStyles[size]}
              ${leftIcon ? iconPadding[size].left : ''}
              ${rightIcon || hasError ? iconPadding[size].right : ''}
              ${
                hasError
                  ? 'border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500/20'
                  : 'border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20'
              }
              ${className}
            `}
            {...props}
          />

          {(rightIcon || hasError) && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                size === 'lg' ? 'right-4' : ''
              }`}
              aria-hidden="true"
            >
              {hasError ? (
                <AlertCircle className="w-5 h-5 text-danger-500" />
              ) : (
                <span className="text-slate-400">{rightIcon}</span>
              )}
            </div>
          )}
        </div>

        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-danger-600 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p id={helperId} className="mt-1.5 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
