'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { format } from 'date-fns';

export default function AdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/invoices', { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });
  const STATUSES = ['', 'PENDING', 'SENT', 'PAID', 'DISPUTED', 'CANCELLED'];
  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold text-neutral-900 mb-4">Invoices ({data?.meta?.total ?? 0})</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${statusFilter === s ? 'bg-[#6c47ff] text-white' : 'bg-neutral-100 text-neutral-600'}`}>{s || 'All'}</button>
        ))}
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="flex flex-col gap-2">
          {(data?.data ?? []).map((inv: any) => (
            <div key={inv.id} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs font-mono text-neutral-700">{inv.invoiceNumber}</p>
                <p className="font-semibold text-sm text-neutral-900 truncate mt-0.5">{inv.jobTitle}</p>
                <p className="text-xs text-neutral-500">{inv.hire?.worker?.name} → {inv.hire?.employer?.name} · {format(new Date(inv.invoiceDate), 'd MMM yyyy')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">₹{inv.totalPayable.toLocaleString('en-IN')}</p>
                <div className="mt-1"><StatusBadge status={inv.status} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
