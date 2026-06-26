'use client';

import React, { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { SkillChip } from '@/components/SkillChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/Button';
import { ArrowLeft, ChevronDown, ChevronUp, Star, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SHORTLISTED', label: 'Shortlisted' },
];

interface HireModalProps {
  application: any;
  jobPayRate: number;
  jobPayUnit: string;
  onClose: () => void;
  onSuccess: () => void;
}

function HireModal({ application, jobPayRate, jobPayUnit, onClose, onSuccess }: HireModalProps) {
  const [agreedRate, setAgreedRate] = useState(String(jobPayRate));
  const [agreedUnit, setAgreedUnit] = useState(jobPayUnit);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const hireMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/applications/${application.id}/hire`, {
        agreedRate: Number(agreedRate),
        agreedUnit,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`${application.applicant.name ?? 'Applicant'} hired successfully!`);
      onSuccess();
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        toast.error('This applicant was already hired.');
        onSuccess(); // refresh list
      } else {
        toast.error(err.response?.data?.message ?? 'Failed to hire applicant.');
      }
    },
  });

  const inputClass = 'w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white';
  const labelClass = 'block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-xl">
        <h2 className="font-bold text-base text-[var(--color-neutral-900)]">
          Hire {application.applicant.name ?? 'Applicant'}
        </h2>

        <div>
          <label className={labelClass}>Agreed Rate (₹)</label>
          <input className={inputClass} type="number" min={1} value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Pay Unit</label>
          <select className={inputClass} value={agreedUnit} onChange={(e) => setAgreedUnit(e.target.value)}>
            <option value="HOUR">Per Hour</option>
            <option value="DAY">Per Day</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start Time</label>
            <input className={inputClass} type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input className={inputClass} type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition"
          >
            Cancel
          </button>
          <Button
            className="flex-1"
            onClick={() => hireMutation.mutate()}
            isLoading={hireMutation.isPending}
          >
            Confirm Hire
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ApplicantCardProps {
  app: any;
  jobId: string;
  jobPayRate: number;
  jobPayUnit: string;
  onHired: () => void;
}

function ApplicantCard({ app, jobId, jobPayRate, jobPayUnit, onHired }: ApplicantCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (status: 'SHORTLISTED' | 'REJECTED') => {
      await api.patch(`/jobs/${jobId}/applications/${app.id}`, { status });
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['job-applications', jobId] });
      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['job-applications', jobId] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((a: any) =>
            a.id === app.id ? { ...a, status: newStatus } : a
          ),
        };
      });
    },
    onError: (_err, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] });
      toast.error('Failed to update status.');
    },
    onSuccess: (_, newStatus) => {
      if (newStatus === 'SHORTLISTED') toast.success('Applicant shortlisted!');
      if (newStatus === 'REJECTED') { toast.success('Applicant rejected.'); setRejectTarget(false); }
      queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] });
    },
  });

  const worker = app.applicant;
  const skills = worker?.workerProfile?.skills ?? [];
  const isPending = app.status === 'PENDING';
  const isShortlisted = app.status === 'SHORTLISTED';
  const canAct = isPending || isShortlisted;

  return (
    <>
      {showHireModal && (
        <HireModal
          application={app}
          jobPayRate={jobPayRate}
          jobPayUnit={jobPayUnit}
          onClose={() => setShowHireModal(false)}
          onSuccess={() => { setShowHireModal(false); onHired(); }}
        />
      )}

      <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
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
              {(worker?.averageRating ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star size={10} className="text-amber-400" />
                  {worker.averageRating.toFixed(1)} ({worker.ratingCount})
                </span>
              )}
              {worker?.area && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} />
                  {worker.area}
                </span>
              )}
              <span>Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((us: any) => (
              <SkillChip key={us.skillId} name={us.skill.name} slug={us.skill.slug} size="sm" />
            ))}
          </div>
        )}

        {/* Cover note (expandable) */}
        {app.coverNote && (
          <div className="border border-[var(--color-neutral-100)] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] transition"
            >
              Cover Note
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <p className="px-3 pb-3 text-xs text-[var(--color-neutral-700)] leading-relaxed">{app.coverNote}</p>
            )}
          </div>
        )}

        {/* Action row */}
        {canAct && (
          <div className="flex gap-2 border-t border-[var(--color-neutral-100)] pt-3">
            {isPending && (
              <button
                onClick={() => statusMutation.mutate('SHORTLISTED')}
                disabled={statusMutation.isPending}
                className="flex-1 py-2 border border-[var(--color-primary-500)] text-[var(--color-primary-600)] text-xs font-bold rounded-xl hover:bg-[var(--color-primary-5)] transition disabled:opacity-50"
              >
                {statusMutation.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Shortlist'}
              </button>
            )}

            <Button size="sm" className="flex-1" onClick={() => setShowHireModal(true)}>
              Hire
            </Button>

            {rejectTarget ? (
              <div className="flex gap-2">
                <button
                  onClick={() => statusMutation.mutate('REJECTED')}
                  disabled={statusMutation.isPending}
                  className="px-3 py-2 bg-[var(--color-error-500)] text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setRejectTarget(false)}
                  className="px-3 py-2 border border-[var(--color-neutral-200)] text-xs font-bold rounded-xl text-[var(--color-neutral-600)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRejectTarget(true)}
                className="px-3 py-2 border border-[var(--color-error-200)] text-[var(--color-error-600)] text-xs font-bold rounded-xl hover:bg-[var(--color-error-50)] transition"
              >
                Reject
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function ApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const jobId = params.jobId as string;
  const [activeTab, setActiveTab] = useState(searchParams.get('status') ?? '');

  const { data: jobData } = useQuery({
    queryKey: ['job-detail', jobId],
    queryFn: async () => {
      // We need job pay info for the hire modal; fetch from /jobs/my
      const res = await api.get('/jobs/my');
      const jobs = res.data.data as any[];
      return jobs.find((j: any) => j.id === jobId);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['job-applications', jobId, activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab) params.status = activeTab;
      const res = await api.get(`/jobs/${jobId}/applications`, { params });
      return res.data as { data: any[]; meta: any };
    },
  });

  const applications = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/jobs/my')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Applicants</span>
          {jobData?.title && (
            <p className="text-[10px] text-[var(--color-neutral-500)] truncate max-w-[200px]">{jobData.title}</p>
          )}
        </div>
        <span className="ml-auto text-xs font-bold text-[var(--color-neutral-500)]">
          {data?.meta?.total ?? 0} total
        </span>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[var(--color-neutral-200)] px-4">
        <div className="flex gap-1 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? (
          <LoadingState />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No Applicants"
            description={activeTab ? `No ${activeTab.toLowerCase()} applicants.` : 'No one has applied to this job yet.'}
          />
        ) : (
          applications.map((app: any) => (
            <ApplicantCard
              key={app.id}
              app={app}
              jobId={jobId}
              jobPayRate={jobData?.payRate ?? 0}
              jobPayUnit={jobData?.payUnit ?? 'DAY'}
              onHired={() => queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] })}
            />
          ))
        )}
      </main>
    </div>
  );
}
