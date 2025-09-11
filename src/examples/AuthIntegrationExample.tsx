/**
 * Example demonstrating AuthContext integration patterns
 * This file shows various ways to integrate the AuthContext system
 * into existing PlayShelf components and pages.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { 
  useAuth, 
  useIsAuthenticated, 
  useAuthLoading,
  useAuthError,
  useUserPermissions,
  useAuthStatus,
} from '../contexts/AuthContext';
import { 
  useRequireAuth, 
  useRequireAdmin, 
  useGuestOnly, 
  useLoginForm,
  useUserProfile,
} from '../hooks/useAuthHooks';

// ============================================================================
// Example 1: Simple Authentication Check
// ============================================================================

const SimpleAuthExample: React.FC = () => {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <div>Please log in to access this content</div>;
  }

  return <div>Welcome! You are authenticated.</div>;
};

// ============================================================================
// Example 2: User Profile Display
// ============================================================================

const UserProfileExample: React.FC = () => {
  const { user, getDisplayName, getInitials } = useUserProfile();
  
  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-game-purple text-white rounded-full flex items-center justify-center">
        {getInitials()}
      </div>
      <div>
        <div className="font-semibold">{getDisplayName()}</div>
        <div className="text-sm text-gray-600">{user.email}</div>
      </div>
    </div>
  );
};

// ============================================================================
// Example 3: Protected Route Component
// ============================================================================

const ProtectedRouteExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized, isReady } = useRequireAuth();
  
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-purple"></div>
      </div>
    );
  }
  
  if (!isReady) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <>{children}</>;
};

// ============================================================================
// Example 4: Admin Only Route
// ============================================================================

const AdminOnlyExample: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady } = useRequireAdmin();
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-purple mx-auto mb-4"></div>
          <div>Checking permissions...</div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// ============================================================================
// Example 5: Login Form Integration
// ============================================================================

const LoginFormExample: React.FC = () => {
  const {
    formData,
    fieldErrors,
    error,
    isLoading,
    updateField,
    handleSubmit,
    clearError,
  } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          className={`mt-1 block w-full rounded-md border ${
            fieldErrors.email ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 focus:border-game-purple focus:outline-none focus:ring-1 focus:ring-game-purple`}
          disabled={isLoading}
        />
        {fieldErrors.email && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          className={`mt-1 block w-full rounded-md border ${
            fieldErrors.password ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 focus:border-game-purple focus:outline-none focus:ring-1 focus:ring-game-purple`}
          disabled={isLoading}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          id="rememberMe"
          type="checkbox"
          checked={formData.rememberMe}
          onChange={(e) => updateField('rememberMe', e.target.checked)}
          className="h-4 w-4 text-game-purple focus:ring-game-purple border-gray-300 rounded"
          disabled={isLoading}
        />
        <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
          Remember me
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-800 hover:text-red-600 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-game-purple hover:bg-game-purple/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-game-purple disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
};

// ============================================================================
// Example 6: Navigation with Auth State
// ============================================================================

const AuthAwareNavigationExample: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { isAdmin } = useUserPermissions();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <a href="/" className="flex-shrink-0">
              PlayShelf
            </a>
            <a href="/games" className="text-gray-500 hover:text-gray-700">
              Games
            </a>
            {isAuthenticated && (
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700">
                Dashboard
              </a>
            )}
            {isAdmin && (
              <a href="/admin" className="text-gray-500 hover:text-gray-700">
                Admin
              </a>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">
                  Welcome, {user?.firstName || 'User'}!
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/auth/login" className="text-gray-500 hover:text-gray-700">
                  Login
                </a>
                <a href="/auth/signup" className="text-gray-500 hover:text-gray-700">
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================================================
// Example 7: Loading States
// ============================================================================

const LoadingStateExample: React.FC = () => {
  const { isLoading, isInitialized } = useAuthStatus();
  const isAuthLoading = useAuthLoading();

  return (
    <div className="space-y-4">
      <div>Auth Context Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Auth Initialized: {isInitialized ? 'Yes' : 'No'}</div>
      <div>Auth Operation Loading: {isAuthLoading ? 'Yes' : 'No'}</div>
      
      {isLoading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-game-purple"></div>
          <span>Loading authentication state...</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 8: Error Handling
// ============================================================================

const ErrorHandlingExample: React.FC = () => {
  const { error, clearError } = useAuthError();

  if (!error) {
    return <div>No authentication errors</div>;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
        <button
          onClick={clearError}
          className="text-red-800 hover:text-red-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Example 9: Permission-Based Rendering
// ============================================================================

const PermissionBasedRenderingExample: React.FC = () => {
  const { isAdmin, isUser, isGuest } = useUserPermissions();

  return (
    <div className="space-y-2">
      {isGuest && (
        <div className="p-4 bg-gray-100 rounded">
          Guest content - please sign up or log in for more features
        </div>
      )}
      
      {isUser && (
        <div className="p-4 bg-blue-100 rounded">
          Member content - you have access to your dashboard and lists
        </div>
      )}
      
      {isAdmin && (
        <div className="p-4 bg-purple-100 rounded">
          Admin content - you have full system access
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 10: Guest-Only Pages (Login/Signup)
// ============================================================================

const GuestOnlyPageExample: React.FC = () => {
  const { showContent } = useGuestOnly();

  if (!showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <LoginFormExample />
      </div>
    </div>
  );
};

// ============================================================================
// Export All Examples
// ============================================================================

export {
  SimpleAuthExample,
  UserProfileExample,
  ProtectedRouteExample,
  AdminOnlyExample,
  LoginFormExample,
  AuthAwareNavigationExample,
  LoadingStateExample,
  ErrorHandlingExample,
  PermissionBasedRenderingExample,
  GuestOnlyPageExample,
};

// Main component showcasing all examples
const AuthIntegrationExamples: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold text-gray-900">AuthContext Integration Examples</h1>
      
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Status</h2>
        <SimpleAuthExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Profile</h2>
        <UserProfileExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Loading States</h2>
        <LoadingStateExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Error Handling</h2>
        <ErrorHandlingExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Permission-Based Rendering</h2>
        <PermissionBasedRenderingExample />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Navigation Example</h2>
        <AuthAwareNavigationExample />
      </section>
    </div>
  );
};

export default AuthIntegrationExamples;