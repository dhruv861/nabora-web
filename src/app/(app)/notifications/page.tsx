'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Bell, CheckCheck, Briefcase, FileText, Star, CheckCircle, XCircle, MessageSquare, Receipt, AlertTriangle } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  JOB_NEARBY:               <Briefcase size={18} className="text-[var(--color-primary-500)]" />,
  APPLICATION_RECEIVED:     <FileText size={18} className="text-amber-500" />,
  APPLICATION_SHORTLISTED:  <Star size={18} className="text-amber-500" />,
  APPLICATION_HIRED:        <CheckCircle size={18} className="text-emerald-500" />,
  APPLICATION_REJECTED:     <XCircle size={18} className="text-[var(--color-neutral-400)]" />,
  HIRE_COMPLETED:           <CheckCheck size={18} className="text-emerald-500" />,
  REVIEW_RECEIVED:          <Star size={18} className="text-amber-500" />,
  CHAT_MESSAGE:             <MessageSquare size={18} className="text-[var(--color-primary-500)]" />,
  INVOICE_GENERATED:        <Receipt size={18} className="text-emerald-500" />,
  DISPUTE_OPENED:           <AlertTriangle size={18} className="text-red-500" />,
};

function getNavTarget(notif: any): string | null {
  const d = notif.data ?? {};
  switch (notif.type) {
    case 'APPLICATION_RECEIVED':  return d.jobId ? `/my-jobs/${d.jobId}/applicants` : null;
    case 'APPLICATION_HIRED':     return d.hireId ? `/hires/${d.hireId}` : null;
    case 'APPLICATION_SHORTLISTED':
    case 'APPLICATION_REJECTED':  return '/applications';
    case 'HIRE_COMPLETED':        return d.hireId ? `/hires/${d.hireId}` : null;
    case 'CHAT_MESSAGE':          return d.chatId ? `/chats/${d.chatId}` : '/chats';
    case 'INVOICE_GENERATED':     return d.hireId ? `/hires/${d.hireId}` : null;
    case 'DISPUTE_OPENED':        return d.hireId ? `/hires/${d.hireId}` : null;
    case 'JOB_NEARBY':            return '/feed';
    default:                      return null;
  }
}

function groupByDay(notifications: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'd MMM yyyy');
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) groups.push({ label, items: [n] });
    else last.items.push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { limit: 50 } });
      return res.data.data as { data: any[]; meta: any };
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => { await api.patch('/notifications/read-all'); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      toast.success('All notifications marked as read.');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/notifications/${id}/read`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const notifications = data?.data ?? [];
  const groups = groupByDay(notifications);

  const handleClick = (notif: any) => {
    if (!notif.isRead) markOneMutation.mutate(notif.id);
    const target = getNavTarget(notif);
    if (target) router.push(target);
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/feed')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Notifications</span>
        </div>
        {notifications.some((n: any) => !n.isRead) && (
          <Button size="sm" variant="secondary" onClick={() => markAllMutation.mutate()} isLoading={markAllMutation.isPending}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </header>

      <main className="max-w-2xl mx-auto w-full flex flex-col">
        {isLoading ? <LoadingState /> : notifications.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              title="No Notifications"
              description="You're all caught up! Notifications about applications, hires, and messages will appear here."
            />
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-2 bg-[var(--color-neutral-100)]">
                <span className="text-[10px] font-bold text-[var(--color-neutral-500)] uppercase tracking-wider">{group.label}</span>
              </div>
              {group.items.map((notif: any) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-[var(--color-neutral-50)] transition border-b border-[var(--color-neutral-100)] ${
                    !notif.isRead ? 'border-l-[3px] border-l-[var(--color-primary-500)]' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-neutral-100)] flex items-center justify-center shrink-0">
                    {NOTIF_ICONS[notif.type] ?? <Bell size={18} className="text-[var(--color-neutral-400)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.isRead ? 'font-bold text-[var(--color-neutral-900)]' : 'font-medium text-[var(--color-neutral-700)]'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)] mt-0.5 leading-relaxed">{notif.body}</p>
                    <p className="text-[10px] text-[var(--color-neutral-400)] mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.isRead && <span className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
