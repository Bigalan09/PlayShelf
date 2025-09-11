// Context exports for PlayShelf application

// Authentication context
export {
  AuthProvider,
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useAuthLoading,
  useAuthError,
  useUserPermissions,
  useAuthStatus,
} from './AuthContext';

export type {
  AuthState,
  AuthActions,
  AuthContextType,
} from './AuthContext';

// Notification context
export {
  NotificationProvider,
  useNotification,
  useToast,
  useLoading,
  createErrorToast,
  createNetworkErrorToast,
  createSuccessToast,
} from './NotificationContext';

export type {
  NotificationContextType,
  NotificationOptions,
} from './NotificationContext';