'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

export default function ProfilePage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleNext = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    setIsLoading(true);
    setError('');
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const form = new FormData();
        form.append('file', avatarFile);
        const upRes = await api.post<{ data: { url: string } }>('/upload?type=AVATAR', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        avatarUrl = upRes.data.data.url;
      }

      const res = await api.patch<{ data: object }>('/users/me', {
        name: name.trim(),
        bio: bio.trim() || undefined,
        avatarUrl,
      });
      setUser(res.data.data as Parameters<typeof setUser>[0]);
      router.push('/onboarding/skills');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-sm">
        <StepProgress current={1} />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Your Profile</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">Help others know who you are</p>
        </div>

        {/* Avatar Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-[var(--color-neutral-300)] flex items-center justify-center overflow-hidden hover:border-[var(--color-primary-400)] transition-colors bg-[var(--color-neutral-50)]"
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Avatar preview" width={96} height={96} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="text-center text-[var(--color-neutral-400)]">
                  <div className="text-2xl mb-1">📷</div>
                  <span className="text-[10px]">Upload photo</span>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} id="avatar-upload" />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="name-input" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Full Name *</label>
            <input
              id="name-input"
              type="text"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-neutral-300)] text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] transition-all"
            />
          </div>
          <div>
            <label htmlFor="bio-input" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Bio <span className="text-[var(--color-neutral-400)] font-normal">(optional)</span></label>
            <textarea
              id="bio-input"
              placeholder="Tell employers about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-neutral-300)] text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] resize-none transition-all"
            />
            <p className="text-xs text-right text-[var(--color-neutral-400)] mt-0.5">{bio.length}/300</p>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-error-500)] mb-4">{error}</p>}

        <Button fullWidth size="lg" isLoading={isLoading} onClick={handleNext}>Continue →</Button>
        <button onClick={() => router.push('/onboarding/skills')} className="mt-3 w-full text-center text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]">
          Skip for now
        </button>
      </div>
    </div>
  );
}
