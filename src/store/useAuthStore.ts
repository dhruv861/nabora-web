import type { ConfirmationResult } from 'firebase/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  accountType: string;
  verificationLevel: string;
  availabilityStatus: string;
  isNewWorker: boolean;
  reliabilityScore: number;
  averageRating: number;
  city: string | null;
  citySlug: string | null;
  isAdmin: boolean;
  workerProfile: {
    id: string;
    headline: string | null;
    categorySlug: string | null;
    slug: string;
  } | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** Firebase confirmationResult — NEVER persisted to localStorage */
  confirmationResult: ConfirmationResult | null;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setConfirmationResult: (cr: ConfirmationResult | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      // Not persisted — see partialize below
      confirmationResult: null,

      setToken: (token) => set({ token, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setConfirmationResult: (confirmationResult) => set({ confirmationResult }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false, confirmationResult: null }),
    }),
    {
      name: 'nabora-auth',
      // CRITICAL: confirmationResult must NOT be persisted — it's a Firebase SDK object
      // that cannot be serialized and must stay in memory only (per spec)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // confirmationResult intentionally excluded
      }),
    },
  ),
);
