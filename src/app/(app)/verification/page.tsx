'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, Shield, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/Button';

const LEVELS = [
  {
    id: 'BRONZE',
    title: 'Bronze — Phone Verified',
    description: 'Your phone number is verified',
    icon: <Shield size={20} className="text-amber-700" />,
    done: true,
  },
  {
    id: 'SILVER',
    title: 'Silver — ID Verification',
    description: 'Upload a government-issued ID: Aadhaar / PAN / Voter ID',
    icon: <Upload size={20} className="text-[var(--color-neutral-500)]" />,
    done: false,
    action: 'Upload ID Document',
  },
  {
    id: 'GOLD',
    title: 'Gold — Background Check',
    description: 'Complete Silver first to unlock Gold verification',
    icon: <Lock size={20} className="text-[var(--color-neutral-300)]" />,
    done: false,
    locked: true,
  },
];

export default function VerificationPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const res = await api.get(`/users/${user!.id}`);
      return res.data.data as any;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <LoadingState />;

  const level = profile?.verificationLevel ?? 'BRONZE';
  const levelIndex = ['NONE', 'BRONZE', 'SILVER', 'GOLD'].indexOf(level);

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Verification</span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm text-center">
          <div className="text-3xl mb-2">🛡️</div>
          <p className="font-bold text-base text-[var(--color-neutral-900)]">Your level: {level}</p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-1">Verified workers get 3× more views and appear higher in searches.</p>
        </div>

        {LEVELS.map((lvl, idx) => {
          const isCurrentLevel = levelIndex >= idx + 1;
          const isLocked = lvl.locked && levelIndex < idx;
          return (
            <div key={lvl.id} className={`bg-white rounded-3xl border p-5 shadow-sm flex flex-col gap-3 ${
              isCurrentLevel ? 'border-emerald-200' : 'border-[var(--color-neutral-200)]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCurrentLevel ? 'bg-emerald-50' : 'bg-[var(--color-neutral-100)]'
                }`}>
                  {lvl.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isCurrentLevel ? 'text-emerald-700' : 'text-[var(--color-neutral-800)]'}`}>
                    {isCurrentLevel ? '✓ ' : ''}{lvl.title}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{lvl.description}</p>
                </div>
              </div>
              {lvl.action && !isCurrentLevel && !isLocked && (
                <Button size="sm" variant="secondary" onClick={() => {}}>{lvl.action}</Button>
              )}
              {isLocked && (
                <p className="text-xs text-[var(--color-neutral-400)] italic">🔒 Complete Silver verification first</p>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
