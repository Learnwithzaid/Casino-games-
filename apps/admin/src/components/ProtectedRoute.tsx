import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Admin' | 'SuperAdmin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, setError } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthenticated) {
        setIsValidating(false);
        return;
      }

      try {
        await authApi.validateSession();
        setIsValidating(false);
      } catch (err) {
        setError('Session expired');
        useAuthStore.getState().logout();
        setIsValidating(false);
      }
    };

    validateSession();
  }, [isAuthenticated, setError]);

  if (isValidating) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
