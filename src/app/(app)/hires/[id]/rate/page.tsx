'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StarRating } from '@/components/StarRating';
import { RatingCard } from '@/components/RatingCard';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const WORKER_SUBCATS = [
  { key: 'skillQuality', label: 'Skill Quality' },
  { key: 'communication', label: 'Communication' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'punctuality', label: 'Punctuality' },
] as const;

const EMPLOYER_SUBCATS = [
  { key: 'paymentReliability', label: 'Payment Reliability' },
  { key: 'communication', label: 'Communication' },
  { key: 'workingConditions', label: 'Working Conditions' },
] as const;

export default function RatePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const hireId = params.id as string;

  const [scores, setScores] = useState<Record<string, number>>({});
  const [review, setReview] = useState('');

  const { data: hire, isLoading: hireLoading } = useQuery({
    queryKey: ['hire', hireId],
    queryFn: async () => { const res = await api.get(`/hires/${hireId}`); return res.data.data as any; },
  });

  const { data: existingRating, isLoading: ratingLoading } = useQuery({
    queryKey: ['hire-rating', hireId],
    queryFn: async () => {
      const res = await api.get(`/hires/${hireId}/rating`);
      return res.data.data as any;
    },
    enabled: !!hire,
  });

  const isEmployer = user?.id === hire?.employerId;
  const targetType = isEmployer ? 'WORKER' : 'EMPLOYER';
  const targetName = isEmployer ? hire?.worker?.name : hire?.employer?.name;
  const targetAvatar = isEmployer ? hire?.worker?.avatarUrl : hire?.employer?.avatarUrl;
  const subcats = isEmployer ? WORKER_SUBCATS : EMPLOYER_SUBCATS;

  const allFilled = subcats.every((s) => scores[s.key] != null);
  const overallScore = allFilled
    ? +(Object.values(scores).reduce((a, b) => a + b, 0) / subcats.length).toFixed(2)
    : 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/hires/${hireId}/ratings`, {
        targetType,
        ...scores,
        review: review.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Review submitted! Thank you.');
      queryClient.invalidateQueries({ queryKey: ['hire-rating', hireId] });
      queryClient.invalidateQueries({ queryKey: ['hire', hireId] });
      router.push(`/hires/${hireId}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Failed to submit review.';
      if (err.response?.status === 409) {
        toast.error('You have already rated this hire.');
        queryClient.invalidateQueries({ queryKey: ['hire-rating', hireId] });
      } else {
        toast.error(msg);
      }
    },
  });

  if (hireLoading || ratingLoading) return <LoadingState />;

  if (!hire || hire.status !== 'COMPLETED') {
    return (
      <EmptyState
        title="Cannot rate this hire"
        description="Ratings can only be submitted for completed hires."
        action={{ label: 'Back to Hires', onClick: () => router.push('/hires') }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/hires/${hireId}`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">
          Rate {isEmployer ? 'Worker' : 'Employer'}
        </span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Who you're rating */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 flex items-center gap-4 shadow-sm">
          <Avatar src={targetAvatar} name={targetName} size="lg" />
          <div>
            <p className="font-bold text-base text-[var(--color-neutral-900)]">{targetName}</p>
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{hire?.job?.title}</p>
          </div>
        </div>

        {existingRating ? (
          // Already rated — show submitted review
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm font-semibold text-emerald-700">
              ✓ You already submitted a review for this hire.
            </div>
            <RatingCard rating={existingRating} />
          </div>
        ) : (
          // Rating form
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-5">
            {subcats.map((sub) => (
              <div key={sub.key}>
                <label className="block text-sm font-semibold text-[var(--color-neutral-700)] mb-2">
                  {sub.label}
                </label>
                <StarRating
                  value={scores[sub.key] ?? 0}
                  onChange={(v) => setScores((s) => ({ ...s, [sub.key]: v }))}
                  size="lg"
                />
              </div>
            ))}

            {allFilled && (
              <div className="flex items-center gap-3 py-2 border-t border-[var(--color-neutral-100)]">
                <span className="text-sm font-semibold text-[var(--color-neutral-600)]">Overall</span>
                <StarRating value={overallScore} readOnly size="md" />
                <span className="text-sm font-bold text-[var(--color-neutral-800)]">{overallScore.toFixed(1)}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[var(--color-neutral-700)] mb-2">
                Written Review <span className="font-normal text-[var(--color-neutral-400)]">(optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="Share details of your experience..."
                className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none resize-none"
              />
              <div className="text-right text-[10px] text-[var(--color-neutral-400)] mt-1">{review.length}/500</div>
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              isLoading={submitMutation.isPending}
              disabled={!allFilled}
              fullWidth
              className="py-3 font-bold"
            >
              Submit Review
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
