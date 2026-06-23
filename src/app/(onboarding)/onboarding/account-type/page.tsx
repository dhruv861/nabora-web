'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = ['Account Type', 'Profile', 'Skills', 'Location', 'Availability'];

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={[
              'h-1 w-full rounded-full transition-all duration-300',
              idx <= current ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-neutral-200)]',
            ].join(' ')}
          />
          <span className={`text-[10px] font-medium hidden md:block ${idx === current ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-neutral-400)]'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AccountTypePage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [selected, setSelected] = useState<'PERSONAL' | 'ORGANIZATION' | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setIsLoading(true);
    try {
      const res = await api.patch<{ data: { id: string } }>('/users/me', { accountType: selected });
      setUser(res.data.data as Parameters<typeof setUser>[0]);
      router.push('/onboarding/profile');
    } finally {
      setIsLoading(false);
    }
  };

  const types = [
    {
      value: 'PERSONAL' as const,
      icon: '👤',
      title: 'Personal / Worker',
      desc: 'Find gig work, events, and short-term jobs near you',
    },
    {
      value: 'ORGANIZATION' as const,
      icon: '🏢',
      title: 'Organization / Employer',
      desc: 'Post jobs, manage events, and hire skilled workers',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-sm">
        <StepProgress current={0} />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">I am a…</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">Choose your account type</p>
        </div>

        <div className="space-y-3 mb-8">
          {types.map((t) => (
            <button
              key={t.value}
              id={`account-type-${t.value.toLowerCase()}`}
              onClick={() => setSelected(t.value)}
              className={[
                'w-full text-left rounded-2xl border-2 p-5 transition-all duration-150',
                selected === t.value
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] shadow-md'
                  : 'border-[var(--color-neutral-200)] bg-white hover:border-[var(--color-neutral-300)] hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0">{t.icon}</span>
                <div>
                  <p className="font-semibold text-[var(--color-neutral-900)]">{t.title}</p>
                  <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">{t.desc}</p>
                </div>
                {selected === t.value && (
                  <span className="ml-auto shrink-0 text-[var(--color-primary-500)]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <Button fullWidth size="lg" disabled={!selected} isLoading={isLoading} onClick={handleNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
