'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE_NOW', label: 'Available Now' },
  { value: 'AVAILABLE_THIS_WEEK', label: 'Available This Week' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

export default function ProfileEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser, setUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', authUser?.id],
    queryFn: async () => {
      const res = await api.get(`/users/${authUser!.id}`);
      return res.data as any;
    },
    enabled: !!authUser?.id,
  });

  const [form, setForm] = useState({
    name: '',
    bio: '',
    email: '',
    upiId: '',
    availabilityStatus: 'AVAILABLE_NOW',
    // worker profile
    headline: '',
    categorySlug: '',
    yearsExp: 0,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? '',
        bio: profile.bio ?? '',
        email: profile.email ?? '',
        upiId: profile.upiId ?? '',
        availabilityStatus: profile.availabilityStatus ?? 'AVAILABLE_NOW',
        headline: profile.workerProfile?.headline ?? '',
        categorySlug: profile.workerProfile?.categorySlug ?? '',
        yearsExp: profile.workerProfile?.yearsExp ?? 0,
      });
    }
  }, [profile]);

  const updateMeMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/users/me', {
        name: form.name || undefined,
        bio: form.bio || undefined,
        email: form.email || undefined,
        upiId: form.upiId || undefined,
        availabilityStatus: form.availabilityStatus,
      });

      // Update worker profile if it exists
      if (profile?.workerProfile) {
        await api.patch('/users/me/worker-profile', {
          headline: form.headline || undefined,
          categorySlug: form.categorySlug || undefined,
          yearsExp: Number(form.yearsExp),
        });
      } else if (form.headline || form.categorySlug) {
        // Create worker profile if not exists but user filled fields
        await api.post('/users/me/worker-profile', {
          headline: form.headline || undefined,
          categorySlug: form.categorySlug || undefined,
          yearsExp: Number(form.yearsExp),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Profile updated successfully!');
      router.push('/profile');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to update profile');
    },
  });

  if (isLoading) return <LoadingState />;

  const field = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const inputClass = 'w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white';
  const labelClass = 'block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Edit Profile</span>
        </div>
        <Button
          size="sm"
          onClick={() => updateMeMutation.mutate()}
          isLoading={updateMeMutation.isPending}
        >
          Save
        </Button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Personal Info */}
        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-bold text-sm text-[var(--color-neutral-800)]">Personal Info</h2>

          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} placeholder="Your name" {...field('name')} />
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              className={inputClass}
              rows={3}
              maxLength={300}
              placeholder="Tell employers a bit about yourself..."
              {...field('bio')}
            />
            <div className="text-right text-[10px] text-[var(--color-neutral-400)] mt-1">{form.bio.length}/300</div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" placeholder="you@example.com" {...field('email')} />
          </div>

          <div>
            <label className={labelClass}>UPI ID</label>
            <input className={inputClass} placeholder="yourname@upi" {...field('upiId')} />
          </div>

          <div>
            <label className={labelClass}>Availability</label>
            <select className={inputClass} {...field('availabilityStatus')}>
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Worker Profile */}
        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-bold text-sm text-[var(--color-neutral-800)]">Worker Profile</h2>

          <div>
            <label className={labelClass}>Headline</label>
            <input className={inputClass} placeholder="e.g. Freelance Photographer & Event Promoter" {...field('headline')} />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <input className={inputClass} placeholder="e.g. photographer" {...field('categorySlug')} />
          </div>

          <div>
            <label className={labelClass}>Years of Experience</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              max={50}
              {...field('yearsExp')}
            />
          </div>
        </section>

        <Button
          fullWidth
          onClick={() => updateMeMutation.mutate()}
          isLoading={updateMeMutation.isPending}
          className="py-3 font-bold"
        >
          {updateMeMutation.isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </main>
    </div>
  );
}
