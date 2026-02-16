'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardShadow = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  padding?: CardPadding;
  shadow?: CardShadow;
  interactive?: boolean;
  selected?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const shadowStyles: Record<CardShadow, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-card',
  lg: 'shadow-lg',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      description,
      actions,
      footer,
      padding = 'md',
      shadow = 'sm',
      interactive = false,
      selected = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const hasHeader = title || description || actions;

    return (
      <div
        ref={ref}
        className={`
          bg-white rounded-2xl border
          transition-all duration-200
          ${shadowStyles[shadow]}
          ${
            interactive
              ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-teal-300 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus:outline-none'
              : ''
          }
          ${
            selected
              ? 'border-teal-500 ring-2 ring-teal-500/20'
              : 'border-slate-200'
          }
          ${className}
        `}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {hasHeader && (
          <div
            className={`
              flex items-start justify-between gap-4
              ${padding !== 'none' ? paddingStyles[padding] : 'p-6'}
              ${children || footer ? 'border-b border-slate-100' : ''}
            `}
          >
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-slate-900 font-heading">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        )}

        {children && (
          <div className={hasHeader ? '' : paddingStyles[padding]}>
            {hasHeader ? (
              <div className={paddingStyles[padding]}>{children}</div>
            ) : (
              children
            )}
          </div>
        )}

        {footer && (
          <div
            className={`
              border-t border-slate-100
              ${paddingStyles[padding]}
              bg-slate-50/50 rounded-b-2xl
            `}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Section component for organizing content within cards
interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function CardSection({
  title,
  children,
  className = '',
  ...props
}: CardSectionProps) {
  return (
    <div className={`${className}`} {...props}>
      {title && (
        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export { Card, CardSection };
export type { CardProps, CardSectionProps };
