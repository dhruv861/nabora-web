'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Receipt } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_TABS = [
  { id: 'WORKER', label: 'Received (Worker)' },
  { id: 'EMPLOYER', label: 'Issued (Employer)' },
];

const STATUS_FILTERS = ['', 'PENDING', 'SENT', 'PAID', 'DISPUTED'];

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [role, setRole] = useState<'WORKER' | 'EMPLOYER'>('WORKER');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', role, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = { role };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/invoices', { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });

  const invoices = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/feed')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Invoices</span>
      </header>

      {/* Role tabs */}
      <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 pt-3">
        <div className="flex bg-[var(--color-neutral-100)] p-1 rounded-2xl mb-3">
          {ROLE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setRole(t.id as 'WORKER' | 'EMPLOYER'); setStatusFilter(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                role === t.id ? 'bg-white text-[var(--color-neutral-900)] shadow-sm' : 'text-[var(--color-neutral-500)]'
              }`}
            >{t.label}</button>
          ))}
        </div>
        <div className="flex gap-1 pb-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition ${
                statusFilter === f ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
              }`}
            >{f || 'All'}</button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-3">
        {isLoading ? <LoadingState /> : invoices.length === 0 ? (
          <EmptyState title="No Invoices" description={role === 'WORKER' ? "Your invoices from employers will appear here." : "Invoices you've issued to workers will appear here."} />
        ) : (
          invoices.map((inv: any) => {
            const isWorker = role === 'WORKER';
            const counterparty = isWorker ? (inv.hire?.employer?.name ?? 'Employer') : (inv.hire?.worker?.name ?? 'Worker');
            return (
              <button
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
                className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex items-center gap-4 hover:bg-[var(--color-neutral-50)] transition text-left w-full"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-[var(--color-primary-500)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs font-mono text-[var(--color-neutral-700)]">{inv.invoiceNumber}</p>
                  <p className="font-semibold text-sm text-[var(--color-neutral-900)] truncate mt-0.5">{inv.jobTitle}</p>
                  <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{counterparty} · {format(new Date(inv.invoiceDate), 'd MMM yyyy')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-[var(--color-neutral-900)]">₹{inv.totalPayable.toLocaleString('en-IN')}</p>
                  <div className="mt-1"><StatusBadge status={inv.status} /></div>
                </div>
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}
