'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, Paperclip, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Suspense } from 'react';

const DISPUTE_TYPES = [
  { id: 'WORKER_NO_SHOW', label: 'Worker did not show up' },
  { id: 'ATTENDANCE_DISPUTE', label: 'Attendance is incorrect' },
  { id: 'PAYMENT_DISPUTE', label: 'Payment not received' },
  { id: 'FRAUDULENT_REVIEW', label: 'Fraudulent review' },
];

function CreateDisputeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hireId = searchParams.get('hireId') ?? '';

  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<{ url: string; name: string; fileType: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: hire, isLoading } = useQuery({
    queryKey: ['hire-summary', hireId],
    queryFn: async () => { const res = await api.get(`/hires/${hireId}`); return res.data.data as any; },
    enabled: !!hireId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/hires/${hireId}/disputes`, { type, description });
      const dispute = res.data.data;
      // Upload evidence one by one
      for (const f of evidenceFiles) {
        await api.post(`/disputes/${dispute.id}/evidence`, {
          fileUrl: f.url,
          fileType: f.fileType,
          description: f.name,
        });
      }
      return dispute;
    },
    onSuccess: (dispute) => {
      toast.success('Dispute raised. Our team will review shortly.');
      router.push(`/disputes/${dispute.id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to raise dispute.'),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (evidenceFiles.length + files.length > 5) { toast.error('Maximum 5 evidence files allowed.'); return; }
    setUploading(true);
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file); fd.append('type', 'DISPUTE_EVIDENCE');
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const fileType = file.type.startsWith('image/') ? 'IMAGE' : 'CHAT_EXPORT';
        setEvidenceFiles((prev) => [...prev, { url: res.data.data.url, name: file.name, fileType }]);
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (isLoading) return <LoadingState />;

  const canSubmit = !!type && description.length >= 10;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <h2 className="font-bold text-base text-[var(--color-neutral-900)]">Are you sure?</h2>
            <p className="text-sm text-[var(--color-neutral-600)] leading-relaxed">
              Once submitted, this hire will be flagged as Disputed. Both parties will be notified and our team will review.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold">Cancel</button>
              <Button className="flex-1" onClick={() => { setShowConfirm(false); createMutation.mutate(); }} isLoading={createMutation.isPending}>
                Submit Dispute
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Raise a Dispute</span>
          {hire?.job?.title && <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{hire.job.title}</p>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Type selector */}
        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-3">
          <p className="font-bold text-sm text-[var(--color-neutral-800)]">What is your dispute about?</p>
          {DISPUTE_TYPES.map((dt) => (
            <button
              key={dt.id}
              onClick={() => setType(dt.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition ${
                type === dt.id
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                  : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                type === dt.id ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-neutral-300)]'
              }`}>
                {type === dt.id && <div className="w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />}
              </div>
              {dt.label}
            </button>
          ))}
        </section>

        {/* Description */}
        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm">
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Describe the issue *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={5}
            placeholder="Provide details about what happened..."
            className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none resize-none"
          />
          <div className="text-right text-[10px] text-[var(--color-neutral-400)] mt-1">{description.length} / 1000</div>
        </section>

        {/* Evidence */}
        <section className="bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-3">
          <p className="font-bold text-sm text-[var(--color-neutral-800)]">Upload Evidence <span className="font-normal text-[var(--color-neutral-400)]">(optional, max 5)</span></p>
          {evidenceFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-neutral-700)] bg-[var(--color-neutral-50)] rounded-xl px-3 py-2">
              <Paperclip size={12} className="text-[var(--color-neutral-400)]" />
              <span className="flex-1 truncate">{f.name}</span>
              <button onClick={() => setEvidenceFiles((prev) => prev.filter((_, j) => j !== i))}>
                <X size={12} className="text-[var(--color-neutral-400)] hover:text-red-500" />
              </button>
            </div>
          ))}
          {evidenceFiles.length < 5 && (
            <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border border-dashed border-[var(--color-neutral-300)] rounded-xl text-sm text-[var(--color-neutral-500)] hover:border-[var(--color-primary-400)] transition">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
              {uploading ? 'Uploading...' : '+ Add screenshots / photos'}
              <input ref={fileRef} type="file" className="hidden" accept="image/*,.txt,.pdf" multiple onChange={handleFileUpload} />
            </label>
          )}
        </section>

        <Button
          fullWidth
          disabled={!canSubmit}
          onClick={() => setShowConfirm(true)}
          isLoading={createMutation.isPending}
          className="py-3 font-bold"
        >
          Submit Dispute
        </Button>
      </main>
    </div>
  );
}

export default function CreateDisputePage() {
  return <Suspense fallback={<LoadingState />}><CreateDisputeContent /></Suspense>;
}
