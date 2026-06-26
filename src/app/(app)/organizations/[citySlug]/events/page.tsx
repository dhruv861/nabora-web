'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { EventCard } from '@/components/EventCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'ONGOING', label: 'Ongoing' },
  { id: 'COMPLETED', label: 'Completed' },
];

export default function OrgEventsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const orgId = params.citySlug as string;
  const [activeTab, setActiveTab] = useState('');

  // Get my role in this org
  const { data: members } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => { const res = await api.get(`/organizations/${orgId}/members`); return res.data.data as any[]; },
  });
  const myRole = members?.find((m: any) => m.user?.id === user?.id)?.role ?? '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['org-events', orgId, activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab) params.status = activeTab;
      const res = await api.get(`/organizations/${orgId}/events`, { params });
      return res.data.data as { data: any[]; meta: any };
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      if (status === 'PUBLISHED') {
        await api.post(`/events/${eventId}/publish`);
      } else {
        await api.patch(`/events/${eventId}/status`, { status });
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Event ${status === 'PUBLISHED' ? 'published' : 'updated'}!`);
      queryClient.invalidateQueries({ queryKey: ['org-events', orgId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Action failed.'),
  });

  const handleAction = (action: string, eventId: string) => {
    switch (action) {
      case 'publish': statusMutation.mutate({ eventId, status: 'PUBLISHED' }); break;
      case 'ongoing': statusMutation.mutate({ eventId, status: 'ONGOING' }); break;
      case 'complete': statusMutation.mutate({ eventId, status: 'COMPLETED' }); break;
      case 'cancel': statusMutation.mutate({ eventId, status: 'CANCELLED' }); break;
      case 'edit': router.push(`/organizations/${orgId}/events/${eventId}/edit`); break;
      case 'applicants': router.push(`/organizations/${orgId}/events/${eventId}/applicants`); break;
    }
  };

  const events = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/organizations/${orgId}/dashboard`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Events</span>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => router.push(`/organizations/${orgId}/events/create`)}>Create</Button>
      </header>

      <div className="bg-white border-b border-[var(--color-neutral-200)] px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]'
              }`}
            >{tab.label}</button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {isLoading ? <LoadingState /> : events.length === 0 ? (
          <EmptyState
            title="No Events"
            description="Create your first event to start hiring workers at scale."
            action={{ label: 'Create Event', onClick: () => router.push(`/organizations/${orgId}/events/create`) }}
          />
        ) : (
          events.map((event: any) => (
            <EventCard key={event.id} event={event} orgId={orgId} myRole={myRole} onAction={handleAction} />
          ))
        )}
      </main>
    </div>
  );
}
