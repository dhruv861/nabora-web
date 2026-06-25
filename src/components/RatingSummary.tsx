'use client';

import React from 'react';
import { StarRating } from './StarRating';

interface SubcategoryBar {
  label: string;
  score: number;
}

interface RatingSummaryProps {
  averageRating: number;
  ratingCount: number;
  subcategories?: SubcategoryBar[];
}

export function RatingSummary({ averageRating, ratingCount, subcategories }: RatingSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-extrabold text-[var(--color-neutral-900)]">
          {averageRating > 0 ? averageRating.toFixed(1) : '—'}
        </span>
        <div className="flex flex-col gap-1">
          <StarRating value={averageRating} readOnly size="sm" />
          <span className="text-xs text-[var(--color-neutral-500)]">
            {ratingCount} review{ratingCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {subcategories && subcategories.length > 0 && (
        <div className="flex flex-col gap-2">
          {subcategories.map((sub) => (
            <div key={sub.label} className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-neutral-500)] w-32 shrink-0">{sub.label}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(sub.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-[var(--color-neutral-700)] w-6 text-right">
                {sub.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
