'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Share2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface JobActionSectionProps {
  jobId: string;
  posterId: string;
  jobStatus: string;
  title: string;
  citySlug: string;
  categorySlug: string;
  slug: string;
}

export function JobActionSection({
  jobId,
  posterId,
  jobStatus,
  title,
  citySlug,
  categorySlug,
  slug,
}: JobActionSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const isPoster = user?.id === posterId;

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');

  // ── Saved status ────────────────────────────────────────────────────────────
  const { data: isSaved = false } = useQuery({
    queryKey: ['saved-jobs-status', jobId],
    queryFn: async () => {
      const res = await api.get('/users/me/saved-jobs');
      const jobs = res.data.data?.jobs as { id: string }[] ?? [];
      return jobs.some((j) => j.id === jobId);
    },
    enabled: isAuthenticated,
  });

  // ── Applied status ──────────────────────────────────────────────────────────
  const { data: isApplied = false, refetch: refetchApplied } = useQuery({
    queryKey: ['applied-status', jobId],
    queryFn: async () => {
      const res = await api.get('/users/me/applications');
      const apps = res.data.data as { jobId: string }[] ?? [];
      return apps.some((a) => a.jobId === jobId);
    },
    enabled: isAuthenticated && !isPoster,
  });

  // ── Save / Unsave ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) { router.push('/login'); return; }
      if (isSaved) {
        await api.delete(`/users/me/saved-jobs/${jobId}`);
      } else {
        await api.post(`/users/me/saved-jobs/${jobId}`);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['saved-jobs-status', jobId] });
      const prev = queryClient.getQueryData(['saved-jobs-status', jobId]);
      queryClient.setQueryData(['saved-jobs-status', jobId], !isSaved);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['saved-jobs-status', jobId], ctx?.prev);
      toast.error('Failed to update saved status.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs-status', jobId] }),
  });

  // ── Apply ───────────────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/jobs/${jobId}/apply`, { coverNote: coverNote || undefined });
    },
    onSuccess: () => {
      setIsApplyOpen(false);
      setCoverNote('');
      refetchApplied();
      queryClient.invalidateQueries({ queryKey: ['applied-status', jobId] });
      toast.success('Application submitted successfully!');
    },
    onError: (err: any) => {
      const status = err.response?.status;
      const msg =
        status === 409 ? 'You have already applied to this job.' :
        status === 410 ? 'This job is closed and no longer accepting applications.' :
        status === 403 ? 'You cannot apply to your own job.' :
        err.response?.data?.message ?? 'Failed to submit application.';
      toast.error(msg);
      if (status === 409) {
        setIsApplyOpen(false);
        refetchApplied();
      }
    },
  });

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${citySlug}/${categorySlug}/${slug}`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/jobs/${jobId}/publish`);
      toast.success('Job published successfully!');
      router.refresh();
    } catch (err: any) {
      const failures = err.response?.data?.failures as string[];
      toast.error(failures?.length ? `Quality Gate Failed: ${failures.join(', ')}` : 'Failed to publish job.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-2">
        {isPoster ? (
          <>
            {jobStatus === 'DRAFT' && (
              <Button onClick={handlePublish} className="flex-1 py-3" variant="primary">Publish Job</Button>
            )}
            <Button onClick={() => router.push(`/jobs/create?edit=${jobId}`)} className="flex-1 py-3" variant="secondary">
              Edit Draft
            </Button>
          </>
        ) : (
          <>
            {isApplied ? (
              <div className="flex-1 py-3 bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] font-bold text-center rounded-xl flex items-center justify-center gap-1.5 border border-[var(--color-neutral-200)] text-sm">
                <CheckCircle2 size={16} className="text-[var(--color-success-500)]" />
                Applied ✓
              </div>
            ) : jobStatus === 'PUBLISHED' ? (
              <Button onClick={() => { if (!isAuthenticated) { router.push('/login'); return; } setIsApplyOpen(true); }} className="flex-1 py-3 font-bold" variant="primary">
                Apply Now
              </Button>
            ) : (
              <div className="flex-1 py-3 bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)] font-bold text-center rounded-xl text-sm">
                Position Filled
              </div>
            )}

            {jobStatus === 'PUBLISHED' && (
              <button
                onClick={() => saveMutation.mutate()}
                className={`p-3 rounded-xl border flex items-center justify-center transition-colors ${
                  isSaved
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-5)] text-[var(--color-primary-500)]'
                    : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]'
                }`}
                aria-label={isSaved ? 'Unsave job' : 'Save job'}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
            )}
          </>
        )}

        <button
          onClick={handleShare}
          className="p-3 rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] transition-colors"
          aria-label="Share job"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Apply Bottom Sheet */}
      <BottomSheet isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} title="Apply for Job">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)]">
            <AlertCircle className="text-[var(--color-primary-500)] shrink-0" size={18} />
            <p className="text-xs text-[var(--color-neutral-600)] leading-relaxed">
              Applying to <span className="font-bold text-[var(--color-neutral-900)]">{title}</span>. Your contact number will be shared with the employer once hired.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">
              Cover Note <span className="font-normal normal-case text-[var(--color-neutral-400)]">(optional)</span>
            </label>
            <textarea
              placeholder="Why are you a great fit? (experience, skills, availability...)"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value.slice(0, 300))}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none placeholder-[var(--color-neutral-400)] resize-none"
            />
            <div className="text-right text-[10px] text-[var(--color-neutral-400)] mt-1">{coverNote.length} / 300</div>
          </div>

          <Button
            onClick={() => applyMutation.mutate()}
            isLoading={applyMutation.isPending}
            fullWidth
            leftIcon={<Send size={16} />}
          >
            Submit Application
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
