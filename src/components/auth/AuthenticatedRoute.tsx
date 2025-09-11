import React from 'react';
import type { ReactNode } from 'react';
import { useRequireAuth } from '../../hooks/useAuthGuards';
import { ProtectedRoute } from './ProtectedRoute';

// ============================================================================
// Authenticated Route Component
// ============================================================================

interface AuthenticatedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route wrapper that requires authentication
 * Combines useRequireAuth hook with ProtectedRoute component
 * Automatically redirects to login if not authenticated
 */
export const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({
  children,
  fallback,
}) => {
  useRequireAuth();

  return (
    <ProtectedRoute requireAuth={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

export default AuthenticatedRoute;