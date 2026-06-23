'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, backHref, rightSlot }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-neutral-200)] bg-white sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] transition-colors"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <h1 className="text-base font-semibold text-[var(--color-neutral-900)]">{title}</h1>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </header>
  );
}
