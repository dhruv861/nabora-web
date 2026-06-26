'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/admin/jobs/${id}`, { status: 'DELETED' }); },
    onSuccess: () => { toast.success('Job removed.'); queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', statusFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/jobs', { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });
  const STATUSES = ['', 'PUBLISHED', 'DRAFT', 'CLOSED', 'EXPIRED', 'DELETED'];
  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">Jobs ({data?.meta?.total ?? 0})</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${statusFilter === s ? 'bg-[#6c47ff] text-white' : 'bg-neutral-100 text-neutral-600'}`}>{s || 'All'}</button>
        ))}
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="flex flex-col gap-2">
          {(data?.data ?? []).map((job: any) => (
            <div key={job.id} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-neutral-900 truncate">{job.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{job.city} · {job.categorySlug} · {job.poster?.name} · {format(new Date(job.workDate), 'd MMM yyyy')}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{job._count?.applications} applications</p>
              </div>
              <StatusBadge status={job.status} />
              {job.status !== 'DELETED' && (
                <button onClick={() => deleteMutation.mutate(job.id)} disabled={deleteMutation.isPending}
                  className="px-3 py-1 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition">Remove</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
