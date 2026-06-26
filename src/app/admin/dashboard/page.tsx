'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-report'],
    queryFn: async () => { const res = await api.get('/admin/reports/summary'); return res.data.data as any; },
  });

  if (isLoading) return <LoadingState />;

  const fmtINR = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  const stats = [
    { label: 'Users', value: report?.users?.total ?? 0, sub: `+${report?.users?.thisMonth} this month`, href: '/admin/users' },
    { label: 'Organizations', value: report?.organizations?.total ?? 0, sub: `+${report?.organizations?.thisMonth} this month`, href: '/admin/organizations' },
    { label: 'Active Jobs', value: report?.jobs?.active ?? 0, sub: `${report?.jobs?.total} total`, href: '/admin/jobs' },
    { label: 'Completed Hires', value: report?.hires?.completed ?? 0, sub: `${report?.hires?.total} total`, href: '/admin/disputes' },
    { label: 'Open Disputes', value: (report?.disputes?.open ?? 0) + (report?.disputes?.underReview ?? 0), sub: `${report?.disputes?.underReview} under review`, href: '/admin/disputes' },
    { label: 'Platform Revenue', value: fmtINR(report?.invoices?.platformRevenue ?? 0), sub: `${report?.invoices?.paid} paid invoices`, href: '/admin/invoices' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-6">Platform Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <button key={s.label} onClick={() => router.push(s.href)}
            className="bg-white rounded-2xl border border-neutral-200 p-4 text-left hover:border-[#6c47ff] hover:shadow-sm transition">
            <p className="text-2xl font-extrabold text-neutral-900">{s.value}</p>
            <p className="text-xs font-bold text-neutral-700 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-neutral-400 mt-1">{s.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
