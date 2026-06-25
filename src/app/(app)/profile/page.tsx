'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AvailabilityIndicator } from '@/components/AvailabilityIndicator';
import { SkillChip } from '@/components/SkillChip';
import { ReliabilityBar } from '@/components/ReliabilityBar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Edit2, Star, Briefcase, MapPin, Building2, Camera, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/Button';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  OPERATIONS_MANAGER: 'bg-blue-100 text-blue-700',
  EVENT_MANAGER: 'bg-teal-100 text-teal-700',
  FIELD_COORDINATOR: 'bg-amber-100 text-amber-700',
  FINANCE_MANAGER: 'bg-emerald-100 text-emerald-700',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner', OPERATIONS_MANAGER: 'Ops Manager',
  EVENT_MANAGER: 'Event Manager', FIELD_COORDINATOR: 'Coordinator', FINANCE_MANAGER: 'Finance',
};

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated } = useAuthStore();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['my-profile', authUser?.id],
    queryFn: async () => { const res = await api.get(`/users/${authUser!.id}`); return res.data.data as any; },
    enabled: !!authUser?.id,
  });

  const { data: orgs } = useQuery({
    queryKey: ['my-orgs'],
    queryFn: async () => { const res = await api.get('/users/me/organizations'); return res.data.data as any[]; },
    enabled: !!authUser?.id,
  });

  if (!isAuthenticated) { router.push('/login'); return null; }
  if (isLoading) return <LoadingState />;
  if (error || !profile) return <EmptyState title="Profile not found" description="" action={{ label: 'Go to Feed', onClick: () => router.push('/feed') }} />;

  const wp = profile.workerProfile;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/feed')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">My Profile</span>
        </div>
        <Button size="sm" variant="secondary" leftIcon={<Edit2 size={14} />} onClick={() => router.push('/profile/edit')}>Edit</Button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Avatar + basic info */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 flex flex-col items-center gap-3 shadow-sm text-center">
          <Avatar src={profile.avatarUrl} name={profile.name} size="xl" />
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-bold text-lg text-[var(--color-neutral-900)]">{profile.name ?? 'No name set'}</h1>
              <VerificationBadge level={profile.verificationLevel} />
            </div>
            {wp?.headline && <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">{wp.headline}</p>}
            {(profile.city || profile.area) && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-[var(--color-neutral-400)]">
                <MapPin size={12} /><span>{[profile.area, profile.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
          <AvailabilityIndicator status={profile.availabilityStatus} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', value: profile.averageRating > 0 ? profile.averageRating.toFixed(1) : '—' },
            { label: 'Jobs Done', value: profile.completedJobCount ?? 0 },
            { label: 'Reliability', value: `${Math.round((profile.reliabilityScore ?? 0))}%` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-3 text-center shadow-sm">
              <div className="text-lg font-bold text-[var(--color-neutral-900)]">{stat.value}</div>
              <div className="text-[10px] text-[var(--color-neutral-500)] font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reliability bar */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Reliability Score</p>
          <ReliabilityBar score={profile.reliabilityScore ?? 0} />
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm">
            <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">About</p>
            <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Skills */}
        {wp?.skills?.length > 0 && (
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm">
            <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-3">Skills</p>
            <div className="flex flex-wrap gap-2">
              {wp.skills.map((us: any) => <SkillChip key={us.skillId} name={us.skill.name} slug={us.skill.slug} />)}
            </div>
          </div>
        )}

        {/* Portfolio shortcut */}
        <button
          onClick={() => router.push('/portfolio')}
          className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center justify-between hover:bg-[var(--color-neutral-50)] transition"
        >
          <div className="flex items-center gap-3">
            <Camera size={18} className="text-[var(--color-primary-500)]" />
            <div className="text-left">
              <p className="font-bold text-sm text-[var(--color-neutral-800)]">Portfolio</p>
              <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                {wp?.portfolioItems?.length > 0 ? `${wp.portfolioItems.length} photo${wp.portfolioItems.length !== 1 ? 's' : ''}` : 'Add your work photos'}
              </p>
            </div>
          </div>
          <span className="text-[var(--color-neutral-400)]">→</span>
        </button>

        {/* Organizations */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider">Organizations</p>
            <button onClick={() => router.push('/organizations/create')} className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]">
              <Plus size={12} /> New
            </button>
          </div>
          {!orgs?.length ? (
            <button onClick={() => router.push('/organizations/create')} className="flex items-center gap-3 py-2 text-sm text-[var(--color-neutral-500)] hover:text-[var(--color-primary-600)] transition">
              <Building2 size={16} /> Create your first organization
            </button>
          ) : (
            orgs.map((org: any) => (
              <button
                key={org.id}
                onClick={() => router.push(`/organizations/${org.id}/dashboard`)}
                className="flex items-center gap-3 hover:bg-[var(--color-neutral-50)] rounded-xl p-2 -mx-2 transition"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--color-neutral-100)] flex items-center justify-center overflow-hidden shrink-0">
                  {org.logoUrl ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-[var(--color-neutral-400)]">{org.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{org.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[org.myRole] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[org.myRole] ?? org.myRole}
                  </span>
                </div>
                <span className="text-[var(--color-neutral-400)] text-sm">→</span>
              </button>
            ))
          )}
        </div>

        {/* Account */}
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm">
          <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-3">Account</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-neutral-500)]">Phone</span>
              <span className="font-medium text-[var(--color-neutral-800)]">{profile.phone}</span>
            </div>
            {profile.email && (
              <div className="flex justify-between">
                <span className="text-[var(--color-neutral-500)]">Email</span>
                <span className="font-medium text-[var(--color-neutral-800)]">{profile.email}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-neutral-500)]">Account Type</span>
              <StatusBadge status={profile.accountType} />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-[var(--color-neutral-100)]">
            {[
              { label: 'Verification', icon: <Shield size={14} />, route: '/verification' },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.route)} className="flex items-center gap-2 text-sm text-[var(--color-neutral-600)] hover:text-[var(--color-primary-600)] transition">
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
