import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints';

export const useAuth = () => {
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuthStore();

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          await authApi.getProfile();
        } catch (error) {
          // Token is invalid, clear it
          logout();
        }
      }
    };

    if (isAuthenticated && !user) {
      validateToken();
    }
  }, [isAuthenticated, user, logout]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};
