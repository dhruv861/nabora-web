'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes', statusFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/disputes', { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, res }: { id: string; status: string; res: string }) => {
      await api.patch(`/disputes/${id}`, { status, resolution: res || undefined });
    },
    onSuccess: () => { toast.success('Dispute updated.'); setExpanded(null); setResolution(''); queryClient.invalidateQueries({ queryKey: ['admin-disputes'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const STATUSES = ['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
  const disputes = data?.data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">Disputes ({data?.meta?.total ?? 0})</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              statusFilter === s ? 'bg-[#6c47ff] text-white' : 'bg-neutral-100 text-neutral-600'
            }`}>{s || 'All'}</button>
        ))}
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="flex flex-col gap-3">
          {disputes.map((d: any) => (
            <div key={d.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <button onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-neutral-900 truncate">{d.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {d.raisedBy.name} • {d.hire.job.title} • {new Date(d.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </button>
              {expanded === d.id && (
                <div className="border-t border-neutral-100 p-4 flex flex-col gap-3">
                  <p className="text-sm text-neutral-700 leading-relaxed">{d.description ?? 'No description.'}</p>
                  <p className="text-xs text-neutral-500">{d._count?.evidence ?? 0} evidence file(s)</p>
                  <div className="flex flex-col gap-2">
                    <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none">
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
                      rows={2} placeholder="Resolution note..." className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none resize-none" />
                    <button
                      onClick={() => resolveMutation.mutate({ id: d.id, status: resolveStatus, res: resolution })}
                      disabled={resolveMutation.isPending}
                      className="py-2 bg-[#6c47ff] text-white rounded-xl text-sm font-bold disabled:opacity-50"
                    >{resolveMutation.isPending ? 'Saving...' : 'Submit'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
