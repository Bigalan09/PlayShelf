import React from 'react';
import type { ReactNode } from 'react';
import { useRequireAdmin } from '../../hooks/useAuthGuards';
import { AdminRoute } from './ProtectedRoute';

// ============================================================================
// Admin Only Route Component
// ============================================================================

interface AdminOnlyRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route wrapper that requires admin access
 * Combines useRequireAdmin hook with AdminRoute component
 * Automatically redirects to login if not authenticated, or home if not admin
 */
export const AdminOnlyRoute: React.FC<AdminOnlyRouteProps> = ({
  children,
  fallback,
}) => {
  useRequireAdmin();

  return (
    <AdminRoute fallback={fallback}>
      {children}
    </AdminRoute>
  );
};

export default AdminOnlyRoute;