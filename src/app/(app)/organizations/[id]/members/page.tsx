'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft, UserPlus, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  OPERATIONS_MANAGER: 'bg-blue-100 text-blue-700',
  EVENT_MANAGER: 'bg-teal-100 text-teal-700',
  FIELD_COORDINATOR: 'bg-amber-100 text-amber-700',
  FINANCE_MANAGER: 'bg-emerald-100 text-emerald-700',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  OPERATIONS_MANAGER: 'Operations Manager',
  EVENT_MANAGER: 'Event Manager',
  FIELD_COORDINATOR: 'Field Coordinator',
  FINANCE_MANAGER: 'Finance Manager',
};

const ALL_ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== 'OWNER');

function InviteSheet({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('EVENT_MANAGER');

  const inviteMutation = useMutation({
    mutationFn: async () => { await api.post(`/organizations/${orgId}/members/invite`, { phone, role }); },
    onSuccess: () => {
      toast.success('Invitation sent!');
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to invite member.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 flex flex-col gap-4">
        <h2 className="font-bold text-base text-[var(--color-neutral-900)]">Invite Team Member</h2>

        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Phone Number *</label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2.5 bg-[var(--color-neutral-100)] border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)]">+91</span>
            <input
              className="flex-1 px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
              placeholder="9876543210"
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Role *</label>
          <div className="flex flex-col gap-1.5">
            {ALL_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition ${
                  role === r
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  role === r ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-neutral-300)]'
                }`}>
                  {role === r && <div className="w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />}
                </div>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition">Cancel</button>
          <Button className="flex-1" onClick={() => inviteMutation.mutate()} isLoading={inviteMutation.isPending} disabled={phone.length < 10}>
            Send Invite
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OrgMembersPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const orgId = params.id as string;
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}/members`); return res.data.data as any[]; },
  });

  const myRole = members?.find((m: any) => m.user?.id === user?.id)?.role ?? '';
  const isOwner = myRole === 'OWNER';

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/organizations/${orgId}/members/${userId}`, { role });
    },
    onSuccess: () => { toast.success('Role updated.'); queryClient.invalidateQueries({ queryKey: ['org-members', orgId] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => { await api.delete(`/organizations/${orgId}/members/${userId}`); },
    onSuccess: () => { toast.success('Member removed.'); setRemoveTarget(null); queryClient.invalidateQueries({ queryKey: ['org-members', orgId] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {showInvite && <InviteSheet orgId={orgId} onClose={() => setShowInvite(false)} />}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/organizations/${orgId}/dashboard`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Team Members</span>
        </div>
        {isOwner && (
          <Button size="sm" leftIcon={<UserPlus size={14} />} onClick={() => setShowInvite(true)}>Invite</Button>
        )}
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? <LoadingState /> : !members?.length ? (
          <EmptyState title="No Members" description="Invite team members to collaborate." action={{ label: 'Invite', onClick: () => setShowInvite(true) }} />
        ) : (
          members.map((m: any) => {
            const isMe = m.user?.id === user?.id;
            const isPending = !m.joinedAt;
            return (
              <div key={m.userId} className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 flex items-start gap-3 shadow-sm">
                <Avatar src={m.user?.avatarUrl} name={m.user?.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{m.user?.name ?? m.user?.phone}</p>
                    {isMe && <span className="text-[10px] text-[var(--color-neutral-400)] font-semibold">You</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    {isPending && <span className="text-[10px] text-amber-600 font-semibold">Pending</span>}
                    {!isPending && m.joinedAt && (
                      <span className="text-[10px] text-[var(--color-neutral-400)]">
                        Joined {new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {isOwner && !isMe && (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Change role select */}
                    <div className="relative">
                      <select
                        value={m.role}
                        onChange={(e) => changeRoleMutation.mutate({ userId: m.userId, role: e.target.value })}
                        className="pl-2 pr-6 py-1.5 border border-[var(--color-neutral-200)] rounded-lg text-[10px] font-bold text-[var(--color-neutral-600)] focus:outline-none appearance-none bg-white"
                      >
                        {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] pointer-events-none" />
                    </div>
                    {/* Remove */}
                    {removeTarget === m.userId ? (
                      <div className="flex gap-1">
                        <button onClick={() => removeMutation.mutate(m.userId)} disabled={removeMutation.isPending} className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold">
                          {removeMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                        </button>
                        <button onClick={() => setRemoveTarget(null)} className="px-2 py-1 border border-[var(--color-neutral-200)] rounded-lg text-[10px] font-bold">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setRemoveTarget(m.userId)} className="w-6 h-6 flex items-center justify-center rounded-lg border border-[var(--color-error-200)] text-[var(--color-error-500)] hover:bg-red-50 transition text-sm font-bold">×</button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
