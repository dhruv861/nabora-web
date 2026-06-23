'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = ['Account Type', 'Profile', 'Skills', 'Location', 'Availability'];
function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex gap-2 mb-8">
      {STEPS.map((_, idx) => (
        <div key={idx} className={`flex-1 h-1 rounded-full transition-all duration-300 ${idx <= current ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-neutral-200)]'}`} />
      ))}
    </div>
  );
}

const options = [
  { value: 'AVAILABLE_NOW',       icon: '🟢', title: 'Available Now',        desc: 'Ready to start immediately' },
  { value: 'AVAILABLE_THIS_WEEK', icon: '🔵', title: 'Available This Week',   desc: 'Open to opportunities this week' },
  { value: 'BUSY',                icon: '🟡', title: 'Busy',                  desc: 'Currently engaged, limited availability' },
  { value: 'UNAVAILABLE',         icon: '⚪', title: 'Unavailable',           desc: 'Not looking for work right now' },
];

export default function AvailabilityPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [selected, setSelected] = useState('AVAILABLE_NOW');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    setIsSaving(true);
    setError('');
    try {
      const res = await api.patch<{ data: object }>('/users/me', { availabilityStatus: selected });
      setUser(res.data.data as Parameters<typeof setUser>[0]);
      router.push('/feed');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-sm">
        <StepProgress current={4} />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Availability</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">Let employers know when you're free</p>
        </div>

        <div className="space-y-3 mb-8">
          {options.map((o) => (
            <button
              key={o.value}
              id={`availability-${o.value.toLowerCase().replace(/_/g, '-')}`}
              onClick={() => setSelected(o.value)}
              className={[
                'w-full text-left rounded-2xl border-2 px-5 py-4 transition-all duration-150',
                selected === o.value
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] shadow-md'
                  : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl shrink-0">{o.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-[var(--color-neutral-900)]">{o.title}</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">{o.desc}</p>
                </div>
                {selected === o.value && (
                  <span className="ml-auto text-[var(--color-primary-500)]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <path fillRule="evenodd" d="M15.07 4.43a1 1 0 0 1 0 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 0 1 1.414-1.414L7 11.22l6.657-6.792a1 1 0 0 1 1.413 0z" />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-[var(--color-error-500)] mb-4">{error}</p>}

        <Button fullWidth size="lg" isLoading={isSaving} onClick={handleFinish}>
          Finish Setup 🎉
        </Button>
      </div>
    </div>
  );
}
