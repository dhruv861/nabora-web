'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/Button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AvailabilityPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const from = format(monthStart, 'yyyy-MM-dd');
  const to   = format(monthEnd, 'yyyy-MM-dd');

  const { data: slots, isLoading } = useQuery({
    queryKey: ['my-availability', from, to],
    queryFn: async () => {
      const res = await api.get('/users/me/availability', { params: { from, to } });
      return res.data.data as { date: string; isAvailable: boolean }[];
    },
    enabled: !!user?.id,
  });

  // Build Map<dateStr, isAvailable>
  const slotMap = new Map<string, boolean>();
  (slots ?? []).forEach((s) => slotMap.set(s.date, s.isAvailable));

  const toggleMutation = useMutation({
    mutationFn: async ({ date, isAvailable }: { date: string; isAvailable: boolean }) => {
      await api.post('/users/me/availability', { date, isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability', from, to] });
    },
    onError: () => toast.error('Failed to update availability.'),
  });

  const resetMonthMutation = useMutation({
    mutationFn: async () => {
      const setDates = Array.from(slotMap.entries()).filter(([, v]) => !v).map(([d]) => d);
      await Promise.all(setDates.map((d) => api.delete(`/users/me/availability/${d}`)));
    },
    onSuccess: () => {
      toast.success('Month reset — all dates available.');
      queryClient.invalidateQueries({ queryKey: ['my-availability', from, to] });
    },
    onError: () => toast.error('Reset failed.'),
  });

  // Build days grid with Mon-start offset
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // getDay: 0=Sun, 1=Mon ... convert to Mon=0
  const startOffset = (getDay(monthStart) + 6) % 7;
  const gridCells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...days,
  ];

  const handleDayTap = (day: Date) => {
    const isPast = isBefore(startOfDay(day), startOfDay(new Date())) && !isToday(day);
    if (isPast) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const current = slotMap.has(dateStr) ? slotMap.get(dateStr)! : true; // default available
    toggleMutation.mutate({ date: dateStr, isAvailable: !current });
  };

  const unavailableCount = Array.from(slotMap.values()).filter((v) => !v).length;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">My Availability</span>
        </div>
        {unavailableCount > 0 && (
          <Button size="sm" variant="secondary" onClick={() => resetMonthMutation.mutate()} isLoading={resetMonthMutation.isPending}>
            Reset Month
          </Button>
        )}
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5">
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-2 rounded-xl hover:bg-[var(--color-neutral-100)] transition">
            <ChevronLeft size={20} className="text-[var(--color-neutral-600)]" />
          </button>
          <span className="font-bold text-base text-[var(--color-neutral-900)]">{format(viewMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-2 rounded-xl hover:bg-[var(--color-neutral-100)] transition">
            <ChevronRight size={20} className="text-[var(--color-neutral-600)]" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-[var(--color-neutral-400)] uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? <LoadingState /> : (
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dateStr   = format(day, 'yyyy-MM-dd');
              const isPast    = isBefore(startOfDay(day), startOfDay(new Date())) && !isToday(day);
              const isAvail   = slotMap.has(dateStr) ? slotMap.get(dateStr)! : true;
              const isTodayD  = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayTap(day)}
                  disabled={isPast || toggleMutation.isPending}
                  className={`aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition ${
                    isPast
                      ? 'text-[var(--color-neutral-300)] cursor-not-allowed'
                      : isAvail
                      ? `bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 ${isTodayD ? 'ring-2 ring-emerald-500' : ''}`
                      : `bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 ${isTodayD ? 'ring-2 ring-red-500' : ''}`
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 mt-5 justify-center">
          {[
            { color: 'bg-emerald-100 border-emerald-300', label: 'Available' },
            { color: 'bg-red-100 border-red-300', label: 'Unavailable' },
            { color: 'bg-neutral-100 border-neutral-200', label: 'Past' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded-md border ${item.color}`} />
              <span className="text-xs text-[var(--color-neutral-500)]">{item.label}</span>
            </div>
          ))}
        </div>

        {unavailableCount > 0 && (
          <p className="text-center text-xs text-[var(--color-neutral-500)] mt-3">
            {unavailableCount} date{unavailableCount !== 1 ? 's' : ''} marked unavailable this month
          </p>
        )}
      </main>
    </div>
  );
}
