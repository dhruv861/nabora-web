import type { ConfirmationResult } from 'firebase/auth';

export interface IOtpClient {
  /**
   * Initiate OTP delivery to the given phone number.
   * For Firebase: sets up RecaptchaVerifier and calls signInWithPhoneNumber.
   * For Nabora: calls POST /v1/auth/send-otp.
   *
   * @param phone 10-digit Indian mobile number (without +91)
   * @param recaptchaContainerId DOM element id for Firebase invisible recaptcha (ignored for Nabora)
   */
  sendOtp(phone: string, recaptchaContainerId?: string): Promise<ConfirmationResult | null>;

  /**
   * Verify the 6-digit OTP entered by the user.
   * @returns { token, user, isNew } — the Nabora JWT and user object
   */
  verifyOtp(
    otp: string,
    confirmationResult?: ConfirmationResult | null,
  ): Promise<{ token: string; user: object; isNew: boolean }>;
}
