'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { ArrowLeft, Briefcase, CalendarDays, Users, FileText, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/Button';

export default function OrgDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const orgId = params.id as string;

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['org', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}`); return res.data.data as any; },
  });

  if (isLoading) return <LoadingState />;
  if (error || !org) return <EmptyState title="Organization not found" description="" action={{ label: 'Back', onClick: () => router.push('/profile') }} />;

  const stats = [
    { label: 'Active Jobs', value: org._count?.jobs ?? 0, icon: <Briefcase size={18} /> },
    { label: 'Events', value: org._count?.events ?? 0, icon: <CalendarDays size={18} /> },
    { label: 'Team', value: org._count?.members ?? 0, icon: <Users size={18} /> },
    { label: 'Invoices', value: '—', icon: <FileText size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)] truncate">{org.name}</span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        {/* Org header card */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-neutral-100)] flex items-center justify-center overflow-hidden shrink-0">
            {org.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-[var(--color-neutral-400)]">{org.name[0]}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-[var(--color-neutral-900)] truncate">{org.name}</h1>
              {org.isVerified && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Verified</span>}
            </div>
            {org.city && <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{org.city}</p>}
            {org.description && <p className="text-xs text-[var(--color-neutral-400)] mt-1 truncate">{org.description}</p>}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-500)]">{s.icon}</div>
              <div>
                <p className="text-xl font-extrabold text-[var(--color-neutral-900)]">{s.value}</p>
                <p className="text-[10px] text-[var(--color-neutral-500)] font-semibold">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-2">
          <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1">Quick Actions</p>
          {[
            { label: '+ Post a Job', icon: <Briefcase size={16} />, onClick: () => router.push(`/jobs/create?orgId=${orgId}`) },
            { label: '+ Create Event', icon: <CalendarDays size={16} />, onClick: () => router.push(`/organizations/${orgId}/events/create`), disabled: true, hint: 'Coming in Sprint 6' },
            { label: '+ Invite Member', icon: <UserPlus size={16} />, onClick: () => router.push(`/organizations/${orgId}/members`) },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.hint}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition ${
                a.disabled
                  ? 'text-[var(--color-neutral-300)] cursor-not-allowed'
                  : 'text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]'
              }`}
            >
              {a.icon}
              {a.label}
              {a.hint && <span className="ml-auto text-[10px] font-normal text-[var(--color-neutral-400)]">{a.hint}</span>}
            </button>
          ))}
        </div>

        {/* Team shortcut */}
        <button
          onClick={() => router.push(`/organizations/${orgId}/members`)}
          className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center justify-between hover:bg-[var(--color-neutral-50)] transition"
        >
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[var(--color-primary-500)]" />
            <span className="font-bold text-sm text-[var(--color-neutral-800)]">Team Members</span>
          </div>
          <span className="text-[var(--color-neutral-400)] text-sm">→</span>
        </button>
      </main>
    </div>
  );
}
