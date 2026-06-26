'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';

const VERIF_LEVELS = ['NONE', 'BRONZE', 'SILVER', 'GOLD'];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [verificationLevel, setVerificationLevel] = useState('');
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<any>(null);
  const [actionType, setActionType] = useState<'verify' | 'toggle' | 'admin'>('verify');
  const [newVerifLevel, setNewVerifLevel] = useState('SILVER');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, accountType, verificationLevel, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (accountType) params.accountType = accountType;
      if (verificationLevel) params.verificationLevel = verificationLevel;
      const res = await api.get('/admin/users', { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: any }) => { await api.patch(`/admin/users/${id}`, dto); },
    onSuccess: () => { toast.success('User updated.'); setActionTarget(null); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const users = data?.data ?? [];

  return (
    <div className="p-6">
      {actionTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <h2 className="font-bold text-sm">
              {actionType === 'verify' ? 'Change Verification Level' : actionType === 'toggle' ? 'Toggle User Status' : 'Toggle Admin'}
            </h2>
            {actionType === 'verify' && (
              <div className="flex flex-col gap-2">
                {VERIF_LEVELS.map((l) => (
                  <button key={l} onClick={() => setNewVerifLevel(l)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                      newVerifLevel === l ? 'border-[#6c47ff] bg-purple-50 text-purple-700' : 'border-neutral-200 text-neutral-700'
                    }`}>{l}</button>
                ))}
              </div>
            )}
            {actionType === 'toggle' && (
              <p className="text-sm text-neutral-600">
                {actionTarget.isActive ? 'Deactivate' : 'Activate'} <strong>{actionTarget.name}</strong>?
              </p>
            )}
            {actionType === 'admin' && (
              <p className="text-sm text-neutral-600">
                {actionTarget.isAdmin ? 'Remove admin from' : 'Make admin'}: <strong>{actionTarget.name}</strong>?
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setActionTarget(null)} className="flex-1 py-2 border border-neutral-200 rounded-xl text-sm font-bold">Cancel</button>
              <button
                onClick={() => {
                  const dto = actionType === 'verify'
                    ? { verificationLevel: newVerifLevel }
                    : actionType === 'toggle'
                    ? { isActive: !actionTarget.isActive }
                    : { isAdmin: !actionTarget.isAdmin };
                  updateMutation.mutate({ id: actionTarget.id, dto });
                }}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 bg-[#6c47ff] text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-xl font-extrabold text-neutral-900 flex-1">Users ({data?.meta?.total ?? 0})</h1>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm w-48 focus:outline-none" placeholder="Search name/phone" />
        <select value={accountType} onChange={(e) => setAccountType(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none">
          <option value="">All types</option>
          <option value="PERSONAL">Personal</option>
          <option value="ORGANIZATION">Organization</option>
        </select>
        <select value={verificationLevel} onChange={(e) => setVerificationLevel(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none">
          <option value="">All verification</option>
          {VERIF_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingState /> : (
        <div className="flex flex-col gap-3">
          {users.map((u: any) => (
            <div key={u.id} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-3">
              <Avatar src={u.avatarUrl} name={u.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-neutral-900 truncate">{u.name ?? u.phone}</p>
                <p className="text-xs text-neutral-500">{u.phone} · {u.city ?? '—'}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">{u.accountType}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{u.verificationLevel}</span>
                  {!u.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">INACTIVE</span>}
                  {u.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">ADMIN</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => { setActionTarget(u); setActionType('verify'); setNewVerifLevel(u.verificationLevel); }}
                  className="text-[10px] px-2 py-1 border border-neutral-200 rounded-lg font-semibold text-neutral-600 hover:bg-neutral-50 transition">Verify</button>
                <button onClick={() => { setActionTarget(u); setActionType('toggle'); }}
                  className={`text-[10px] px-2 py-1 border rounded-lg font-semibold transition ${
                    u.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => { setActionTarget(u); setActionType('admin'); }}
                  className="text-[10px] px-2 py-1 border border-purple-200 rounded-lg font-semibold text-purple-600 hover:bg-purple-50 transition">
                  {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.meta?.pages ?? 0) > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-neutral-200 rounded-xl text-sm font-bold disabled:opacity-40">← Prev</button>
          <span className="text-sm text-neutral-500 self-center">Page {page} / {data?.meta?.pages}</span>
          <button disabled={page >= (data?.meta?.pages ?? 1)} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-neutral-200 rounded-xl text-sm font-bold disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
