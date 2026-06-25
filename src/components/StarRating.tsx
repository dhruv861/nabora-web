'use client';

import React from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  max?: number;
}

const SIZES = { sm: 16, md: 22, lg: 30 };

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  max = 5,
}: StarRatingProps) {
  const px = SIZES[size];

  return (
    <div className="flex items-center gap-0.5" role={readOnly ? 'img' : 'group'} aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = value >= starValue;
        const half = !filled && value >= starValue - 0.5;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(starValue)}
            className={`transition-transform ${!readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'} focus:outline-none`}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
          >
            <svg width={px} height={px} viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#e2e8f0" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={
                  filled ? '#f59e0b' :
                  half  ? `url(#half-${i})` :
                  '#e2e8f0'
                }
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
