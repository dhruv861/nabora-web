'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/Button';
import { ArrowLeft, CalendarDays, MessageCircle, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function HireDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const hireId = params.id as string;
  const [confirmComplete, setConfirmComplete] = useState(false);

  const { data: hire, isLoading, error } = useQuery({
    queryKey: ['hire', hireId],
    queryFn: async () => {
      const res = await api.get(`/hires/${hireId}`);
      return res.data as any;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/hires/${hireId}/complete`);
    },
    onSuccess: () => {
      toast.success('Hire marked as completed!');
      queryClient.invalidateQueries({ queryKey: ['hire', hireId] });
      queryClient.invalidateQueries({ queryKey: ['my-hires'] });
      setConfirmComplete(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to complete hire.');
      setConfirmComplete(false);
    },
  });

  if (isLoading) return <LoadingState />;
  if (error || !hire) {
    return (
      <EmptyState
        title="Hire not found"
        description="This hire doesn't exist or you don't have access."
        action={{ label: 'Back to Hires', onClick: () => router.push('/hires') }}
      />
    );
  }

  const isEmployer = user?.id === hire.employerId;
  const counterparty = isEmployer ? hire.worker : hire.employer;
  const chatId = hire.chat?.id;

  const sectionClass = 'bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3';
  const labelClass = 'text-[10px] font-bold text-[var(--color-neutral-400)] uppercase tracking-wider';
  const valueClass = 'text-sm font-semibold text-[var(--color-neutral-800)]';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/hires')}
            className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Hire Details</span>
        </div>
        <StatusBadge status={hire.status} />
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Job info */}
        <div className={sectionClass}>
          <p className={labelClass}>Job</p>
          <h2 className="font-bold text-base text-[var(--color-neutral-900)]">{hire.job?.title}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--color-neutral-500)]">
            {hire.job?.workDate && (
              <span className="flex items-center gap-1">
                <CalendarDays size={12} />
                {new Date(hire.job.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {hire.job?.area && <span>{hire.job.area}</span>}
          </div>
        </div>

        {/* Counterparty */}
        <div className={sectionClass}>
          <p className={labelClass}>{isEmployer ? 'Worker' : 'Employer'}</p>
          <div className="flex items-center gap-3">
            <Avatar src={counterparty?.avatarUrl} name={counterparty?.name} size="md" />
            <div>
              <p className="font-bold text-sm text-[var(--color-neutral-900)]">{counterparty?.name}</p>
              {counterparty?.phone && isEmployer && hire.status === 'ACTIVE' && (
                <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{counterparty.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pay details */}
        <div className={sectionClass}>
          <p className={labelClass}>Pay Agreement</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Rate', value: `₹${hire.agreedRate}` },
              { label: 'Unit', value: hire.agreedUnit },
              { label: 'Status', value: <StatusBadge status={hire.status} /> },
            ].map((item) => (
              <div key={item.label}>
                <p className={labelClass}>{item.label}</p>
                <div className={valueClass}>{item.value}</div>
              </div>
            ))}
          </div>
          {hire.startTime && (
            <div className="flex gap-4 text-xs text-[var(--color-neutral-500)] mt-1">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Start: {new Date(hire.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              {hire.endTime && (
                <span>End: {new Date(hire.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
            </div>
          )}
        </div>

        {/* Attendance — Sprint 5 */}
        <div className={sectionClass}>
          <p className={labelClass}>Attendance</p>
          {hire.attendance && hire.attendance.length > 0 ? (
            <p className="text-sm text-[var(--color-neutral-600)]">{hire.attendance.length} record(s) logged.</p>
          ) : (
            <p className="text-xs text-[var(--color-neutral-400)] italic">Attendance tracking available after check-in.</p>
          )}
        </div>

        {/* Invoice — Sprint 7 */}
        <div className={sectionClass}>
          <p className={labelClass}>Invoice</p>
          {hire.invoice ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--color-neutral-800)]">{hire.invoice.invoiceNumber}</p>
                <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">₹{hire.invoice.totalPayable ?? 0}</p>
              </div>
              <StatusBadge status={hire.invoice.status} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--color-neutral-400)]">
              <FileText size={14} />
              Invoice will be generated once this hire is completed.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {chatId ? (
            <button
              onClick={() => router.push(`/chats/${chatId}`)}
              className="flex-1 py-3 flex items-center justify-center gap-2 border border-[var(--color-primary-300)] bg-[var(--color-primary-50)] rounded-xl text-sm font-bold text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] transition"
            >
              <MessageCircle size={16} />
              Open Chat
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-3 flex items-center justify-center gap-2 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-300)] cursor-not-allowed"
            >
              <MessageCircle size={16} />
              Chat
            </button>
          )}

          {isEmployer && hire.status === 'ACTIVE' && (
            confirmComplete ? (
              <div className="flex gap-2 flex-1">
                <Button
                  className="flex-1"
                  onClick={() => completeMutation.mutate()}
                  isLoading={completeMutation.isPending}
                >
                  Confirm Complete
                </Button>
                <button
                  onClick={() => setConfirmComplete(false)}
                  className="px-4 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmComplete(true)}
                className="flex-1 py-3 bg-[var(--color-primary-500)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary-600)] transition"
              >
                Mark Complete
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
