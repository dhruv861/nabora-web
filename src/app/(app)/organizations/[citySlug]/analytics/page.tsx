'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { StarRating } from '@/components/StarRating';
import { ReliabilityBar } from '@/components/ReliabilityBar';
import { ArrowLeft, Briefcase, CalendarDays, FileText, TrendingUp, Users } from 'lucide-react';

function ProgressCircle({ value, size = 80 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 1) * circ);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-primary-500)" strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.22} fontWeight="700" fill="#111">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-500)] shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-extrabold text-[var(--color-neutral-900)]">{value}</p>
        <p className="text-xs font-bold text-[var(--color-neutral-600)]">{label}</p>
        {sub && <p className="text-[10px] text-[var(--color-neutral-400)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OrgAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.citySlug as string;

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['org-analytics', orgId],
    queryFn: async () => {
      const res = await api.get(`/organizations/${orgId}/analytics`);
      return res.data.data as any;
    },
    refetchInterval: 300000, // 5 min
  });

  if (isLoading) return <LoadingState />;
  if (error || !analytics) return <EmptyState title="Analytics unavailable" description="" action={{ label: 'Back', onClick: () => router.push(`/organizations/${orgId}/dashboard`) }} />;

  const fmtINR = (n: number) => n >= 100000
    ? `₹${(n / 100000).toFixed(2)}L`
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const sectionClass = 'flex flex-col gap-3';
  const sectionTitle = 'text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/organizations/${orgId}/dashboard`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Analytics</span>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-6">

        {/* Hiring Funnel */}
        <section className={sectionClass}>
          <p className={sectionTitle}>Hiring Funnel</p>
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-[var(--color-neutral-900)]">{analytics.totalApplications}</p>
                <p className="text-[10px] text-[var(--color-neutral-500)] font-semibold mt-0.5">Applications</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-[var(--color-primary-600)]">{analytics.totalHires}</p>
                <p className="text-[10px] text-[var(--color-neutral-500)] font-semibold mt-0.5">Hires</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-600">{(analytics.hireRate * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-[var(--color-neutral-500)] font-semibold mt-0.5">Hire Rate</p>
              </div>
            </div>
            {/* Funnel bar */}
            <div className="flex flex-col gap-1.5">
              <div>
                <div className="flex justify-between text-[10px] text-[var(--color-neutral-500)] mb-1">
                  <span>Applications</span><span>{analytics.totalApplications}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-neutral-100)]">
                  <div className="h-full rounded-full bg-[var(--color-neutral-400)]" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-[var(--color-neutral-500)] mb-1">
                  <span>Hires</span><span>{analytics.totalHires}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-neutral-100)]">
                  <div className="h-full rounded-full bg-[var(--color-primary-500)] transition-all" style={{ width: `${analytics.hireRate * 100}%` }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--color-neutral-500)] flex items-center gap-1">
              <TrendingUp size={12} />
              +{analytics.hiresThisMonth} hires this month
            </p>
          </div>
        </section>

        {/* Invoice Collection */}
        <section className={sectionClass}>
          <p className={sectionTitle}>Invoice Collection</p>
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex items-center gap-6">
            <ProgressCircle value={analytics.collectionRate} />
            <div className="flex flex-col gap-2 flex-1">
              <div>
                <p className="text-[10px] text-[var(--color-neutral-400)] font-semibold">Total Billed</p>
                <p className="text-base font-extrabold text-[var(--color-neutral-900)]">{fmtINR(analytics.totalBilledAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-neutral-400)] font-semibold">Collected</p>
                <p className="text-base font-extrabold text-emerald-600">{fmtINR(analytics.collectedAmount)}</p>
              </div>
              <p className="text-[10px] text-[var(--color-neutral-400)]">{analytics.paidInvoices}/{analytics.totalInvoices} invoices paid</p>
            </div>
          </div>
        </section>

        {/* Worker Quality */}
        <section className={sectionClass}>
          <p className={sectionTitle}>Worker Quality</p>
          <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--color-neutral-400)] font-semibold mb-2">Avg Worker Rating</p>
              <div className="flex items-center gap-2">
                <StarRating value={analytics.avgWorkerRating} readOnly size="sm" />
                <span className="text-sm font-bold text-[var(--color-neutral-800)]">{analytics.avgWorkerRating.toFixed(1)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-neutral-400)] font-semibold mb-2">Avg Reliability</p>
              <ReliabilityBar score={analytics.avgWorkerReliability} />
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <section className={sectionClass}>
          <p className={sectionTitle}>Overview</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Jobs" value={analytics.totalJobs} sub={`+${analytics.jobsThisMonth} this month`} icon={<Briefcase size={18} />} />
            <StatCard label="Events" value={analytics.totalEvents} sub={`${analytics.activeEvents} active`} icon={<CalendarDays size={18} />} />
            <StatCard label="Completed Hires" value={analytics.completedHires} sub={`${analytics.totalHires} total`} icon={<Users size={18} />} />
            <StatCard label="Invoices Paid" value={analytics.paidInvoices} sub={`${analytics.totalInvoices} total`} icon={<FileText size={18} />} />
          </div>
        </section>
      </main>
    </div>
  );
}
