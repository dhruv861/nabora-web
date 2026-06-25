'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${ accent ? 'bg-purple-50 border-purple-200' : 'bg-white border-neutral-200' }`}>
      <p className={`text-3xl font-extrabold ${ accent ? 'text-purple-700' : 'text-neutral-900' }`}>{value}</p>
      <p className="text-sm font-bold text-neutral-700">{label}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export default function AdminReportsPage() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-report'],
    queryFn: async () => { const res = await api.get('/admin/reports/summary'); return res.data.data as any; },
  });
  if (isLoading) return <LoadingState />;
  const fmtINR = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`;
  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-6">Platform Reports</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={report?.users?.total ?? 0} sub={`+${report?.users?.thisMonth} this month`} />
        <StatCard label="Organizations" value={report?.organizations?.total ?? 0} sub={`+${report?.organizations?.thisMonth} this month`} />
        <StatCard label="Jobs Posted" value={report?.jobs?.total ?? 0} sub={`${report?.jobs?.active} active`} />
        <StatCard label="Completed Hires" value={report?.hires?.completed ?? 0} sub={`${report?.hires?.total} total`} />
        <StatCard label="Total Billed" value={fmtINR(report?.invoices?.totalBilled ?? 0)} sub={`${report?.invoices?.paid} paid invoices`} />
        <StatCard label="Platform Revenue" value={fmtINR(report?.invoices?.platformRevenue ?? 0)} sub="₹99 per completed hire" accent />
        <StatCard label="Open Disputes" value={report?.disputes?.open ?? 0} sub={`${report?.disputes?.underReview} under review`} />
      </div>
    </div>
  );
}
