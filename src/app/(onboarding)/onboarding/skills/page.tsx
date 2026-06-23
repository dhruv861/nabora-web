'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { SkillChip } from '@/components/SkillChip';
import { api } from '@/lib/api';

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

interface Skill { id: string; name: string; slug: string; category: string; }

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get<{ data: Skill[] }>('/skills')
      .then((r) => setSkills(r.data.data))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleSkill = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    setIsSaving(true);
    try {
      if (selected.size > 0) {
        // Ensure worker profile exists
        await api.post('/users/me/worker-profile', {}).catch(() => {});
        await api.post('/users/me/skills', {
          skills: Array.from(selected).map((skillId) => ({ skillId, yearsExp: 0 })),
        });
      }
      router.push('/onboarding/location');
    } catch {
      router.push('/onboarding/location');
    } finally {
      setIsSaving(false);
    }
  };

  const grouped: Record<string, Skill[]> = skills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] ?? []).push(s);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-sm">
        <StepProgress current={2} />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Your Skills</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">Select skills to show on your profile</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {Object.entries(grouped).map(([category, catSkills]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-neutral-400)] mb-2.5">
                  {category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {catSkills.map((s) => (
                    <SkillChip
                      key={s.id}
                      label={s.name}
                      variant={selected.has(s.id) ? 'selected' : 'default'}
                      onClick={() => toggleSkill(s.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <p className="text-xs text-center text-[var(--color-primary-600)] mb-4 font-medium">
            {selected.size} skill{selected.size > 1 ? 's' : ''} selected
          </p>
        )}

        <Button fullWidth size="lg" isLoading={isSaving} onClick={handleNext}>
          Continue →
        </Button>
        <button onClick={() => router.push('/onboarding/location')} className="mt-3 w-full text-center text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]">
          Skip for now
        </button>
      </div>
    </div>
  );
}
