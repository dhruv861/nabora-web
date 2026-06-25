'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { SkillChip } from '@/components/SkillChip';
import { StatusBadge } from '@/components/StatusBadge';
import { StarRating } from '@/components/StarRating';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft, ChevronDown, ChevronUp, Star, MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Bulk Hire Modal ────────────────────────────────────────────────────────
function BulkHireModal({
  selectedApps,
  defaultRate,
  defaultUnit,
  eventId,
  onClose,
  onSuccess,
}: {
  selectedApps: any[];
  defaultRate: number;
  defaultUnit: string;
  eventId: string;
  onClose: () => void;
  onSuccess: (results: any) => void;
}) {
  const [agreedRate, setAgreedRate] = useState(String(defaultRate));
  const [agreedUnit, setAgreedUnit] = useState(defaultUnit);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/events/${eventId}/bulk-hire`, {
        hires: selectedApps.map((app) => ({
          applicationId: app.id,
          agreedRate: Number(agreedRate),
          agreedUnit,
        })),
      });
      return res.data.data as any;
    },
    onSuccess: (data) => {
      const { successCount, failCount } = data;
      if (failCount === 0) toast.success(`All ${successCount} workers hired!`);
      else toast.error(`${successCount} hired, ${failCount} failed. Check results.`);
      onSuccess(data);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Bulk hire failed.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-xl">
        <h2 className="font-bold text-base text-[var(--color-neutral-900)]">
          Hire {selectedApps.length} Worker{selectedApps.length !== 1 ? 's' : ''}
        </h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Agreed Rate (₹)</label>
            <input
              className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
              type="number" min={1} value={agreedRate}
              onChange={(e) => setAgreedRate(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Per</label>
            <select
              className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
              value={agreedUnit} onChange={(e) => setAgreedUnit(e.target.value)}
            >
              <option value="DAY">Day</option>
              <option value="HOUR">Hour</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition">
            Cancel
          </button>
          <Button className="flex-1" onClick={() => bulkMutation.mutate()} isLoading={bulkMutation.isPending}>
            Confirm Bulk Hire ({selectedApps.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function EventApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orgId = params.id as string;
  const eventId = params.eventId as string;

  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [expandedCover, setExpandedCover] = useState<Set<string>>(new Set());

  const { data: roles, isLoading } = useQuery({
    queryKey: ['event-applicants', eventId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get(`/events/${eventId}/applicants`, { params });
      return res.data.data as any[];
    },
  });

  // Individual hire mutation (single applicant from card)
  const hireMutation = useMutation({
    mutationFn: async ({ applicationId, agreedRate, agreedUnit }: any) => {
      await api.post(`/applications/${applicationId}/hire`, { agreedRate, agreedUnit });
    },
    onSuccess: () => {
      toast.success('Worker hired!');
      queryClient.invalidateQueries({ queryKey: ['event-applicants', eventId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Hire failed.'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ jobId, applicationId, status }: any) => {
      await api.patch(`/jobs/${jobId}/applications/${applicationId}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-applicants', eventId] }),
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const activeRole = roles?.[activeRoleIdx];
  const applications = activeRole?.applications ?? [];
  const selectedAppsData = applications.filter((a: any) => selected.has(a.id));

  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const STATUS_FILTERS = ['', 'PENDING', 'SHORTLISTED', 'HIRED'];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {showBulkModal && activeRole && (
        <BulkHireModal
          selectedApps={selectedAppsData}
          defaultRate={activeRole.role.payRate}
          defaultUnit={activeRole.role.payUnit}
          eventId={eventId}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            setSelected(new Set());
            queryClient.invalidateQueries({ queryKey: ['event-applicants', eventId] });
          }}
        />
      )}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/organizations/${orgId}/events`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Event Applicants</span>
      </header>

      {/* Role Tabs */}
      {roles && roles.length > 0 && (
        <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {roles.map((rg: any, idx: number) => (
              <button
                key={rg.role.id}
                onClick={() => { setActiveRoleIdx(idx); setSelected(new Set()); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  idx === activeRoleIdx
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
                }`}
              >
                {rg.role.title} ({rg.applications.length})
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-3 pb-24">
        {isLoading ? <LoadingState /> : !activeRole ? (
          <EmptyState title="No Roles" description="This event has no roles yet." />
        ) : (
          <>
            {/* Role summary */}
            <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-[var(--color-primary-500)]" />
                <div>
                  <p className="text-xs font-bold text-[var(--color-neutral-800)]">{activeRole.role.title}</p>
                  <p className="text-[10px] text-[var(--color-neutral-500)]">₹{activeRole.role.payRate}/{activeRole.role.payUnit.toLowerCase()} · {activeRole.role.vacancies} vacancies</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-[var(--color-neutral-900)]">{activeRole.filled}/{activeRole.role.vacancies}</p>
                <p className="text-[10px] text-[var(--color-neutral-400)]">filled</p>
              </div>
            </div>

            {/* Vacancy progress bar */}
            <div className="h-2 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary-500)] transition-all"
                style={{ width: `${Math.min((activeRole.filled / activeRole.role.vacancies) * 100, 100)}%` }}
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition ${
                    statusFilter === f
                      ? 'bg-[var(--color-primary-500)] text-white'
                      : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
                  }`}
                >
                  {f || 'All'}
                </button>
              ))}
            </div>

            {/* Applicant list */}
            {applications.length === 0 ? (
              <EmptyState title="No Applicants" description="No one has applied to this role yet." />
            ) : (
              applications.map((app: any) => {
                const worker = app.applicant;
                const isSelected = selected.has(app.id);
                const canAct = app.status === 'PENDING' || app.status === 'SHORTLISTED';
                const coverExpanded = expandedCover.has(app.id);

                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-3xl border p-4 shadow-sm flex flex-col gap-3 transition ${
                      isSelected ? 'border-[var(--color-primary-400)] ring-1 ring-[var(--color-primary-300)]' : 'border-[var(--color-neutral-200)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      {canAct && (
                        <button
                          onClick={() => toggleSelect(app.id)}
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]'
                              : 'border-[var(--color-neutral-300)]'
                          }`}
                        >
                          {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>}
                        </button>
                      )}

                      <Avatar src={worker?.avatarUrl} name={worker?.name} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{worker?.name ?? 'Anonymous'}</h3>
                          <StatusBadge status={app.status} />
                        </div>
                        {worker?.workerProfile?.headline && (
                          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5 truncate">{worker.workerProfile.headline}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--color-neutral-400)] font-semibold">
                          {worker?.averageRating > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star size={10} className="text-amber-400" />{worker.averageRating.toFixed(1)}
                            </span>
                          )}
                          {worker?.area && <span className="flex items-center gap-0.5"><MapPin size={10} />{worker.area}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    {worker?.workerProfile?.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {worker.workerProfile.skills.slice(0, 4).map((us: any) => (
                          <SkillChip key={us.skill.slug} name={us.skill.name} slug={us.skill.slug} size="sm" />
                        ))}
                      </div>
                    )}

                    {/* Cover note */}
                    {app.coverNote && (
                      <div className="border border-[var(--color-neutral-100)] rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCover((s) => { const n = new Set(s); n.has(app.id) ? n.delete(app.id) : n.add(app.id); return n; })}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition"
                        >
                          Cover Note {coverExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {coverExpanded && <p className="px-3 pb-3 text-xs text-[var(--color-neutral-700)] leading-relaxed">{app.coverNote}</p>}
                      </div>
                    )}

                    {/* Actions */}
                    {canAct && (
                      <div className="flex gap-2 border-t border-[var(--color-neutral-100)] pt-3">
                        {app.status === 'PENDING' && (
                          <button
                            onClick={() => statusMutation.mutate({ jobId: activeRole.job?.id, applicationId: app.id, status: 'SHORTLISTED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-2 border border-[var(--color-primary-400)] text-[var(--color-primary-600)] text-xs font-bold rounded-xl hover:bg-[var(--color-primary-50)] transition disabled:opacity-50"
                          >Shortlist</button>
                        )}
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => hireMutation.mutate({
                            applicationId: app.id,
                            agreedRate: activeRole.role.payRate,
                            agreedUnit: activeRole.role.payUnit,
                          })}
                          isLoading={hireMutation.isPending}
                        >Hire</Button>
                        <button
                          onClick={() => statusMutation.mutate({ jobId: activeRole.job?.id, applicationId: app.id, status: 'REJECTED' })}
                          disabled={statusMutation.isPending}
                          className="px-3 py-2 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                        >Reject</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </main>

      {/* Sticky bulk hire panel */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-neutral-200)] px-4 py-3 flex items-center justify-between shadow-xl z-30">
          <div>
            <p className="font-bold text-sm text-[var(--color-neutral-900)]">{selected.size} selected</p>
            <p className="text-xs text-[var(--color-neutral-500)]">Ready to hire</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="px-4 py-2 border border-[var(--color-neutral-200)] rounded-xl text-xs font-bold text-[var(--color-neutral-600)]">Clear</button>
            <Button onClick={() => setShowBulkModal(true)}>Hire Selected ({selected.size})</Button>
          </div>
        </div>
      )}
    </div>
  );
}
