import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserPermissions, useAuthStatus } from '../contexts/AuthContext';

/**
 * Hook that requires user to be authenticated
 * Redirects to login page if not authenticated
 */
export const useRequireAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthStatus();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = location.pathname + location.search;
      navigate('/auth/login', { 
        replace: true,
        state: { returnUrl } 
      });
    }
  }, [isAuthenticated, isInitialized, navigate, location]);

  return {
    isAuthenticated,
    isInitialized,
    isReady: isInitialized && isAuthenticated,
  };
};

/**
 * Hook that requires user to be admin
 * Redirects to login if not authenticated, or home if not admin
 */
export const useRequireAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthStatus();
  const { isAdmin } = useUserPermissions();

  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        // Redirect to login with return URL
        const returnUrl = location.pathname + location.search;
        navigate('/auth/login', { 
          replace: true,
          state: { returnUrl } 
        });
      } else if (!isAdmin) {
        // Authenticated but not admin - redirect to home
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, isAdmin, navigate, location]);

  return {
    isAuthenticated,
    isAdmin,
    isInitialized,
    isReady: isInitialized && isAuthenticated && isAdmin,
  };
};

/**
 * Hook for optional authentication (doesn't redirect, just provides status)
 */
export const useOptionalAuth = () => {
  const { isAuthenticated, isInitialized } = useAuthStatus();
  const { isAdmin, isUser } = useUserPermissions();

  return {
    isAuthenticated,
    isAdmin,
    isUser,
    isInitialized,
    isReady: isInitialized,
  };
};