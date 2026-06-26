'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const verifyMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/admin/organizations/${id}`, { isVerified: true }); },
    onSuccess: () => { toast.success('Organization verified.'); queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orgs', search],
    queryFn: async () => {
      const res = await api.get('/admin/organizations', { params: search ? { search } : {} });
      return res.data.data as { data: any[]; meta: any };
    },
  });
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-extrabold text-neutral-900 flex-1">Organizations ({data?.meta?.total ?? 0})</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none" placeholder="Search" />
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="flex flex-col gap-3">
          {(data?.data ?? []).map((org: any) => (
            <div key={org.id} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-lg font-bold text-neutral-400">{org.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-neutral-900 truncate">{org.name}</p>
                  {org.isVerified && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">✓ Verified</span>}
                </div>
                <p className="text-xs text-neutral-500">{org.city ?? '—'} · {org._count?.members} members · {org._count?.jobs} jobs</p>
              </div>
              {!org.isVerified && (
                <button onClick={() => verifyMutation.mutate(org.id)} disabled={verifyMutation.isPending}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50">Verify</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
