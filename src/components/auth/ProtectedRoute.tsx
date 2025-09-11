import React from 'react';
import type { ReactNode } from 'react';
import { useAuthStatus, useUserPermissions } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

// ============================================================================
// Loading Component
// ============================================================================

const AuthLoadingScreen: React.FC = () => (
  <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'>
    <div className='text-center'>
      <LoadingSpinner size='large' />
      <p className='mt-4 text-white/70 text-lg'>Checking authentication...</p>
    </div>
  </div>
);

// ============================================================================
// Access Denied Component
// ============================================================================

const AccessDeniedScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-900'>
    <div className='text-center max-w-md mx-auto px-4'>
      <div className='bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
        <svg
          className='w-8 h-8 text-red-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
      </div>
      <h1 className='text-2xl font-bold text-white mb-2'>Access Denied</h1>
      <p className='text-red-100 mb-6'>{message}</p>
      <button
        onClick={() => window.history.back()}
        className='bg-white text-red-600 px-6 py-2 rounded-lg hover:bg-red-50 transition-colors'
      >
        Go Back
      </button>
    </div>
  </div>
);

// ============================================================================
// Protected Route Component
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  requireAuth = true,
}) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStatus();

  // Show loading while initialising auth
  if (!isInitialized || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // This component doesn't handle redirects - that's done by useRequireAuth hook
    // This is mainly for cases where we want to show different content
    return (
      <AccessDeniedScreen 
        message='You must be logged in to access this page. Please log in and try again.' 
      />
    );
  }

  return <>{children}</>;
};

// ============================================================================
// Admin Route Component
// ============================================================================

interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStatus();
  const { isAdmin } = useUserPermissions();

  // Show loading while initialising auth
  if (!isInitialized || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // User not authenticated
  if (!isAuthenticated) {
    return (
      <AccessDeniedScreen 
        message='You must be logged in to access this page. Please log in and try again.' 
      />
    );
  }

  // User not admin
  if (!isAdmin) {
    return (
      <AccessDeniedScreen 
        message='You do not have permission to access this page. Admin access required.' 
      />
    );
  }

  return <>{children}</>;
};

// ============================================================================
// Route Guard Component (combines protection with hooks)
// ============================================================================

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  fallback,
}) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuthStatus();
  const { isAdmin } = useUserPermissions();

  // Show loading while initialising auth
  if (!isInitialized || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return (
      <AccessDeniedScreen 
        message='You must be logged in to access this page. Please log in and try again.' 
      />
    );
  }

  // Check admin requirement
  if (requireAdmin) {
    if (!isAuthenticated) {
      return (
        <AccessDeniedScreen 
          message='You must be logged in to access this page. Please log in and try again.' 
        />
      );
    }
    
    if (!isAdmin) {
      return (
        <AccessDeniedScreen 
          message='You do not have permission to access this page. Admin access required.' 
        />
      );
    }
  }

  return <>{children}</>;
};

// ============================================================================
// Default Export
// ============================================================================

export default ProtectedRoute;