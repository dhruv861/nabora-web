'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CITIES = [
  { name: 'Ahmedabad', slug: 'ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Gandhinagar', slug: 'gandhinagar', lat: 23.2156, lng: 72.6369 },
  { name: 'Surat', slug: 'surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Vadodara', slug: 'vadodara', lat: 22.3072, lng: 73.1812 },
  { name: 'Mumbai', slug: 'mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', slug: 'delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', slug: 'bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Pune', slug: 'pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad', slug: 'hyderabad', lat: 17.385, lng: 78.4867 },
];

interface RoleRow {
  title: string;
  description: string;
  vacancies: number;
  payRate: string;
  payUnit: string;
}

const emptyRole = (): RoleRow => ({ title: '', description: '', vacancies: 1, payRate: '', payUnit: 'DAY' });

export default function CreateEventPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);

  // Step 1 — Info
  const [info, setInfo] = useState({ title: '', description: '', startDate: '', endDate: '' });
  // Step 2 — Venue
  const [venue, setVenue] = useState({ venue: '', city: '', citySlug: '', lat: '', lng: '' });
  // Step 3 — Roles
  const [roles, setRoles] = useState<RoleRow[]>([emptyRole()]);

  const inputClass = 'w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white';
  const labelClass = 'block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5';

  // Step 1 submit — create event in DRAFT
  const createEventMutation = useMutation({
    mutationFn: async () => {
      const cityData = CITIES.find((c) => c.slug === venue.citySlug);
      const res = await api.post(`/organizations/${orgId}/events`, {
        title: info.title,
        description: info.description || undefined,
        venue: venue.venue,
        city: venue.city,
        citySlug: venue.citySlug,
        locationLat: Number(venue.lat) || cityData?.lat || 23.0225,
        locationLng: Number(venue.lng) || cityData?.lng || 72.5714,
        startDate: info.startDate,
        endDate: info.endDate,
      });
      return res.data.data as any;
    },
    onSuccess: (event) => {
      setEventId(event.id);
      setStep(3);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to create event.'),
  });

  // Step 3 — add roles then publish
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('No event ID');
      // Add roles
      await api.post(`/events/${eventId}/roles`, {
        roles: roles.map((r) => ({
          title: r.title,
          description: r.description || undefined,
          vacancies: r.vacancies,
          payRate: Number(r.payRate),
          payUnit: r.payUnit,
        })),
      });
      // Publish
      const res = await api.post(`/events/${eventId}/publish`);
      return res.data.data as any;
    },
    onSuccess: (event) => {
      toast.success(`${event.title} published successfully!`);
      router.push(`/organizations/${orgId}/events`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to publish event.'),
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('No event ID');
      if (roles.some((r) => r.title)) {
        await api.post(`/events/${eventId}/roles`, {
          roles: roles.filter((r) => r.title).map((r) => ({
            title: r.title,
            description: r.description || undefined,
            vacancies: r.vacancies,
            payRate: Number(r.payRate) || 0,
            payUnit: r.payUnit,
          })),
        });
      }
    },
    onSuccess: () => {
      toast.success('Event saved as draft.');
      router.push(`/organizations/${orgId}/events`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save draft.'),
  });

  const updateRole = (idx: number, field: keyof RoleRow, value: string | number) =>
    setRoles((rs) => rs.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const canPublish = roles.every((r) => r.title && Number(r.payRate) > 0);

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push(`/organizations/${orgId}/events`)}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Create Event</span>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-neutral-200)]'
              } ${s === step ? 'w-8' : 'w-4'}`} />
            ))}
          </div>
        </div>
        <span className="text-xs text-[var(--color-neutral-400)]">{step}/3</span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* Step 1 — Info */}
        {step === 1 && (
          <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-sm text-[var(--color-neutral-800)]">Event Details</h2>
            <div>
              <label className={labelClass}>Event Name *</label>
              <input className={inputClass} placeholder="Brand Launch Event" value={info.title} onChange={(e) => setInfo((s) => ({ ...s, title: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass} rows={3} placeholder="Tell workers about this event..." value={info.description} onChange={(e) => setInfo((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date & Time *</label>
                <input className={inputClass} type="datetime-local" value={info.startDate} onChange={(e) => setInfo((s) => ({ ...s, startDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>End Date & Time *</label>
                <input className={inputClass} type="datetime-local" value={info.endDate} onChange={(e) => setInfo((s) => ({ ...s, endDate: e.target.value }))} />
              </div>
            </div>
            <Button
              fullWidth
              onClick={() => setStep(2)}
              disabled={!info.title || !info.startDate || !info.endDate}
              className="py-3 font-bold"
            >Next: Venue →</Button>
          </section>
        )}

        {/* Step 2 — Venue */}
        {step === 2 && (
          <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-sm text-[var(--color-neutral-800)]">Venue</h2>
            <div>
              <label className={labelClass}>Venue Name *</label>
              <input className={inputClass} placeholder="CEPT University Auditorium" value={venue.venue} onChange={(e) => setVenue((s) => ({ ...s, venue: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <select
                className={inputClass}
                value={venue.citySlug}
                onChange={(e) => {
                  const c = CITIES.find((x) => x.slug === e.target.value);
                  setVenue((s) => ({ ...s, city: c?.name ?? '', citySlug: c?.slug ?? '', lat: String(c?.lat ?? ''), lng: String(c?.lng ?? '') }));
                }}
              >
                <option value="">Select city...</option>
                {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Latitude</label>
                <input className={inputClass} type="number" step="0.0001" placeholder="23.0228" value={venue.lat} onChange={(e) => setVenue((s) => ({ ...s, lat: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input className={inputClass} type="number" step="0.0001" placeholder="72.5583" value={venue.lng} onChange={(e) => setVenue((s) => ({ ...s, lng: e.target.value }))} />
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-neutral-400)]">Coordinates are used for worker distance calculation. City center is pre-filled when you select a city.</p>
            <Button
              fullWidth
              onClick={() => createEventMutation.mutate()}
              isLoading={createEventMutation.isPending}
              disabled={!venue.venue || !venue.citySlug}
              className="py-3 font-bold"
            >Next: Add Roles →</Button>
          </section>
        )}

        {/* Step 3 — Roles */}
        {step === 3 && (
          <>
            <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
              <h2 className="font-bold text-sm text-[var(--color-neutral-800)]">Workforce Roles</h2>
              <p className="text-xs text-[var(--color-neutral-500)]">Each role will become a separate job listing on Nabora.</p>

              {roles.map((role, idx) => (
                <div key={idx} className="border border-[var(--color-neutral-200)] rounded-2xl p-4 flex flex-col gap-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-neutral-600)]">Role {idx + 1}</span>
                    {roles.length > 1 && (
                      <button onClick={() => setRoles((rs) => rs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Title *</label>
                    <input className={inputClass} placeholder="e.g. Brand Promoter" value={role.title} onChange={(e) => updateRole(idx, 'title', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className={labelClass}>Vacancies</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateRole(idx, 'vacancies', Math.max(1, role.vacancies - 1))} className="w-8 h-8 rounded-lg border border-[var(--color-neutral-200)] flex items-center justify-center text-sm font-bold hover:bg-[var(--color-neutral-50)] transition">−</button>
                        <span className="w-8 text-center text-sm font-bold text-[var(--color-neutral-800)]">{role.vacancies}</span>
                        <button onClick={() => updateRole(idx, 'vacancies', role.vacancies + 1)} className="w-8 h-8 rounded-lg border border-[var(--color-neutral-200)] flex items-center justify-center text-sm font-bold hover:bg-[var(--color-neutral-50)] transition">+</button>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Pay (₹) *</label>
                      <input className={inputClass} type="number" min={1} placeholder="800" value={role.payRate} onChange={(e) => updateRole(idx, 'payRate', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>Per</label>
                      <select className={inputClass} value={role.payUnit} onChange={(e) => updateRole(idx, 'payUnit', e.target.value)}>
                        <option value="DAY">Day</option>
                        <option value="HOUR">Hour</option>
                        <option value="FIXED">Fixed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Description <span className="font-normal normal-case text-[var(--color-neutral-400)]">(optional)</span></label>
                    <input className={inputClass} placeholder="Brief role description..." value={role.description} onChange={(e) => updateRole(idx, 'description', e.target.value)} />
                  </div>
                </div>
              ))}

              <button
                onClick={() => setRoles((rs) => [...rs, emptyRole()])}
                className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition py-2"
              >
                <Plus size={16} /> Add Another Role
              </button>
            </section>

            <div className="flex gap-3">
              <button
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending || publishMutation.isPending}
                className="flex-1 py-3 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition disabled:opacity-50"
              >Save as Draft</button>
              <Button
                className="flex-1 py-3 font-bold"
                onClick={() => publishMutation.mutate()}
                isLoading={publishMutation.isPending}
                disabled={!canPublish}
              >Publish Event</Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
