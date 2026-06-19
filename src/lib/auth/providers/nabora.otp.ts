import type { ConfirmationResult } from 'firebase/auth';
import type { IOtpClient } from '../otp';
import { api } from '../../api';

/**
 * Nabora backend OTP client.
 * Calls POST /v1/auth/send-otp and POST /v1/auth/verify-otp.
 * No Firebase dependency. Used when NEXT_PUBLIC_AUTH_PROVIDER=nabora.
 */
export class NaboraOtpClient implements IOtpClient {
  async sendOtp(phone: string, _recaptchaContainerId?: string): Promise<null> {
    await api.post('/auth/send-otp', { phone });
    return null; // No confirmationResult for Nabora OTP
  }

  async verifyOtp(
    otp: string,
    _confirmationResult?: ConfirmationResult | null,
    phone?: string,
  ): Promise<{ token: string; user: object; isNew: boolean }> {
    // Phone is stored in session — retrieved from URL params in the /verify page
    const storedPhone = sessionStorage.getItem('nabora_otp_phone') ?? phone ?? '';
    const res = await api.post<{ data: { token: string; user: object; isNew: boolean } }>(
      '/auth/verify-otp',
      { phone: storedPhone, otp },
    );
    return res.data.data;
  }
}
