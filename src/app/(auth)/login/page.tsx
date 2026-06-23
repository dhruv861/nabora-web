'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { createOtpClient } from '@/lib/auth/otp-factory';
import { useAuthStore } from '@/store/useAuthStore';
import type { ConfirmationResult } from 'firebase/auth';

const PHONE_REGEX = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const setConfirmationResult = useAuthStore((s) => s.setConfirmationResult);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!PHONE_REGEX.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const client = await createOtpClient();
      const result: ConfirmationResult | null = await client.sendOtp(phone, 'recaptcha-container');

      // Store confirmationResult in Zustand memory only (never persisted)
      setConfirmationResult(result);

      // Pass phone in sessionStorage for the Nabora OTP client
      sessionStorage.setItem('nabora_otp_phone', phone);

      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-primary-500)] mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl">N</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Welcome to Nabora</h1>
        <p className="text-sm text-[var(--color-neutral-500)] mt-1">India's hyperlocal workforce marketplace</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="phone-input"
              className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5"
            >
              Mobile Number
            </label>
            <div className="flex rounded-xl border border-[var(--color-neutral-300)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary-400)] focus-within:border-[var(--color-primary-400)] transition-all">
              <span className="flex items-center px-3 bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] text-sm font-medium border-r border-[var(--color-neutral-300)] shrink-0 select-none">
                🇮🇳 +91
              </span>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  setError('');
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                }}
                className="flex-1 px-4 py-3 text-sm outline-none bg-white text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)]"
                autoFocus
                autoComplete="tel"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-[var(--color-error-500)]" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            {isLoading ? 'Sending OTP…' : 'Send OTP'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-neutral-400)]">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline text-[var(--color-primary-500)]">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline text-[var(--color-primary-500)]">Privacy Policy</a>
        </p>
      </div>

      {/* Invisible recaptcha container — required for Firebase OTP */}
      <div id="recaptcha-container" ref={recaptchaRef} />
    </div>
  );
}
