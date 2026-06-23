'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { createOtpClient } from '@/lib/auth/otp-factory';
import { useAuthStore } from '@/store/useAuthStore';

const OTP_LENGTH = 6;

function VerifyComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const confirmationResult = useAuthStore((s) => s.confirmationResult);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setConfirmationResult = useAuthStore((s) => s.setConfirmationResult);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const submitOtp = useCallback(
    async (otp: string) => {
      setIsLoading(true);
      setError('');
      try {
        const client = await createOtpClient();
        const result = await client.verifyOtp(otp, confirmationResult);
        setToken(result.token);
        setUser(result.user as Parameters<typeof setUser>[0]);
        setConfirmationResult(null);

        if (result.isNew) {
          router.push('/onboarding/account-type');
        } else {
          router.push('/feed');
        }
      } catch {
        setError('Incorrect OTP. Please try again.');
        triggerShake();
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [confirmationResult, router, setConfirmationResult, setToken, setUser],
  );

  const handleDigitChange = (idx: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError('');

    if (val && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }

    if (next.every((d) => d !== '') && val) {
      submitOtp(next.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const next = pasted.split('');
      setDigits(next);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      submitOtp(pasted);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    setError('');
    setDigits(Array(OTP_LENGTH).fill(''));
    try {
      const client = await createOtpClient();
      const result = await client.sendOtp(phone, 'recaptcha-container');
      setConfirmationResult(result);
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-primary-500)] mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Enter OTP</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">
            Sent to <span className="font-semibold text-[var(--color-neutral-700)]">+91 {phone}</span>
          </p>
        </div>

        {/* OTP digits */}
        <div
          className={`flex justify-center gap-3 mb-6 transition-all ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((d, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              id={`otp-${idx}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              autoFocus={idx === 0}
              className={[
                'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all',
                'text-[var(--color-neutral-900)]',
                d
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                  : 'border-[var(--color-neutral-300)] bg-white',
                error
                  ? 'border-[var(--color-error-500)] bg-red-50'
                  : 'focus:border-[var(--color-primary-400)]',
              ].join(' ')}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-[var(--color-error-500)] mb-4" role="alert">
            {error}
          </p>
        )}

        <Button
          fullWidth
          isLoading={isLoading}
          size="lg"
          disabled={digits.some((d) => !d) || isLoading}
          onClick={() => submitOtp(digits.join(''))}
        >
          {isLoading ? 'Verifying…' : 'Verify OTP'}
        </Button>

        {/* Resend */}
        <div className="mt-6 text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-sm font-medium text-[var(--color-primary-500)] hover:underline"
            >
              Resend OTP
            </button>
          ) : (
            <p className="text-sm text-[var(--color-neutral-500)]">
              Resend in{' '}
              <span className="font-semibold text-[var(--color-neutral-700)]">{countdown}s</span>
            </p>
          )}
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mt-4 w-full text-center text-sm text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)] transition-colors"
        >
          ← Change number
        </button>
      </div>

      {/* Recaptcha for resend via Firebase */}
      <div id="recaptcha-container" />

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-8px); }
          30%, 70% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      </div>
    }>
      <VerifyComponent />
    </Suspense>
  );
}
