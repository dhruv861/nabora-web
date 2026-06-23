'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trap scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet — slides from bottom on mobile, centred modal on desktop */}
      <div
        className={[
          'relative w-full md:w-auto md:min-w-[400px] md:max-w-lg',
          'bg-white rounded-t-2xl md:rounded-2xl shadow-2xl',
          'animate-in slide-in-from-bottom-4 duration-300',
          'max-h-[90vh] overflow-y-auto',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
      >
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--color-neutral-300)]" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-neutral-100)]">
            <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 py-4 pb-safe">{children}</div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
