import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  useAuth, 
  useIsAuthenticated, 
  useCurrentUser, 
  useAuthLoading,
  useAuthError,
  useUserPermissions,
  useAuthStatus,
} from '../contexts/AuthContext';
import type { LoginRequest, RegisterRequest } from '../types/api';

// ============================================================================
// Navigation and Route Protection Hooks
// ============================================================================

/**
 * Hook for handling authentication redirects
 */
export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthStatus();

  const redirectToLogin = useCallback((returnUrl?: string) => {
    const url = returnUrl || location.pathname + location.search;
    navigate('/auth/login', { 
      state: { returnUrl: url },
      replace: true 
    });
  }, [navigate, location]);

  const redirectToDashboard = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const redirectToHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const redirectAfterLogin = useCallback(() => {
    const returnUrl = location.state?.returnUrl as string;
    if (returnUrl && returnUrl !== '/auth/login' && returnUrl !== '/auth/signup') {
      navigate(returnUrl, { replace: true });
    } else {
      redirectToDashboard();
    }
  }, [location.state, navigate, redirectToDashboard]);

  return {
    isAuthenticated,
    isInitialized,
    redirectToLogin,
    redirectToDashboard,
    redirectToHome,
    redirectAfterLogin,
  };
};

/**
 * Hook for protected routes - automatically redirects if not authenticated
 */
export const useRequireAuth = (redirectUrl?: string) => {
  const { isAuthenticated, isInitialized } = useAuthStatus();
  const { redirectToLogin } = useAuthRedirect();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      redirectToLogin(redirectUrl);
    }
  }, [isAuthenticated, isInitialized, redirectToLogin, redirectUrl]);

  return {
    isAuthenticated,
    isInitialized,
    isReady: isInitialized && isAuthenticated,
  };
};

/**
 * Hook for admin-only routes
 */
export const useRequireAdmin = (redirectUrl?: string) => {
  const { isAuthenticated, isInitialized } = useAuthStatus();
  const { isAdmin } = useUserPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        navigate('/auth/login', { 
          state: { returnUrl: redirectUrl || window.location.pathname },
          replace: true 
        });
      } else if (!isAdmin) {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, isAdmin, navigate, redirectUrl]);

  return {
    isAuthenticated,
    isAdmin,
    isInitialized,
    isReady: isInitialized && isAuthenticated && isAdmin,
  };
};

/**
 * Hook for guest-only routes (login, signup) - redirects authenticated users
 */
export const useGuestOnly = () => {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔒 useGuestOnly effect triggered:', {
      isInitialized,
      isAuthenticated,
      isLoading,
      pathname: location.pathname,
      returnUrl: location.state?.returnUrl
    });
    
    // Only proceed if auth is fully initialized and not loading
    if (isInitialized && !isLoading && isAuthenticated) {
      // Small delay to ensure all state updates have completed
      const timeoutId = setTimeout(() => {
        const returnUrl = location.state?.returnUrl as string;
        console.log('🔒 User is authenticated, redirecting after state sync...', {
          returnUrl,
          willRedirectTo: returnUrl && returnUrl !== '/auth/login' && returnUrl !== '/auth/signup' ? returnUrl : '/dashboard'
        });
        
        if (returnUrl && returnUrl !== '/auth/login' && returnUrl !== '/auth/signup') {
          console.log('🔒 Redirecting to returnUrl:', returnUrl);
          navigate(returnUrl, { replace: true });
        } else {
          console.log('🔒 Redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        }
      }, 50); // Short delay for state synchronization

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, isInitialized, isLoading, navigate, location]);

  return {
    isAuthenticated,
    isInitialized,
    isLoading,
    showContent: isInitialized && !isLoading && !isAuthenticated,
  };
};

// ============================================================================
// Authentication Form Hooks
// ============================================================================

/**
 * Hook for login form handling with validation and error management
 */
export const useLoginForm = () => {
  const { login } = useAuth();
  const { error, clearError } = useAuthError();
  const isLoading = useAuthLoading();
  const { redirectAfterLogin } = useAuthRedirect();
  
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<LoginRequest>>({});

  const updateField = useCallback((field: keyof LoginRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  }, [fieldErrors, error, clearError]);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<LoginRequest> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      redirectAfterLogin();
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login failed:', error);
    }
  }, [formData, login, validateForm, redirectAfterLogin]);

  const resetForm = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      rememberMe: false,
    });
    setFieldErrors({});
    clearError();
  }, [clearError]);

  return {
    formData,
    fieldErrors,
    error,
    isLoading,
    updateField,
    handleSubmit,
    resetForm,
    clearError,
  };
};

/**
 * Hook for registration form handling
 */
export const useRegisterForm = () => {
  const { register } = useAuth();
  const { error, clearError } = useAuthError();
  const isLoading = useAuthLoading();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<RegisterRequest>>({});

  const updateField = useCallback((field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  }, [fieldErrors, error, clearError]);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<RegisterRequest> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData);
      // Registration successful - redirect or show verification message
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Registration failed:', error);
    }
  }, [formData, register, validateForm, navigate]);

  const resetForm = useCallback(() => {
    setFormData({
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    });
    setFieldErrors({});
    clearError();
  }, [clearError]);

  return {
    formData,
    fieldErrors,
    error,
    isLoading,
    updateField,
    handleSubmit,
    resetForm,
    clearError,
  };
};

// ============================================================================
// User Profile and Management Hooks
// ============================================================================

/**
 * Hook for user profile information and management
 */
export const useUserProfile = () => {
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const { isAdmin, isUser } = useUserPermissions();

  const getDisplayName = useCallback(() => {
    if (!user) return 'Guest';
    return `${user.firstName} ${user.lastName}`.trim() || user.username || user.email;
  }, [user]);

  const getInitials = useCallback(() => {
    if (!user) return 'G';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 
           user.username.charAt(0).toUpperCase() || 
           user.email.charAt(0).toUpperCase();
  }, [user]);

  return {
    user,
    isAdmin,
    isUser,
    getDisplayName,
    getInitials,
    updateUser,
  };
};

/**
 * Hook for managing user sessions and security
 */
export const useUserSecurity = () => {
  const { logout, refreshToken } = useAuth();
  const { isAuthenticated } = useAuthStatus();
  
  const forceLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Force logout failed:', error);
    }
  }, [logout]);

  const refreshSession = useCallback(async () => {
    if (!isAuthenticated) return false;
    
    try {
      await refreshToken();
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }, [refreshToken, isAuthenticated]);

  return {
    forceLogout,
    refreshSession,
    isAuthenticated,
  };
};

// ============================================================================
// Export All Hooks
// ============================================================================

export {
  // Re-export from AuthContext for convenience
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useAuthLoading,
  useAuthError,
  useUserPermissions,
  useAuthStatus,
};

// Export default object with all hooks
export default {
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useAuthLoading,
  useAuthError,
  useUserPermissions,
  useAuthStatus,
  useAuthRedirect,
  useRequireAuth,
  useRequireAdmin,
  useGuestOnly,
  useLoginForm,
  useRegisterForm,
  useUserProfile,
  useUserSecurity,
};