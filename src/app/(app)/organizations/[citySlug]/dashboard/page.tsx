'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { ArrowLeft, Briefcase, CalendarDays, Users, FileText, UserPlus, TrendingUp } from 'lucide-react';

export default function OrgDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const orgId = params.citySlug as string;

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['org', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}`); return res.data.data as any; },
  });

  const { data: eventsData } = useQuery({
    queryKey: ['org-events-upcoming', orgId],
    queryFn: async () => {
      const res = await api.get(`/organizations/${orgId}/events`, { params: { status: 'PUBLISHED', limit: '3' } });
      return res.data.data as { data: any[] };
    },
    enabled: !!orgId,
  });

  const { data: members } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}/members`); return res.data.data as any[]; },
  });
  const myRole = members?.find((m: any) => m.user?.id === user?.id)?.role ?? '';

  // Lazy-fetch analytics for hire rate stat
  const { data: analytics } = useQuery({
    queryKey: ['org-analytics', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}/analytics`); return res.data.data as any; },
    enabled: !!orgId,
    staleTime: 300000,
  });

  if (isLoading) return <LoadingState />;
  if (error || !org) return <EmptyState title="Organization not found" description="" action={{ label: 'Back', onClick: () => router.push('/profile') }} />;

  const stats = [
    { label: 'Active Jobs', value: org._count?.jobs ?? 0, icon: <Briefcase size={18} />, onClick: () => router.push(`/jobs/my`) },
    { label: 'Events', value: org._count?.events ?? 0, icon: <CalendarDays size={18} />, onClick: () => router.push(`/organizations/${orgId}/events`) },
    { label: 'Team', value: org._count?.members ?? 0, icon: <Users size={18} />, onClick: () => router.push(`/organizations/${orgId}/members`) },
    { label: 'Hire Rate', value: analytics ? `${(analytics.hireRate * 100).toFixed(0)}%` : '—', icon: <TrendingUp size={18} />, onClick: () => router.push(`/organizations/${orgId}/analytics`) },
  ];

  const upcomingEvents = eventsData?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)] truncate">{org.name}</span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <button key={s.label} onClick={s.onClick}
              className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center gap-3 text-left hover:bg-[var(--color-neutral-50)] transition">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-500)]">{s.icon}</div>
              <div>
                <p className="text-xl font-extrabold text-[var(--color-neutral-900)]">{s.value}</p>
                <p className="text-[10px] text-[var(--color-neutral-500)] font-semibold">{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-1">
          <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1">Quick Actions</p>
          {[
            { label: '+ Post a Job', icon: <Briefcase size={16} />, onClick: () => router.push(`/jobs/create?orgId=${orgId}`) },
            { label: '+ Create Event', icon: <CalendarDays size={16} />, onClick: () => router.push(`/organizations/${orgId}/events/create`) },
            { label: '+ Invite Member', icon: <UserPlus size={16} />, onClick: () => router.push(`/organizations/${orgId}/members`) },
            { label: '📊 View Analytics', icon: <TrendingUp size={16} />, onClick: () => router.push(`/organizations/${orgId}/analytics`) },
          ].map((a) => (
            <button key={a.label} onClick={a.onClick}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] transition">
              {a.icon}{a.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider">Upcoming Events</p>
            <button onClick={() => router.push(`/organizations/${orgId}/events`)} className="text-xs font-bold text-[var(--color-primary-600)] hover:underline">View all →</button>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 text-center">
              <p className="text-sm text-[var(--color-neutral-400)]">No upcoming events.</p>
              <button onClick={() => router.push(`/organizations/${orgId}/events/create`)} className="mt-2 text-xs font-bold text-[var(--color-primary-600)] hover:underline">Create your first event →</button>
            </div>
          ) : (
            upcomingEvents.map((event: any) => (
              <EventCard key={event.id} event={event} orgId={orgId} myRole={myRole} />
            ))
          )}
        </div>

        <button onClick={() => router.push(`/organizations/${orgId}/members`)}
          className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center justify-between hover:bg-[var(--color-neutral-50)] transition">
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
