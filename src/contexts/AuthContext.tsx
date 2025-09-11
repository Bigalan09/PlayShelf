import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/authService';
import { EnhancedTokenStorage } from '../utils/tokenStorage';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

// ============================================================================
// Context Types
// ============================================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
}

export interface AuthContextType extends AuthState, AuthActions {}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to access authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user is authenticated (convenience hook)
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated, isInitialized } = useAuth();
  return isAuthenticated && isInitialized;
};

/**
 * Hook to get current user (convenience hook)
 */
export const useCurrentUser = (): User | null => {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated ? user : null;
};

// ============================================================================
// AuthProvider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ========================================================================
  // State Management
  // ========================================================================
  
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isInitialized: false,
  });

  // Refs for managing async operations
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const cleanupTokenListenerRef = useRef<(() => void) | null>(null);

  // ========================================================================
  // Helper Functions
  // ========================================================================

  /**
   * Update state with partial updates
   */
  const updateState = useCallback((updates: Partial<AuthState>) => {
    console.log('🔐 AuthContext updateState called with:', updates);
    setState(prev => {
      const newState = { ...prev, ...updates };
      console.log('🔐 AuthContext state updated:', {
        old: { isAuthenticated: prev.isAuthenticated, isInitialized: prev.isInitialized },
        new: { isAuthenticated: newState.isAuthenticated, isInitialized: newState.isInitialized }
      });
      return newState;
    });
  }, []);

  /**
   * Set error state with optional clearing timeout
   */
  const setError = useCallback((error: string | null, autoClear = true) => {
    updateState({ error });
    
    if (error && autoClear) {
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        updateState({ error: null });
      }, 5000);
    }
  }, [updateState]);

  /**
   * Clear all authentication state
   */
  const clearAuthState = useCallback(() => {
    updateState({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  }, [updateState]);

  /**
   * Set authenticated state with user data
   */
  const setAuthenticatedState = useCallback((user: User) => {
    console.log('🔐 Setting authenticated state for user:', user.email);
    updateState({
      user,
      isAuthenticated: true,
      error: null,
    });
    console.log('🔐 Authenticated state set successfully');
    
    // Force immediate state check after small delay to verify state sync
    setTimeout(() => {
      console.log('🔐 Post-login state verification:', {
        isAuthenticated: true, // We just set this
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });
    }, 10);
  }, [updateState]);

  /**
   * Handle authentication errors
   */
  const handleAuthError = useCallback((error: unknown): string => {
    console.error('Auth error:', error);
    
    if (AuthService.isAuthServiceError(error)) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }, []);

  // ========================================================================
  // Token Management
  // ========================================================================

  /**
   * Schedule automatic token refresh
   */
  const scheduleTokenRefresh = useCallback(() => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Get time until access token expiry
    const timeToExpiry = EnhancedTokenStorage.getTimeToExpiry('access');
    
    if (!timeToExpiry || timeToExpiry <= 0) {
      return;
    }

    // Schedule refresh 5 minutes before expiry
    const refreshTime = Math.max(timeToExpiry - 5 * 60 * 1000, 60 * 1000);
    
    refreshTimeoutRef.current = window.setTimeout(async () => {
      if (state.isAuthenticated && !isRefreshingRef.current) {
        await refreshToken();
      }
    }, refreshTime);
  }, [state.isAuthenticated]);

  /**
   * Handle token storage changes (cross-tab sync)
   */
  const handleTokenChange = useCallback(async (
    event: 'updated' | 'removed',
    _tokens?: { access?: string; refresh?: string }
  ) => {
    if (event === 'removed') {
      // Tokens were cleared in another tab
      clearAuthState();
      return;
    }

    if (event === 'updated' && _tokens?.access) {
      // New tokens available - get user info
      try {
        const user = await AuthService.getCurrentUser();
        setAuthenticatedState(user);
        scheduleTokenRefresh();
      } catch (error) {
        // If we can't get user info, clear auth state
        clearAuthState();
      }
    }
  }, [clearAuthState, setAuthenticatedState, scheduleTokenRefresh]);

  // ========================================================================
  // Authentication Actions
  // ========================================================================

  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    console.log('🔐 AuthContext.login called for:', credentials.email);
    updateState({ isLoading: true, error: null });

    try {
      console.log('🔐 Calling AuthService.login from AuthContext');
      const { user } = await AuthService.login(credentials);
      console.log('🔐 AuthService.login succeeded, setting authenticated state for:', user.email);
      
      setAuthenticatedState(user);
      scheduleTokenRefresh();
      
      console.log('🔐 AuthContext state updated successfully');
    } catch (error) {
      console.log('🔐 AuthContext.login failed:', error);
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
      throw error; // Re-throw for component handling
    } finally {
      updateState({ isLoading: false });
      console.log('🔐 AuthContext.login completed');
    }
  }, [updateState, setAuthenticatedState, scheduleTokenRefresh, handleAuthError, setError]);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    updateState({ isLoading: true, error: null });

    try {
      const { user, tokens } = await AuthService.register(data);
      
      // If tokens are available (auto-login after registration)
      if (tokens && tokens.accessToken) {
        setAuthenticatedState(user);
        scheduleTokenRefresh();
      } else {
        // Email verification required
        updateState({ user, isAuthenticated: false });
      }
    } catch (error) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
      throw error; // Re-throw for component handling
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState, setAuthenticatedState, scheduleTokenRefresh, handleAuthError, setError]);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true });

    try {
      await AuthService.logout();
    } catch (error) {
      // Don't throw logout errors - just log them
      console.warn('Logout error:', error);
    } finally {
      // Always clear local state regardless of API call result
      clearAuthState();
      
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      updateState({ isLoading: false });
    }
  }, [updateState, clearAuthState]);

  /**
   * Refresh authentication tokens
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    // Prevent multiple concurrent refresh attempts
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      await AuthService.refreshToken();
      
      // Get updated user info
      const user = await AuthService.getCurrentUser();
      setAuthenticatedState(user);
      scheduleTokenRefresh();
    } catch (error) {
      // Token refresh failed - user needs to re-authenticate
      clearAuthState();
      const errorMessage = handleAuthError(error);
      setError(errorMessage, false); // Don't auto-clear this error
    } finally {
      isRefreshingRef.current = false;
    }
  }, [setAuthenticatedState, scheduleTokenRefresh, clearAuthState, handleAuthError, setError]);

  /**
   * Get current user from API
   */
  const getCurrentUser = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true, error: null });

    try {
      const user = await AuthService.getCurrentUser();
      setAuthenticatedState(user);
    } catch (error) {
      clearAuthState();
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState, setAuthenticatedState, clearAuthState, handleAuthError, setError]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Update user data (for profile updates)
   */
  const updateUser = useCallback((user: User): void => {
    if (state.isAuthenticated) {
      updateState({ user });
    }
  }, [state.isAuthenticated, updateState]);

  // ========================================================================
  // Initialization and Effects
  // ========================================================================

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      updateState({ isLoading: true });

      try {
        // Check if we have valid tokens
        if (EnhancedTokenStorage.hasValidTokens()) {
          // Try to get current user
          const user = await AuthService.getCurrentUser();
          setAuthenticatedState(user);
          scheduleTokenRefresh();
        }
      } catch (error) {
        // Invalid tokens or network error - clear auth state
        clearAuthState();
        console.warn('Auth initialization failed:', error);
      } finally {
        updateState({ isLoading: false, isInitialized: true });
      }
    };

    initializeAuth();
  }, [setAuthenticatedState, scheduleTokenRefresh, clearAuthState, updateState]);

  /**
   * Set up cross-tab synchronization
   */
  useEffect(() => {
    // Set up token storage listener
    const cleanup1 = EnhancedTokenStorage.addChangeListener(handleTokenChange);
    
    // Set up cross-tab sync
    const cleanup2 = EnhancedTokenStorage.setupCrossTabSync();
    
    // Store cleanup functions
    cleanupTokenListenerRef.current = () => {
      cleanup1();
      cleanup2();
    };

    return () => {
      if (cleanupTokenListenerRef.current) {
        cleanupTokenListenerRef.current();
      }
    };
  }, [handleTokenChange]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      
      // Clear token listeners
      if (cleanupTokenListenerRef.current) {
        cleanupTokenListenerRef.current();
      }
    };
  }, []);

  // ========================================================================
  // Context Value
  // ========================================================================

  const contextValue: AuthContextType = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser,
    clearError,
    updateUser,
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// Default Export
// ============================================================================

export default AuthProvider;

// ============================================================================
// Additional Utility Hooks
// ============================================================================

/**
 * Hook for authentication loading state
 */
export const useAuthLoading = (): boolean => {
  const { isLoading } = useAuth();
  return isLoading;
};

/**
 * Hook for authentication errors
 */
export const useAuthError = (): { error: string | null; clearError: () => void } => {
  const { error, clearError } = useAuth();
  return { error, clearError };
};

/**
 * Hook for user permissions
 */
export const useUserPermissions = () => {
  const { user, isAuthenticated } = useAuth();
  
  return {
    isAdmin: isAuthenticated && user?.isAdmin === true,
    isUser: isAuthenticated && user !== null,
    isGuest: !isAuthenticated,
  };
};

/**
 * Hook for authentication status with initialization check
 */
export const useAuthStatus = () => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    isInitialized,
    isLoading,
    isReady: isInitialized && !isLoading,
  };
};