'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { SkillChip } from '@/components/SkillChip';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, BookmarkX, Star, MapPin } from 'lucide-react';
import { toast } from 'sonner';

function SavedWorkerCard({ worker, onUnsave }: { worker: any; onUnsave: (id: string) => void }) {
  const router = useRouter();
  const wp = worker.workerProfile;
  const skills = wp?.skills ?? [];

  return (
    <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar src={worker.avatarUrl} name={worker.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{worker.name}</h3>
            <StatusBadge status={worker.availabilityStatus} />
          </div>
          {wp?.headline && (
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5 truncate">{wp.headline}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-neutral-400)] font-semibold">
            {(worker.averageRating ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <Star size={10} className="text-amber-400" />
                {worker.averageRating.toFixed(1)} ({worker.ratingCount})
              </span>
            )}
            {worker.area && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {worker.area}
              </span>
            )}
          </div>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((us: any) => (
            <SkillChip key={us.skillId} name={us.skill.name} slug={us.skill.slug} size="sm" />
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-[var(--color-neutral-100)] pt-3">
        {wp?.slug && (
          <button
            onClick={() => router.push(`/workers/${worker.citySlug ?? 'india'}/${wp.slug}`)}
            className="flex-1 py-2 border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] text-xs font-bold rounded-xl hover:bg-[var(--color-neutral-50)] transition"
          >
            View Profile
          </button>
        )}
        <button
          onClick={() => onUnsave(worker.id)}
          className="p-2 border border-[var(--color-error-200)] rounded-xl text-[var(--color-error-500)] hover:bg-[var(--color-error-50)] transition"
          aria-label="Unsave worker"
        >
          <BookmarkX size={16} />
        </button>
      </div>
    </div>
  );
}

export default function SavedWorkersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-workers'],
    queryFn: async () => {
      const res = await api.get('/users/me/saved-workers');
      return res.data as { data: any[]; meta: any };
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (workerId: string) => {
      await api.delete(`/users/me/saved-workers/${workerId}`);
    },
    onMutate: async (workerId) => {
      await queryClient.cancelQueries({ queryKey: ['saved-workers'] });
      const prev = queryClient.getQueryData(['saved-workers']);
      queryClient.setQueryData(['saved-workers'], (old: any) => ({
        ...old,
        data: old?.data?.filter((w: any) => w.id !== workerId) ?? [],
      }));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(['saved-workers'], ctx?.prev);
      toast.error('Failed to unsave worker.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved-workers'] }),
    onSuccess: () => toast.success('Worker removed from saved list.'),
  });

  const workers = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/feed')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Saved Workers</span>
        <span className="ml-auto text-xs text-[var(--color-neutral-400)] font-semibold">
          {data?.meta?.total ?? workers.length} saved
        </span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? (
          <LoadingState />
        ) : workers.length === 0 ? (
          <EmptyState
            title="No Saved Workers"
            description="Workers you save while browsing will appear here so you can hire them quickly."
          />
        ) : (
          workers.map((worker: any) => (
            <SavedWorkerCard
              key={worker.id}
              worker={worker}
              onUnsave={(id) => unsaveMutation.mutate(id)}
            />
          ))
        )}
      </main>
    </div>
  );
}
