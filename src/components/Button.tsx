'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] active:bg-[var(--color-primary-700)] shadow-sm disabled:bg-[var(--color-neutral-300)]',
  secondary:
    'bg-transparent text-[var(--color-primary-500)] border border-[var(--color-primary-500)] hover:bg-[var(--color-primary-50)] active:bg-[var(--color-primary-100)] disabled:border-[var(--color-neutral-300)] disabled:text-[var(--color-neutral-400)]',
  ghost:
    'bg-transparent text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] active:bg-[var(--color-neutral-200)] disabled:text-[var(--color-neutral-400)]',
  danger:
    'bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-600)] active:bg-[var(--color-error-700)] disabled:bg-[var(--color-neutral-300)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs rounded-lg gap-1',
  sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
