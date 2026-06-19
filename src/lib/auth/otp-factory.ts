import type { IOtpClient } from './otp';

/**
 * Factory — reads NEXT_PUBLIC_AUTH_PROVIDER env var and returns the correct client.
 * Auth screens call createOtpClient() — they never import Firebase or axios directly.
 */
export async function createOtpClient(): Promise<IOtpClient> {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'firebase';

  if (provider === 'nabora') {
    const { NaboraOtpClient } = await import('./providers/nabora.otp');
    return new NaboraOtpClient();
  }

  // Default: firebase
  const { FirebaseOtpClient } = await import('./providers/firebase.otp');
  return new FirebaseOtpClient();
}
