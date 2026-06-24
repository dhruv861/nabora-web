'use client';

import React from 'react';
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
import { ArrowLeft, Edit2, Star, Briefcase, MapPin } from 'lucide-react';
import { Button } from '@/components/Button';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated } = useAuthStore();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['my-profile', authUser?.id],
    queryFn: async () => {
      const res = await api.get(`/users/${authUser!.id}`);
      return res.data as any;
    },
    enabled: !!authUser?.id,
  });

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (isLoading) return <LoadingState />;

  if (error || !profile) {
    return (
      <EmptyState
        title="Profile not found"
        description="We couldn't load your profile. Please try again."
        action={{ label: 'Go to Feed', onClick: () => router.push('/feed') }}
      />
    );
  }

  const wp = profile.workerProfile;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/feed')}
            className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">My Profile</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Edit2 size={14} />}
          onClick={() => router.push('/profile/edit')}
        >
          Edit
        </Button>
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
            {wp?.headline && (
              <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">{wp.headline}</p>
            )}
            {(profile.city || profile.area) && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-[var(--color-neutral-400)]">
                <MapPin size={12} />
                <span>{[profile.area, profile.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
          <AvailabilityIndicator status={profile.availabilityStatus} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', value: profile.averageRating > 0 ? profile.averageRating.toFixed(1) : '—', icon: <Star size={14} /> },
            { label: 'Jobs Done', value: profile.completedJobCount ?? 0, icon: <Briefcase size={14} /> },
            { label: 'Reliability', value: `${Math.round((profile.reliabilityScore ?? 0) * 100)}%`, icon: null },
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
        {wp?.skills && wp.skills.length > 0 && (
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm">
            <p className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-3">Skills</p>
            <div className="flex flex-wrap gap-2">
              {wp.skills.map((us: any) => (
                <SkillChip key={us.skillId} name={us.skill.name} slug={us.skill.slug} />
              ))}
            </div>
          </div>
        )}

        {/* Account info */}
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
        </div>
      </main>
    </div>
  );
}
