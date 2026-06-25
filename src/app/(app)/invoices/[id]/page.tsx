'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { ArrowLeft, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function MarkPaidSheet({ invoiceId, onClose, onSuccess }: { invoiceId: string; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState('UPI');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/invoices/${invoiceId}/mark-paid`, {
        paymentMethod: method,
        paymentReference: ref || undefined,
        paymentDate: date,
        paymentProofUrl: proofUrl || undefined,
      });
    },
    onSuccess: () => { toast.success('Payment recorded!'); onSuccess(); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed.'),
  });

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('type', 'PORTFOLIO');
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProofUrl(res.data.data.url);
      toast.success('Proof uploaded.');
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 flex flex-col gap-4">
        <h2 className="font-bold text-base">Record Payment</h2>
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Payment Method</label>
          <div className="flex gap-2">
            {['UPI', 'Cash', 'Bank Transfer'].map((m) => (
              <button key={m} onClick={() => setMethod(m.replace(' ', '_').toUpperCase())}
                className={`flex-1 py-2 border rounded-xl text-xs font-bold transition ${
                  method === m.replace(' ', '_').toUpperCase() ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-600)]'
                }`}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Transaction Reference</label>
          <input className={inputClass} placeholder="UTR / receipt number" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Payment Date</label>
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-1.5">Upload Proof <span className="font-normal normal-case text-[var(--color-neutral-400)]">(optional)</span></label>
          {proofUrl ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 size={14} />Proof uploaded
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-[var(--color-neutral-300)] rounded-xl text-xs text-[var(--color-neutral-500)] hover:border-[var(--color-primary-400)] transition">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : '📎'} {uploading ? 'Uploading...' : 'Choose file'}
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleProofUpload} />
            </label>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold">Cancel</button>
          <Button className="flex-1" onClick={() => markPaidMutation.mutate()} isLoading={markPaidMutation.isPending}>Confirm Payment</Button>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const invoiceId = params.id as string;
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => { const res = await api.get(`/invoices/${invoiceId}`); return res.data.data as any; },
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`);
      const { url, generating } = res.data.data;
      if (generating) { toast.info('PDF is being generated. Please try again in a moment.'); return; }
      if (url) window.open(url, '_blank');
    } catch { toast.error('Failed to get PDF link.'); }
    finally { setDownloading(false); }
  };

  if (isLoading) return <LoadingState />;
  if (error || !invoice) return <EmptyState title="Invoice not found" description="" action={{ label: 'Back', onClick: () => router.push('/invoices') }} />;

  const isEmployer = user?.id === invoice.hire?.employerId;
  const canMarkPaid = isEmployer && ['PENDING', 'SENT'].includes(invoice.status);
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'd MMM yyyy') : '—';
  const fmtTime = (d: string | null) => d ? format(new Date(d), 'h:mm a') : '—';
  const fmtAmount = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sectionClass = 'bg-white rounded-3xl border border-[var(--color-neutral-200)] p-5 shadow-sm flex flex-col gap-3';
  const labelClass = 'text-[10px] font-bold text-[var(--color-neutral-400)] uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {showMarkPaid && (
        <MarkPaidSheet
          invoiceId={invoiceId}
          onClose={() => setShowMarkPaid(false)}
          onSuccess={() => { setShowMarkPaid(false); queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); }}
        />
      )}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/invoices')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Invoice</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-neutral-200)] rounded-xl text-xs font-bold text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] transition disabled:opacity-50"
          >
            {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            PDF
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Nabora header */}
        <div className={sectionClass}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-extrabold text-[var(--color-primary-600)]">nabora</div>
              <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">nabora.in</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-[var(--color-neutral-900)] font-mono">{invoice.invoiceNumber}</p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">Issued: {fmtDate(invoice.invoiceDate)}</p>
              <p className="text-xs text-[var(--color-neutral-500)]">Due: {fmtDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* FROM / TO */}
        <div className="grid grid-cols-2 gap-3">
          <div className={sectionClass}>
            <p className={labelClass}>From (Employer)</p>
            <p className="font-bold text-sm text-[var(--color-neutral-900)]">{invoice.employerName}</p>
            {invoice.employerAddress && <p className="text-xs text-[var(--color-neutral-500)]">{invoice.employerAddress}</p>}
            {invoice.employerGstin && <p className="text-xs text-[var(--color-neutral-500)]">GST: {invoice.employerGstin}</p>}
          </div>
          <div className={sectionClass}>
            <p className={labelClass}>To (Worker)</p>
            <p className="font-bold text-sm text-[var(--color-neutral-900)]">{invoice.workerName}</p>
            <p className="text-xs text-[var(--color-neutral-500)]">{invoice.workerPhone}</p>
            {invoice.workerUpiId && <p className="text-xs text-[var(--color-neutral-500)]">UPI: {invoice.workerUpiId}</p>}
          </div>
        </div>

        {/* Job reference */}
        <div className={sectionClass}>
          <p className={labelClass}>Job Reference</p>
          <p className="font-bold text-sm text-[var(--color-neutral-900)]">{invoice.jobTitle}{invoice.eventName ? ` — ${invoice.eventName}` : ''}</p>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {[['Work Date', fmtDate(invoice.workDate)], ['Check-In', fmtTime(invoice.checkInTime)], ['Check-Out', fmtTime(invoice.checkOutTime)], ['Total Hours', invoice.totalHours ? `${invoice.totalHours}h` : '—']].map(([l, v]) => (
              <div key={l}><p className={labelClass}>{l}</p><p className="text-sm font-semibold text-[var(--color-neutral-800)]">{v}</p></div>
            ))}
          </div>
        </div>

        {/* Line items */}
        <div className={sectionClass}>
          <p className={labelClass}>Line Items</p>
          <div className="flex flex-col gap-2">
            {invoice.lineItems?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-neutral-800)] truncate">{item.description}</p>
                  <p className="text-xs text-[var(--color-neutral-500)]">{item.quantity} {item.unit.toLowerCase()} × {fmtAmount(item.rate)}</p>
                </div>
                <p className="font-bold text-[var(--color-neutral-900)] shrink-0">{fmtAmount(item.amount)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-neutral-100)] pt-3 flex flex-col gap-2">
            <div className="flex justify-between text-sm text-[var(--color-neutral-600)]">
              <span>Subtotal</span><span>{fmtAmount(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--color-neutral-600)]">
              <span>Platform Fee</span><span>{fmtAmount(invoice.platformFee)}</span>
            </div>
            {invoice.gstApplicable && (
              <div className="flex justify-between text-sm text-[var(--color-neutral-600)]">
                <span>GST ({(invoice.gstRate * 100).toFixed(0)}%)</span><span>{fmtAmount(invoice.gstAmount)}</span>
              </div>
            )}
            {invoice.tdsApplicable && (
              <div className="flex justify-between text-sm text-red-600">
                <span>TDS deduction ({(invoice.tdsRate * 100).toFixed(1)}%)</span><span>-{fmtAmount(invoice.tdsAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-[var(--color-neutral-900)] border-t border-[var(--color-neutral-200)] pt-2 mt-1">
              <span>Total Payable</span><span>{fmtAmount(invoice.totalPayable)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        {invoice.paymentMethod && (
          <div className={sectionClass}>
            <p className={labelClass}>Payment</p>
            <div className="grid grid-cols-3 gap-3">
              <div><p className={labelClass}>Method</p><p className="text-sm font-semibold text-[var(--color-neutral-800)]">{invoice.paymentMethod}</p></div>
              {invoice.paymentReference && <div><p className={labelClass}>Reference</p><p className="text-sm font-semibold text-[var(--color-neutral-800)]">{invoice.paymentReference}</p></div>}
              {invoice.paymentDate && <div><p className={labelClass}>Date</p><p className="text-sm font-semibold text-[var(--color-neutral-800)]">{fmtDate(invoice.paymentDate)}</p></div>}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className={sectionClass}>
            <p className={labelClass}>Notes</p>
            <p className="text-sm text-[var(--color-neutral-600)]">{invoice.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          {canMarkPaid && (
            <Button fullWidth onClick={() => setShowMarkPaid(true)} leftIcon={<CheckCircle2 size={16} />}>
              Mark as Paid
            </Button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 flex items-center justify-center gap-2 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] transition disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </main>
    </div>
  );
}
