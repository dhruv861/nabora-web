'use client';

import React from 'react';
import { Avatar } from './Avatar';
import { VerificationBadge } from './VerificationBadge';
import { StarRating } from './StarRating';
import { formatDistanceToNow } from 'date-fns';

interface RatingCardProps {
  rating: {
    id: string;
    overallScore: number;
    review?: string | null;
    createdAt: string;
    targetType: string;
    skillQuality?: number | null;
    communication?: number | null;
    professionalism?: number | null;
    punctuality?: number | null;
    paymentReliability?: number | null;
    workingConditions?: number | null;
    giver: {
      name: string | null;
      avatarUrl: string | null;
      verificationLevel?: string;
      workerProfile?: { headline?: string | null } | null;
    };
    hire?: { job?: { title?: string } | null } | null;
  };
}

export function RatingCard({ rating }: RatingCardProps) {
  const isWorkerRating = rating.targetType === 'WORKER';
  const subcats = (isWorkerRating
    ? [
        { label: 'Skill Quality', score: rating.skillQuality },
        { label: 'Communication', score: rating.communication },
        { label: 'Professionalism', score: rating.professionalism },
        { label: 'Punctuality', score: rating.punctuality },
      ]
    : [
        { label: 'Payment Reliability', score: rating.paymentReliability },
        { label: 'Communication', score: rating.communication },
        { label: 'Working Conditions', score: rating.workingConditions },
      ]
  ).filter((s) => s.score != null) as { label: string; score: number }[];

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar src={rating.giver.avatarUrl} name={rating.giver.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[var(--color-neutral-900)] truncate">
              {rating.giver.name ?? 'Anonymous'}
            </span>
            {rating.giver.verificationLevel && (
              <VerificationBadge level={rating.giver.verificationLevel as any} />
            )}
          </div>
          {rating.hire?.job?.title && (
            <p className="text-xs text-[var(--color-neutral-400)] truncate mt-0.5">{rating.hire.job.title}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating value={rating.overallScore} readOnly size="sm" />
          <span className="text-[10px] text-[var(--color-neutral-400)]">
            {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {rating.review && (
        <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed italic">
          &ldquo;{rating.review}&rdquo;
        </p>
      )}

      {subcats.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--color-neutral-100)]">
          {subcats.map((sub) => (
            <div key={sub.label} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-neutral-400)] w-28 shrink-0">{sub.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--color-neutral-100)]">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${(sub.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[var(--color-neutral-600)] w-5 text-right">
                {sub.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
