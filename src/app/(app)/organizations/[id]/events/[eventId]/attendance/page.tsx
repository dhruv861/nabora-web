'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLOR: Record<string, string> = {
  CHECKED_OUT: 'text-emerald-700 bg-emerald-50',
  CHECKED_IN:  'text-blue-700 bg-blue-50',
  ABSENT:      'text-red-700 bg-red-50',
  DISPUTED:    'text-amber-700 bg-amber-50',
};

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orgId = params.id as string;
  const eventId = params.eventId as string;

  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [overrideTarget, setOverrideTarget] = useState<{ hireId: string; attendanceId: string } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('ABSENT');

  const { data, isLoading } = useQuery({
    queryKey: ['event-attendance', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/attendance`);
      return res.data.data as { roleGroups: any[]; summary: any };
    },
    refetchInterval: 60000, // auto-refresh every 60s
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ hireId, attendanceId, status }: { hireId: string; attendanceId: string; status: string }) => {
      await api.patch(`/hires/${hireId}/attendance/${attendanceId}`, { status });
    },
    onSuccess: () => {
      toast.success('Attendance updated.');
      setOverrideTarget(null);
      queryClient.invalidateQueries({ queryKey: ['event-attendance', eventId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const { roleGroups = [], summary } = data ?? {};
  const activeGroup = roleGroups[activeRoleIdx];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 flex flex-col gap-4">
            <h2 className="font-bold text-base">Override Attendance</h2>
            <div className="flex flex-col gap-2">
              {['CHECKED_OUT', 'ABSENT', 'DISPUTED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setOverrideStatus(s)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                    overrideStatus === s
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                      : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-700)]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    overrideStatus === s ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-neutral-300)]'
                  }`}>
                    {overrideStatus === s && <div className="w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />}
                  </div>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOverrideTarget(null)} className="flex-1 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold">Cancel</button>
              <button
                onClick={() => overrideMutation.mutate({ ...overrideTarget!, status: overrideStatus })}
                disabled={overrideMutation.isPending}
                className="flex-1 py-2.5 bg-[var(--color-primary-500)] text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {overrideMutation.isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/organizations/${orgId}/events/${eventId}/applicants`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Attendance</span>
        <span className="ml-auto text-[10px] text-[var(--color-neutral-400)] font-semibold">Auto-refresh 60s</span>
      </header>

      {/* Summary */}
      {summary && (
        <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 py-3 grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: summary.total, color: 'text-[var(--color-neutral-800)]' },
            { label: 'Checked In', value: summary.checkedIn, color: 'text-blue-600' },
            { label: 'Checked Out', value: summary.checkedOut, color: 'text-emerald-600' },
            { label: 'Absent', value: summary.absent, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[var(--color-neutral-400)] font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role tabs */}
      {roleGroups.length > 0 && (
        <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {roleGroups.map((rg: any, idx: number) => (
              <button
                key={rg.role.id}
                onClick={() => setActiveRoleIdx(idx)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  idx === activeRoleIdx
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
                }`}
              >
                {rg.role.title} ({rg.workers.length})
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-2">
        {isLoading ? <LoadingState /> : !activeGroup ? (
          <EmptyState title="No attendance data" description="No hires found for this event yet." />
        ) : activeGroup.workers.length === 0 ? (
          <EmptyState title="No Workers" description="No one has been hired for this role yet." />
        ) : (
          activeGroup.workers.map((w: any) => {
            const att = w.attendance;
            const status = att?.status ?? 'NOT_CHECKED_IN';
            return (
              <div key={w.hireId} className={`bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 flex items-center gap-3 shadow-sm ${
                status === 'CHECKED_OUT' ? 'border-l-4 border-l-emerald-400' :
                status === 'CHECKED_IN'  ? 'border-l-4 border-l-blue-400' :
                status === 'ABSENT'      ? 'border-l-4 border-l-red-400' : ''
              }`}>
                <Avatar src={w.worker.avatarUrl} name={w.worker.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{w.worker.name}</p>
                  {att ? (
                    <div className="flex items-center gap-3 text-xs text-[var(--color-neutral-500)] mt-0.5">
                      {att.checkInTime && <span>↑ {format(new Date(att.checkInTime), 'h:mm a')}</span>}
                      {att.checkOutTime && <span>↓ {format(new Date(att.checkOutTime), 'h:mm a')}</span>}
                      {att.totalHours && <span className="font-bold text-[var(--color-neutral-700)]">{att.totalHours}h</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">Not checked in</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'text-[var(--color-neutral-400)] bg-[var(--color-neutral-100)]'}`}>
                  {status.replace('_', ' ')}
                </span>
                {att && (
                  <button
                    onClick={() => { setOverrideTarget({ hireId: w.hireId, attendanceId: att.id }); setOverrideStatus('ABSENT'); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)] transition"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
