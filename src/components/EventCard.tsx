'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { CalendarDays, MapPin, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    venue: string;
    city: string;
    roles?: { id: string; vacancies: number }[];
    applicantCount?: number;
    _count?: { roles?: number; jobs?: number };
  };
  orgId: string;
  onAction?: (action: string, eventId: string) => void;
  myRole?: string;
}

const OWNER_ROLES = ['OWNER', 'OPERATIONS_MANAGER', 'EVENT_MANAGER'];

export function EventCard({ event, orgId, onAction, myRole }: EventCardProps) {
  const totalVacancies = event.roles?.reduce((s, r) => s + r.vacancies, 0) ?? 0;
  const roleCount = event._count?.roles ?? event.roles?.length ?? 0;
  const canManage = myRole && OWNER_ROLES.includes(myRole);

  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
  const dateStr = sameDay
    ? format(start, 'd MMM · h:mm a')
    : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;

  return (
    <div className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{event.title}</h3>
          <div className="flex flex-col gap-1 mt-1.5 text-xs text-[var(--color-neutral-500)]">
            <span className="flex items-center gap-1"><CalendarDays size={11} />{dateStr}</span>
            <span className="flex items-center gap-1"><MapPin size={11} />{event.venue}, {event.city}</span>
            <div className="flex items-center gap-3 mt-0.5">
              {roleCount > 0 && <span className="flex items-center gap-1"><Briefcase size={11} />{roleCount} role{roleCount !== 1 ? 's' : ''}</span>}
              {totalVacancies > 0 && <span className="flex items-center gap-1"><Users size={11} />{totalVacancies} vacancies</span>}
              {event.applicantCount != null && <span>{event.applicantCount} applicant{event.applicantCount !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
        <StatusBadge status={event.status} />
      </div>

      {/* Action row */}
      {canManage && (
        <div className="flex gap-2 flex-wrap border-t border-[var(--color-neutral-100)] pt-3">
          {event.status === 'DRAFT' && (
            <>
              <button
                onClick={() => onAction?.('publish', event.id)}
                className="px-3 py-1.5 bg-[var(--color-primary-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-primary-600)] transition"
              >Publish</button>
              <button
                onClick={() => onAction?.('edit', event.id)}
                className="px-3 py-1.5 border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] text-xs font-bold rounded-xl hover:bg-[var(--color-neutral-50)] transition"
              >Edit</button>
            </>
          )}
          {event.status === 'PUBLISHED' && (
            <>
              <button
                onClick={() => onAction?.('applicants', event.id)}
                className="px-3 py-1.5 bg-[var(--color-primary-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-primary-600)] transition"
              >View Applicants</button>
              <button
                onClick={() => onAction?.('ongoing', event.id)}
                className="px-3 py-1.5 border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] text-xs font-bold rounded-xl hover:bg-[var(--color-neutral-50)] transition"
              >Mark Ongoing</button>
            </>
          )}
          {event.status === 'ONGOING' && (
            <>
              <button
                onClick={() => onAction?.('applicants', event.id)}
                className="px-3 py-1.5 bg-[var(--color-primary-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-primary-600)] transition"
              >Attendance</button>
              <button
                onClick={() => onAction?.('complete', event.id)}
                className="px-3 py-1.5 border border-emerald-300 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 transition"
              >Complete</button>
            </>
          )}
          {(event.status === 'PUBLISHED' || event.status === 'DRAFT') && (
            <button
              onClick={() => onAction?.('cancel', event.id)}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition"
            >Cancel</button>
          )}
        </div>
      )}
    </div>
  );
}
