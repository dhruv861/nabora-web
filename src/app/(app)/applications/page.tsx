'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';

const TABS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SHORTLISTED', label: 'Shortlisted' },
  { id: 'HIRED', label: 'Hired' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('');
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-applications', activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab) params.status = activeTab;
      const res = await api.get('/users/me/applications', { params });
      return res.data as { data: any[]; meta: any };
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ jobId, applicationId }: { jobId: string; applicationId: string }) => {
      await api.delete(`/jobs/${jobId}/applications/${applicationId}`);
    },
    onSuccess: () => {
      toast.success('Application withdrawn.');
      setWithdrawTarget(null);
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to withdraw application.');
      setWithdrawTarget(null);
    },
  });

  const applications = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/feed')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">My Applications</span>
      </header>

      {/* Status Tabs */}
      <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? (
          <LoadingState />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No Applications"
            description={activeTab ? `No ${activeTab.toLowerCase()} applications.` : "You haven't applied to any jobs yet."}
            action={{ label: 'Browse Jobs', onClick: () => router.push('/feed') }}
          />
        ) : (
          applications.map((app: any) => (
            <div key={app.id} className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold text-sm text-[var(--color-neutral-900)] truncate cursor-pointer hover:text-[var(--color-primary-600)]" 
                    onClick={() => router.push(`/jobs/${app.job.citySlug}/${app.job.categorySlug}/${app.job.slug}`)}
                  >
                    {app.job.title}
                  </h3>
                  <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                    {app.job.poster?.name ?? 'Employer'} · Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                    ₹{app.job.payRate}/{app.job.payUnit?.toLowerCase()} ·
                    {' '}{app.job.workDate ? new Date(app.job.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Flexible'}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {app.coverNote && (
                <p className="text-xs text-[var(--color-neutral-600)] bg-[var(--color-neutral-50)] rounded-xl p-3 leading-relaxed border border-[var(--color-neutral-100)]">
                  "{app.coverNote}"
                </p>
              )}

              {app.status === 'PENDING' && (
                <div className="border-t border-[var(--color-neutral-100)] pt-3">
                  {withdrawTarget === app.id ? (
                    <div className="flex gap-2 items-center">
                      <p className="text-xs text-[var(--color-neutral-600)] flex-1">Withdraw this application?</p>
                      <button
                        onClick={() => withdrawMutation.mutate({ jobId: app.jobId, applicationId: app.id })}
                        disabled={withdrawMutation.isPending}
                        className="px-3 py-1.5 bg-[var(--color-error-500)] text-white text-xs font-bold rounded-lg transition hover:bg-[var(--color-error-600)] disabled:opacity-50"
                      >
                        {withdrawMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setWithdrawTarget(null)}
                        className="px-3 py-1.5 border border-[var(--color-neutral-200)] text-xs font-bold rounded-lg text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setWithdrawTarget(app.id)}
                      className="text-xs font-bold text-[var(--color-error-600)] hover:text-[var(--color-error-700)] transition"
                    >
                      Withdraw Application
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
