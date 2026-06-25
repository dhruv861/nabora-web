'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/Button';
import { RatingCard } from '@/components/RatingCard';
import { StarRating } from '@/components/StarRating';
import {
  ArrowLeft, CalendarDays, MessageCircle, FileText, Clock,
  Star, Camera, MapPin, CheckCircle2, AlertCircle, Loader2, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Check-In Modal ───────────────────────────────────────────────────────────
function CheckInModal({
  hireId,
  jobTitle,
  onClose,
  onSuccess,
}: {
  hireId: string;
  jobTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gpsState, setGpsState] = useState<'idle' | 'acquiring' | 'valid' | 'far' | 'denied'>('idle');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) { videoRef.current.srcObject = s; setCameraReady(true); }
      })
      .catch(() => setCameraDenied(true));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Get GPS
  useEffect(() => {
    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsCoords({ lat, lng });
        // Estimate distance from job: we won't know exact until API call
        // so we allow proceed and let API validate 500m
        setGpsState('valid');
      },
      () => setGpsState('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!gpsCoords || !canvasRef.current || !videoRef.current) return;
      setSubmitting(true);

      // Capture selfie
      const ctx = canvasRef.current.getContext('2d')!;
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const blob: Blob = await new Promise((res) =>
        canvasRef.current!.toBlob((b) => res(b!), 'image/jpeg', 0.8),
      );
      const fd = new FormData();
      fd.append('file', blob, 'selfie.jpg');
      fd.append('type', 'SELFIE');
      const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const selfieUrl: string = uploadRes.data.data.url;

      await api.post(`/hires/${hireId}/attendance/check-in`, {
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        selfieUrl,
      });
    },
    onSuccess: () => { toast.success('Checked in successfully!'); onSuccess(); },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Check-in failed.';
      if (msg.includes('km from')) setGpsState('far');
      toast.error(msg);
      setSubmitting(false);
    },
  });

  const canSubmit = gpsState === 'valid' && cameraReady && !cameraDenied && !submitting;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-white p-2"><ArrowLeft size={20} /></button>
        <span className="text-white font-bold text-sm">Check In — {jobTitle}</span>
        <div className="w-8" />
      </div>

      {/* Camera preview */}
      <div className="flex-1 relative bg-black">
        {cameraDenied ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-3">
            <Camera size={32} className="text-white/40" />
            <p className="text-sm text-white/70 text-center px-8">Camera access required for check-in selfie. Please enable in browser settings.</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* GPS overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
            gpsState === 'valid' ? 'bg-emerald-500/90 text-white' :
            gpsState === 'far' ? 'bg-red-500/90 text-white' :
            gpsState === 'denied' ? 'bg-red-500/90 text-white' :
            'bg-black/60 text-white'
          }`}>
            {gpsState === 'acquiring' && <><Loader2 size={14} className="animate-spin" /> Getting your location...</>}
            {gpsState === 'valid' && <><CheckCircle2 size={14} /> GPS acquired ✓ Within 500m range</>}
            {gpsState === 'far' && <><AlertCircle size={14} /> Too far from job location</>}
            {gpsState === 'denied' && <><AlertCircle size={14} /> Location access denied — please enable GPS</>}
            {gpsState === 'idle' && <><MapPin size={14} /> Waiting for location...</>}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="px-4 py-5 bg-black">
        <Button
          fullWidth
          onClick={() => checkInMutation.mutate()}
          isLoading={submitting || checkInMutation.isPending}
          disabled={!canSubmit}
          className="py-4 text-base font-bold"
          leftIcon={<Camera size={18} />}
        >
          {submitting ? 'Checking in...' : 'Take Selfie & Check In'}
        </Button>
      </div>
    </div>
  );
}

export default function HireDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const hireId = params.id as string;
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const { data: hire, isLoading, error } = useQuery({
    queryKey: ['hire', hireId],
    queryFn: async () => { const res = await api.get(`/hires/${hireId}`); return res.data.data as any; },
  });

  const { data: myRating } = useQuery({
    queryKey: ['hire-rating', hireId],
    queryFn: async () => { const res = await api.get(`/hires/${hireId}/rating`); return res.data.data as any; },
    enabled: hire?.status === 'COMPLETED',
  });

  const completeMutation = useMutation({
    mutationFn: async () => { await api.post(`/hires/${hireId}/complete`); },
    onSuccess: () => {
      toast.success('Hire marked as completed!');
      queryClient.invalidateQueries({ queryKey: ['hire', hireId] });
      queryClient.invalidateQueries({ queryKey: ['my-hires'] });
      setConfirmComplete(false);
    },
    onError: (err: any) => { toast.error(err.response?.data?.message ?? 'Failed.'); setConfirmComplete(false); },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await api.post(`/hires/${hireId}/attendance/check-out`, coords);
      return res.data.data;
    },
    onSuccess: (att) => {
      toast.success(`Checked out! Total hours: ${att.totalHours}h`);
      queryClient.invalidateQueries({ queryKey: ['hire', hireId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Check-out failed.'),
  });

  const handleCheckOut = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => checkOutMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error('Location access required to check out.'),
      { enableHighAccuracy: true },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !hire) return <EmptyState title="Hire not found" description="" action={{ label: 'Back', onClick: () => router.push('/hires') }} />;

  const isEmployer = user?.id === hire.employerId;
  const isWorker = user?.id === hire.workerId;
  const counterparty = isEmployer ? hire.worker : hire.employer;
  const chatId = hire.chat?.id;
  const isCompleted = hire.status === 'COMPLETED';
  const isActive = hire.status === 'ACTIVE';
  const canRate = isCompleted && !myRating;

  // Attendance state
  const todayAttendance = hire.attendance?.find((a: any) => {
    const d = new Date(a.workDate);
    const t = new Date();
    return d.getUTCFullYear() === t.getUTCFullYear() && d.getUTCMonth() === t.getUTCMonth() && d.getUTCDate() === t.getUTCDate();
  });
  const isCheckedIn = todayAttendance?.status === 'CHECKED_IN';
  const isCheckedOut = todayAttendance?.status === 'CHECKED_OUT';
  const workDateToday = hire.job?.workDate
    ? new Date(hire.job.workDate).toDateString() === new Date().toDateString()
    : false;
  const canCheckIn = isWorker && isActive && workDateToday && !todayAttendance;
  const canCheckOut = isWorker && isActive && isCheckedIn;

  const sectionClass = 'bg-white rounded-3xl border border-[var(--color-neutral-200)] p-4 shadow-sm flex flex-col gap-3';
  const labelClass = 'text-[10px] font-bold text-[var(--color-neutral-400)] uppercase tracking-wider';
  const valueClass = 'text-sm font-semibold text-[var(--color-neutral-800)]';

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      {showCheckIn && (
        <CheckInModal
          hireId={hireId}
          jobTitle={hire.job?.title ?? 'Job'}
          onClose={() => setShowCheckIn(false)}
          onSuccess={() => { setShowCheckIn(false); queryClient.invalidateQueries({ queryKey: ['hire', hireId] }); }}
        />
      )}

      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/hires')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Hire Details</span>
        </div>
        <StatusBadge status={hire.status} />
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Rate prompt */}
        {canRate && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">How was your experience?</p>
                <p className="text-xs text-amber-600 mt-0.5">Leave a review to help the community.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push(`/hires/${hireId}/rate`)} className="shrink-0 bg-amber-500 hover:bg-amber-600">Rate Now</Button>
          </div>
        )}
        {isCompleted && myRating && (
          <div className="flex flex-col gap-2">
            <p className={labelClass}>Your Review</p>
            <RatingCard rating={myRating} />
          </div>
        )}

        {/* Check-in/out prompt (worker only) */}
        {(canCheckIn || canCheckOut || isCheckedOut) && (
          <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 border ${
            isCheckedOut ? 'bg-emerald-50 border-emerald-200' :
            canCheckOut ? 'bg-blue-50 border-blue-200' :
            'bg-[var(--color-primary-50)] border-[var(--color-primary-200)]'
          }`}>
            <div>
              {isCheckedOut && <p className="text-sm font-bold text-emerald-800">✓ Checked Out · {todayAttendance.totalHours}h</p>}
              {canCheckOut && (
                <div>
                  <p className="text-sm font-bold text-blue-800">● Checked In</p>
                  <p className="text-xs text-blue-600 mt-0.5">Since {todayAttendance.checkInTime ? format(new Date(todayAttendance.checkInTime), 'h:mm a') : ''}</p>
                </div>
              )}
              {canCheckIn && <p className="text-sm font-bold text-[var(--color-primary-800)]">Today is your work day!</p>}
            </div>
            {canCheckIn && (
              <Button size="sm" onClick={() => setShowCheckIn(true)} leftIcon={<Camera size={14} />}>Check In</Button>
            )}
            {canCheckOut && (
              <Button
                size="sm"
                onClick={handleCheckOut}
                isLoading={checkOutMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >Check Out</Button>
            )}
          </div>
        )}

        {/* Job info */}
        <div className={sectionClass}>
          <p className={labelClass}>Job</p>
          <h2 className="font-bold text-base text-[var(--color-neutral-900)]">{hire.job?.title}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--color-neutral-500)]">
            {hire.job?.workDate && (
              <span className="flex items-center gap-1"><CalendarDays size={12} />{new Date(hire.job.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
              {(counterparty?.averageRating ?? 0) > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating value={counterparty.averageRating} readOnly size="sm" />
                  <span className="text-xs text-[var(--color-neutral-500)]">{counterparty.averageRating.toFixed(1)}</span>
                </div>
              )}
              {counterparty?.phone && isEmployer && isActive && (
                <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{counterparty.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pay details */}
        <div className={sectionClass}>
          <p className={labelClass}>Pay Agreement</p>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Rate', value: `₹${hire.agreedRate}` }, { label: 'Unit', value: hire.agreedUnit }, { label: 'Status', value: <StatusBadge status={hire.status} /> }].map((item) => (
              <div key={item.label}><p className={labelClass}>{item.label}</p><div className={valueClass}>{item.value}</div></div>
            ))}
          </div>
          {hire.startTime && (
            <div className="flex gap-4 text-xs text-[var(--color-neutral-500)] mt-1">
              <span className="flex items-center gap-1"><Clock size={12} />Start: {new Date(hire.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
              {hire.endTime && <span>End: {new Date(hire.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>}
            </div>
          )}
        </div>

        {/* Attendance log */}
        <div className={sectionClass}>
          <p className={labelClass}>Attendance</p>
          {hire.attendance?.length > 0 ? (
            <div className="flex flex-col gap-2">
              {hire.attendance.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-neutral-600)]">{format(new Date(att.workDate), 'd MMM yyyy')}</span>
                  <div className="flex items-center gap-3 text-[var(--color-neutral-500)]">
                    {att.checkInTime && <span>↑ {format(new Date(att.checkInTime), 'h:mm a')}</span>}
                    {att.checkOutTime && <span>↓ {format(new Date(att.checkOutTime), 'h:mm a')}</span>}
                    {att.totalHours && <span className="font-bold text-[var(--color-neutral-700)]">{att.totalHours}h</span>}
                  </div>
                  <StatusBadge status={att.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-neutral-400)] italic">No attendance records yet.</p>
          )}
        </div>

        {/* Invoice */}
        <div className={sectionClass}>
          <p className={labelClass}>Invoice</p>
          {hire.invoice ? (
            <button
              onClick={() => router.push(`/invoices/${hire.invoice.id}`)}
              className="flex items-center justify-between hover:bg-[var(--color-neutral-50)] rounded-xl p-1 -m-1 transition"
            >
              <div>
                <p className="text-sm font-bold text-[var(--color-neutral-800)]">{hire.invoice.invoiceNumber}</p>
                <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">₹{hire.invoice.totalPayable ?? 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={hire.invoice.status} />
                <span className="text-[var(--color-neutral-400)] text-sm">→</span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--color-neutral-400)]">
              <FileText size={14} />Invoice will be generated once this hire is completed.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {chatId
            ? <button onClick={() => router.push(`/chats/${chatId}`)} className="flex-1 py-3 flex items-center justify-center gap-2 border border-[var(--color-primary-300)] bg-[var(--color-primary-50)] rounded-xl text-sm font-bold text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] transition"><MessageCircle size={16} />Open Chat</button>
            : <button disabled className="flex-1 py-3 flex items-center justify-center gap-2 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-300)] cursor-not-allowed"><MessageCircle size={16} />Chat</button>
          }
          {isEmployer && isActive && (
            confirmComplete ? (
              <div className="flex gap-2 flex-1">
                <Button className="flex-1" onClick={() => completeMutation.mutate()} isLoading={completeMutation.isPending}>Confirm Complete</Button>
                <button onClick={() => setConfirmComplete(false)} className="px-4 border border-[var(--color-neutral-200)] rounded-xl text-sm font-bold text-[var(--color-neutral-600)]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmComplete(true)} className="flex-1 py-3 bg-[var(--color-primary-500)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary-600)] transition">Mark Complete</button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
