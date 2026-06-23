'use client';

import React, { useState, useEffect } from 'react';
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

  // Bottom Sheet for Apply
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');

  // Queries to get Saved status
  const { data: savedJobsData } = useQuery({
    queryKey: ['saved-jobs-status', jobId],
    queryFn: async () => {
      if (!isAuthenticated) return false;
      const res = await api.get('/users/me/saved-jobs');
      const savedList = res.data.data.jobs as { id: string }[];
      return savedList.some((j) => j.id === jobId);
    },
    enabled: isAuthenticated,
  });
  const isSaved = !!savedJobsData;

  // Mock application status query or check
  const { data: isAppliedData, refetch: refetchApplied } = useQuery({
    queryKey: ['applied-status', jobId],
    queryFn: async () => {
      if (!isAuthenticated) return false;
      // Fetch user's own applications if any
      try {
        const res = await api.get('/users/me/applications');
        const apps = res.data.data as { jobId: string }[];
        return apps.some((app) => app.jobId === jobId);
      } catch {
        return false;
      }
    },
    enabled: isAuthenticated,
  });
  const isApplied = !!isAppliedData;

  // Save/Unsave Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (isSaved) {
        await api.delete(`/users/me/saved-jobs/${jobId}`);
      } else {
        await api.post(`/users/me/saved-jobs/${jobId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs-status', jobId] });
      toast.success(isSaved ? 'Job removed from saved list' : 'Job saved successfully!');
    },
    onError: () => {
      toast.error('Failed to update saved status.');
    },
  });

  // Apply Mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      // Sprint 3: POST /v1/jobs/:id/apply
      // Let's call the API if it's there, otherwise simulate a mock apply with status stored locally
      try {
        await api.post(`/jobs/${jobId}/apply`, { coverNote });
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Endpoint doesn't exist yet, simulate locally
          localStorage.setItem(`mock-applied-${jobId}`, 'true');
        } else {
          throw err;
        }
      }
    },
    onSuccess: () => {
      setIsApplyOpen(false);
      refetchApplied();
      toast.success('Application submitted successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    },
  });

  // Local state check for simulated apply fallback
  const [localApplied, setLocalApplied] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalApplied(localStorage.getItem(`mock-applied-${jobId}`) === 'true');
    }
  }, [jobId]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setIsApplyOpen(true);
  };

  const handleShareClick = () => {
    const url = `${window.location.origin}/jobs/${citySlug}/${categorySlug}/${slug}`;
    if (navigator.share) {
      navigator.share({
        title,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePublishClick = async () => {
    try {
      await api.post(`/jobs/${jobId}/publish`);
      toast.success('Job published successfully!');
      router.refresh();
    } catch (err: any) {
      const failures = err.response?.data?.failures as string[];
      if (failures && failures.length > 0) {
        toast.error(`Quality Gate Failed: ${failures.join(', ')}`);
      } else {
        toast.error('Failed to publish job.');
      }
    }
  };

  const hasApplied = isApplied || localApplied;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-2">
        {isPoster ? (
          <>
            {jobStatus === 'DRAFT' && (
              <Button onClick={handlePublishClick} className="flex-1 py-3" variant="primary">
                Publish Job
              </Button>
            )}
            <Button
              onClick={() => router.push(`/jobs/create?edit=${jobId}`)}
              className="flex-1 py-3"
              variant="secondary"
            >
              Edit Draft
            </Button>
          </>
        ) : (
          <>
            {hasApplied ? (
              <div className="flex-1 py-3 bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] font-bold text-center rounded-xl flex items-center justify-center gap-1.5 border border-[var(--color-neutral-200)] text-sm">
                <CheckCircle2 size={16} className="text-[var(--color-success-500)]" />
                Applied ✓
              </div>
            ) : jobStatus === 'PUBLISHED' ? (
              <Button onClick={handleApplyClick} className="flex-1 py-3 font-bold" variant="primary">
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
                aria-label="Save job"
              >
                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
            )}
          </>
        )}

        <button
          onClick={handleShareClick}
          className="p-3 rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] transition-colors"
          aria-label="Share job"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Apply Sheet */}
      <BottomSheet isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} title="Apply for Job">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)]">
            <AlertCircle className="text-[var(--color-primary-500)] shrink-0" size={18} />
            <div className="text-xs text-[var(--color-neutral-600)] leading-relaxed">
              Applying to <span className="font-bold text-[var(--color-neutral-900)]">{title}</span>. Your contact number will be visible to the employer once hired.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">
              Add a Cover Note (Optional)
            </label>
            <textarea
              placeholder="Why are you a good fit for this job? (e.g. past events experience, camera model...)"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value.slice(0, 300))}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none placeholder-[var(--color-neutral-400)] resize-none"
            />
            <div className="text-right text-[10px] text-[var(--color-neutral-400)] mt-1">
              {coverNote.length} / 300 characters
            </div>
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
