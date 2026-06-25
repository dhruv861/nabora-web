'use client';

import React, { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft, Paperclip, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const FILE_TYPE_ICON: Record<string, React.ReactNode> = {
  IMAGE: <FileText size={14} className="text-blue-500" />,
  GPS_LOG: <FileText size={14} className="text-green-500" />,
  CHAT_EXPORT: <FileText size={14} className="text-amber-500" />,
};

const TIMELINE_STEPS = [
  { status: 'OPEN', label: 'Dispute opened' },
  { status: 'UNDER_REVIEW', label: 'Under review' },
  { status: 'RESOLVED', label: 'Resolved' },
];

export default function DisputeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const disputeId = params.id as string;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: dispute, isLoading, error } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: async () => { const res = await api.get(`/disputes/${disputeId}`); return res.data.data as any; },
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async ({ fileUrl, fileType, name }: { fileUrl: string; fileType: string; name: string }) => {
      await api.post(`/disputes/${disputeId}/evidence`, { fileUrl, fileType, description: name });
    },
    onSuccess: () => { toast.success('Evidence added.'); queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] }); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const handleAddEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('type', 'DISPUTE_EVIDENCE');
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileType = file.type.startsWith('image/') ? 'IMAGE' : 'CHAT_EXPORT';
      await addEvidenceMutation.mutateAsync({ fileUrl: res.data.data.url, fileType, name: file.name });
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  if (isLoading) return <LoadingState />;
  if (error || !dispute) return <EmptyState title="Dispute not found" description="" action={{ label: 'Back', onClick: () => router.push('/hires') }} />;

  const isParty = user?.id === dispute.hire.workerId || user?.id === dispute.hire.employerId;
  const statusOrder = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
  const currentIdx = statusOrder.indexOf(dispute.status);

  const sectionClass = 'bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3';
  const labelClass = 'text-[10px] font-bold text-[var(--color-neutral-400)] uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/hires/${dispute.hire.id}`)} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Dispute</span>
        </div>
        <StatusBadge status={dispute.status} />
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Hire context */}
        <div className={sectionClass}>
          <p className={labelClass}>Hire</p>
          <p className="font-bold text-sm text-[var(--color-neutral-900)]">{dispute.hire.job.title}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar src={dispute.hire.worker.avatarUrl} name={dispute.hire.worker.name} size="xs" />
              <span className="text-xs text-[var(--color-neutral-600)]">{dispute.hire.worker.name}</span>
            </div>
            <span className="text-[var(--color-neutral-300)]">⇔</span>
            <div className="flex items-center gap-2">
              <Avatar src={dispute.hire.employer.avatarUrl} name={dispute.hire.employer.name} size="xs" />
              <span className="text-xs text-[var(--color-neutral-600)]">{dispute.hire.employer.name}</span>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-[var(--color-neutral-500)]">
            <span>Type: <span className="font-semibold">{dispute.type.replace(/_/g, ' ')}</span></span>
            <span>Raised by: <span className="font-semibold">{dispute.raisedBy.name}</span></span>
            <span>{format(new Date(dispute.createdAt), 'd MMM yyyy')}</span>
          </div>
        </div>

        {/* Description */}
        <div className={sectionClass}>
          <p className={labelClass}>Description</p>
          <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed">{dispute.description}</p>
        </div>

        {/* Evidence */}
        <div className={sectionClass}>
          <p className={labelClass}>Evidence ({dispute.evidence.length} files)</p>
          {dispute.evidence.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dispute.evidence.map((ev: any) => (
                <a key={ev.id} href={ev.fileUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-xs text-[var(--color-primary-600)] hover:underline bg-[var(--color-neutral-50)] rounded-xl px-3 py-2">
                  {FILE_TYPE_ICON[ev.fileType] ?? <Paperclip size={14} />}
                  <span className="truncate">{ev.description || ev.fileType}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-neutral-400)] italic">No evidence uploaded yet.</p>
          )}
          {isParty && dispute.status === 'OPEN' && (
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed border-[var(--color-neutral-300)] rounded-xl text-xs text-[var(--color-neutral-500)] hover:border-[var(--color-primary-400)] transition mt-1">
              <Paperclip size={12} />
              {uploading ? 'Uploading...' : '+ Add Evidence'}
              <input ref={fileRef} type="file" className="hidden" accept="image/*,.txt,.pdf" onChange={handleAddEvidence} />
            </label>
          )}
        </div>

        {/* Timeline */}
        <div className={sectionClass}>
          <p className={labelClass}>Timeline</p>
          <div className="flex flex-col gap-3">
            {TIMELINE_STEPS.map((step, idx) => {
              const isActive = currentIdx >= idx;
              const isCurrent = currentIdx === idx;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-neutral-200)]'
                  }`}>
                    {isActive ? <CheckCircle size={12} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-400)]" />}
                  </div>
                  <span className={`text-sm ${ isCurrent ? 'font-bold text-[var(--color-neutral-900)]' : isActive ? 'text-[var(--color-neutral-700)]' : 'text-[var(--color-neutral-400)]'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            {dispute.status === 'REJECTED' && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <XCircle size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-red-700">Rejected</span>
              </div>
            )}
          </div>
        </div>

        {/* Resolution */}
        <div className={sectionClass}>
          <p className={labelClass}>Resolution</p>
          {dispute.resolution ? (
            <p className="text-sm text-[var(--color-neutral-700)] leading-relaxed">{dispute.resolution}</p>
          ) : (
            <p className="text-xs text-[var(--color-neutral-400)] italic">Awaiting admin review...</p>
          )}
        </div>
      </main>
    </div>
  );
}
