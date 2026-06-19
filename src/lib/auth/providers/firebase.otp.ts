'use client';

import type { ConfirmationResult, RecaptchaVerifier as RV } from 'firebase/auth';
import type { IOtpClient } from '../otp';
import { getFirebaseApp } from '../../firebase';
import { api } from '../../api';

/**
 * Firebase OTP client.
 * Uses Firebase JS SDK: RecaptchaVerifier + signInWithPhoneNumber.
 * After signInWithPhoneNumber, the confirmationResult is stored in Zustand
 * (never in localStorage — it's a Firebase SDK object that cannot be serialized).
 *
 * RULE: This file is the ONLY place in the codebase that imports from 'firebase/auth'.
 */
export class FirebaseOtpClient implements IOtpClient {
  async sendOtp(phone: string, recaptchaContainerId = 'recaptcha-container'): Promise<ConfirmationResult> {
    const { getAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
    const auth = getAuth(getFirebaseApp());
    auth.languageCode = 'en';

    // Destroy previous verifier if it exists on the window
    const win = window as Window & { recaptchaVerifier?: RV };
    if (win.recaptchaVerifier) {
      win.recaptchaVerifier.clear();
    }

    win.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });

    const result = await signInWithPhoneNumber(auth, `+91${phone}`, win.recaptchaVerifier);
    return result;
  }

  async verifyOtp(
    otp: string,
    confirmationResult?: ConfirmationResult | null,
  ): Promise<{ token: string; user: object; isNew: boolean }> {
    if (!confirmationResult) throw new Error('No OTP session. Please request OTP again.');

    const firebaseResult = await confirmationResult.confirm(otp);
    const idToken = await firebaseResult.user.getIdToken();

    // Exchange Firebase ID token for a Nabora JWT
    const res = await api.post<{ data: { token: string; user: object; isNew: boolean } }>(
      '/auth/verify-firebase-token',
      { idToken },
    );
    return res.data.data;
  }
}
