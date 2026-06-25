'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CITIES = [
  { name: 'Ahmedabad', slug: 'ahmedabad' },
  { name: 'Gandhinagar', slug: 'gandhinagar' },
  { name: 'Surat', slug: 'surat' },
  { name: 'Vadodara', slug: 'vadodara' },
  { name: 'Mumbai', slug: 'mumbai' },
  { name: 'Delhi', slug: 'delhi' },
  { name: 'Bangalore', slug: 'bangalore' },
  { name: 'Pune', slug: 'pune' },
  { name: 'Hyderabad', slug: 'hyderabad' },
];

const BIZ_TYPES = ['Event Management', 'BTL Agency', 'Marketing', 'Brand Activation', 'Production House', 'Other'];

export default function CreateOrganizationPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    bizType: '',
    city: '',
    citySlug: '',
    address: '',
    gstin: '',
    website: '',
    logoUrl: '',
  });
  const [logoUploading, setLogoUploading] = useState(false);

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [key]: e.target.value })),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'LOGO');
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((s) => ({ ...s, logoUrl: res.data.data.url }));
      toast.success('Logo uploaded!');
    } catch { toast.error('Logo upload failed.'); }
    finally { setLogoUploading(false); }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/organizations', {
        name: form.name,
        description: form.bizType ? `[${form.bizType}] ${form.description}` : form.description || undefined,
        city: form.city || undefined,
        citySlug: form.citySlug || undefined,
        address: form.address || undefined,
        gstin: form.gstin || undefined,
        website: form.website || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      return res.data.data as any;
    },
    onSuccess: (org) => {
      toast.success(`${org.name} created!`);
      router.push(`/organizations/${org.id}/dashboard`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to create organization.'),
  });

  const inputClass = 'w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white';
  const labelClass = 'block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Create Organization</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} isLoading={createMutation.isPending} disabled={!form.name.trim()}>
          Create
        </Button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="w-24 h-24 rounded-3xl bg-[var(--color-neutral-100)] border-2 border-dashed border-[var(--color-neutral-300)] flex items-center justify-center hover:border-[var(--color-primary-400)] transition overflow-hidden"
          >
            {form.logoUrl
              ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              : logoUploading
              ? <Loader2 size={24} className="animate-spin text-[var(--color-neutral-400)]" />
              : <Building2 size={28} className="text-[var(--color-neutral-400)]" />}
          </button>
          <p className="text-xs text-[var(--color-neutral-400)]">Tap to upload logo (optional)</p>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>

        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
          <div>
            <label className={labelClass}>Organization Name *</label>
            <input className={inputClass} placeholder="EventCo" {...f('name')} />
          </div>

          <div>
            <label className={labelClass}>Type of Business</label>
            <div className="flex flex-wrap gap-2">
              {BIZ_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, bizType: s.bizType === t ? '' : t }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    form.bizType === t
                      ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]'
                      : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:border-[var(--color-neutral-300)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea className={inputClass} rows={3} placeholder="Tell workers about your organization..." value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>City *</label>
            <select className={inputClass} value={form.city} onChange={(e) => {
              const c = CITIES.find((x) => x.name === e.target.value);
              setForm((s) => ({ ...s, city: c?.name ?? '', citySlug: c?.slug ?? '' }));
            }}>
              <option value="">Select city...</option>
              {CITIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input className={inputClass} placeholder="SG Highway, Ahmedabad" {...f('address')} />
          </div>

          <div>
            <label className={labelClass}>GSTIN <span className="font-normal normal-case text-[var(--color-neutral-400)]">(optional)</span></label>
            <input className={inputClass} placeholder="24XXXXX1234Z1ZX" maxLength={15} {...f('gstin')} />
          </div>

          <div>
            <label className={labelClass}>Website <span className="font-normal normal-case text-[var(--color-neutral-400)]">(optional)</span></label>
            <input className={inputClass} type="url" placeholder="https://eventco.in" {...f('website')} />
          </div>
        </section>

        <Button fullWidth onClick={() => createMutation.mutate()} isLoading={createMutation.isPending} disabled={!form.name.trim()} className="py-3 font-bold">
          Create Organization
        </Button>
      </main>
    </div>
  );
}
