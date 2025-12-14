import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser, AdminSession } from '@/types';

interface AuthStore {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  sessionExpiresAt: Date | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  totpRequired: boolean;
  error: string | null;

  setUser: (user: AdminUser) => void;
  setSession: (session: Partial<AdminSession>) => void;
  setTOTPRequired: (required: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      sessionExpiresAt: null,
      isAuthenticated: false,
      isLoading: false,
      totpRequired: false,
      error: null,

      setUser: (user: AdminUser) => {
        set({ user, isAuthenticated: true });
      },

      setSession: (session: Partial<AdminSession>) => {
        set({
          user: session.user || null,
          token: session.token || null,
          refreshToken: session.refreshToken || null,
          sessionExpiresAt: session.expiresAt || null,
          isAuthenticated: !!session.token,
        });
      },

      setTOTPRequired: (required: boolean) => {
        set({ totpRequired: required });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          sessionExpiresAt: null,
          isAuthenticated: false,
          totpRequired: false,
          error: null,
        });
        localStorage.removeItem('admin-session');
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'admin-session',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionExpiresAt: state.sessionExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
