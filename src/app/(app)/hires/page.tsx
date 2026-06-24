'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, Briefcase, CalendarDays, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'WORKER' | 'EMPLOYER';

export default function HiresDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>('WORKER');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-hires', role, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = { role };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/hires/my', { params });
      return res.data as { data: any[]; meta: any };
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (hireId: string) => {
      await api.post(`/hires/${hireId}/complete`);
    },
    onSuccess: () => {
      toast.success('Hire marked as completed!');
      queryClient.invalidateQueries({ queryKey: ['my-hires'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to complete hire.');
    },
  });

  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);

  const hires = data?.data ?? [];

  const STATUS_FILTERS = [
    { id: '', label: 'All' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
    { id: 'DISPUTED', label: 'Disputed' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/feed')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">My Hires</span>
      </header>

      {/* Role Tabs */}
      <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 pt-3 pb-0">
        <div className="flex bg-[var(--color-neutral-100)] p-1 rounded-2xl mb-3">
          {(['WORKER', 'EMPLOYER'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setStatusFilter(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                role === r
                  ? 'bg-white text-[var(--color-neutral-900)] shadow-sm'
                  : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]'
              }`}
            >
              As {r === 'WORKER' ? 'Worker' : 'Employer'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 pb-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition ${
                statusFilter === f.id
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? (
          <LoadingState />
        ) : hires.length === 0 ? (
          <EmptyState
            title="No Hires Found"
            description={role === 'WORKER' ? "You haven't been hired for any jobs yet." : "You haven't hired anyone yet."}
            action={{ label: 'Browse Jobs', onClick: () => router.push('/feed') }}
          />
        ) : (
          hires.map((hire: any) => {
            const counterparty = role === 'WORKER' ? hire.employer : hire.worker;
            const isEmployer = role === 'EMPLOYER';

            return (
              <div
                key={hire.id}
                className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={counterparty?.avatarUrl} name={counterparty?.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-sm text-[var(--color-neutral-900)] truncate cursor-pointer hover:text-[var(--color-primary-600)]"
                        onClick={() => router.push(`/hires/${hire.id}`)}
                      >
                        {hire.job?.title}
                      </h3>
                      <StatusBadge status={hire.status} />
                    </div>
                    <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                      {isEmployer ? 'Worker' : 'Employer'}: {counterparty?.name ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-neutral-400)] font-semibold">
                      {hire.job?.workDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(hire.job.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Briefcase size={10} />
                        ₹{hire.agreedRate}/{hire.agreedUnit?.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-[var(--color-neutral-100)] pt-3">
                  <button
                    onClick={() => router.push(`/hires/${hire.id}`)}
                    className="flex-1 py-2 border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] text-xs font-bold rounded-xl hover:bg-[var(--color-neutral-50)] transition"
                  >
                    View Details
                  </button>

                  {/* Chat button — enabled in Sprint 4 */}
                  {hire.chat?.id ? (
                    <button
                      onClick={() => router.push(`/chats/${hire.chat.id}`)}
                      className="p-2 border border-[var(--color-primary-200)] rounded-xl text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] transition"
                      title="Open chat"
                    >
                      <MessageCircle size={16} />
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Chat not yet available"
                      className="p-2 border border-[var(--color-neutral-200)] rounded-xl text-[var(--color-neutral-300)] cursor-not-allowed"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}

                  {isEmployer && hire.status === 'ACTIVE' && (
                    confirmComplete === hire.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { completeMutation.mutate(hire.id); setConfirmComplete(null); }}
                          className="px-3 py-2 bg-[var(--color-success-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-success-600)] transition"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmComplete(null)}
                          className="px-3 py-2 border border-[var(--color-neutral-200)] text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmComplete(hire.id)}
                        className="px-3 py-2 bg-[var(--color-primary-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-primary-600)] transition"
                      >
                        Complete
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
