'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-[var(--color-neutral-300)] [&>svg]:w-16 [&>svg]:h-16">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-neutral-800)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-neutral-500)] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
