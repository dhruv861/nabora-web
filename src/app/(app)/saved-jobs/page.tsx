'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Loader2, Bookmark } from 'lucide-react';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';

export default function SavedJobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch saved jobs
  const fetchSavedJobs = async ({ pageParam }: { pageParam: string | null }) => {
    const params = pageParam ? { cursor: pageParam } : {};
    const res = await api.get('/users/me/saved-jobs', { params });
    return res.data.data as { jobs: any[]; nextCursor: string | null };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['saved-jobs-list'],
    queryFn: fetchSavedJobs,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Unsave Mutation
  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/users/me/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      toast.success('Job removed from saved list.');
      queryClient.invalidateQueries({ queryKey: ['saved-jobs-list'] });
    },
    onError: () => {
      toast.error('Failed to unsave job. Please try again.');
    },
  });

  const jobsList = data?.pages.flatMap((page) => page.jobs) || [];

  return (
    <div className="min-h-screen pb-safe bg-[var(--color-neutral-50)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/feed')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)] flex items-center gap-1.5">
          <Bookmark size={16} className="text-[var(--color-primary-500)]" />
          Saved Jobs
        </span>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-[var(--color-primary-500)]" size={24} />
          </div>
        ) : jobsList.length > 0 ? (
          <div className="flex flex-col gap-3">
            {jobsList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={true}
                onSave={(id) => unsaveMutation.mutate(id)}
                onApply={(id) => router.push(`/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`)}
              />
            ))}

            {/* Load more */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-3 bg-white hover:bg-[var(--color-neutral-100)] text-[var(--color-primary-600)] font-bold text-xs rounded-2xl border border-[var(--color-neutral-200)] shadow-sm transition flex items-center justify-center gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Loading more...
                  </>
                ) : (
                  'Load More Saved Jobs'
                )}
              </button>
            )}
          </div>
        ) : (
          <EmptyState
            title="No Saved Jobs"
            description="You haven't bookmarked any jobs yet. When you find a job you like, click the bookmark icon to save it for later."
            action={{
              label: 'Discover Jobs',
              onClick: () => router.push('/feed'),
            }}
          />
        )}
      </main>
    </div>
  );
}
