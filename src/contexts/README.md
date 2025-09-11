# PlayShelf Authentication Context System

## Overview

The PlayShelf AuthContext provides a comprehensive authentication system for the React application, including state management, token handling, cross-tab synchronisation, and integration with the backend authentication API.

## Features

- ✅ **Complete Authentication Flow** - Login, register, logout, and token refresh
- ✅ **React 19 Patterns** - Uses modern React patterns with proper TypeScript support
- ✅ **Automatic Token Refresh** - Background token refresh with error handling
- ✅ **Cross-Tab Synchronisation** - Authentication state syncs across browser tabs
- ✅ **Loading and Error States** - Comprehensive state management for UX
- ✅ **Route Protection** - Hooks for protecting routes and handling redirects
- ✅ **Form Integration** - Ready-to-use hooks for login and registration forms
- ✅ **Permission Management** - Role-based access control (admin, user, guest)

## Architecture

```
AuthContext System
├── AuthContext.tsx          # Core authentication context and provider
├── useAuthHooks.ts          # Extended hooks for forms, routes, and utilities
└── examples/                # Integration examples and patterns
    └── AuthIntegrationExample.tsx
```

## Core Components

### 1. AuthProvider

The main context provider that wraps your application:

```tsx
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Authentication State

The context manages the following state:

```typescript
interface AuthState {
  user: User | null;           // Current user data
  isAuthenticated: boolean;    // Authentication status
  isLoading: boolean;          // Loading state for auth operations
  error: string | null;        // Current error message
  isInitialized: boolean;      // Context initialization status
}
```

### 3. Authentication Actions

Available actions for authentication operations:

```typescript
interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
}
```

## Basic Usage

### Using the Core Hook

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error, 
    login, 
    logout 
  } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Convenience Hooks

```tsx
import { 
  useIsAuthenticated,
  useCurrentUser,
  useAuthLoading,
  useUserPermissions 
} from '../contexts/AuthContext';

function UserProfile() {
  const user = useCurrentUser();
  const { isAdmin } = useUserPermissions();
  const isLoading = useAuthLoading();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h2>{user.firstName} {user.lastName}</h2>
      {isAdmin && <span>Admin</span>}
    </div>
  );
}
```

## Advanced Usage

### Route Protection

```tsx
import { useRequireAuth } from '../hooks/useAuthHooks';

function ProtectedPage() {
  const { isReady } = useRequireAuth();

  if (!isReady) {
    return <div>Loading...</div>; // Will redirect to login if not authenticated
  }

  return <div>Protected content</div>;
}
```

### Admin-Only Routes

```tsx
import { useRequireAdmin } from '../hooks/useAuthHooks';

function AdminPage() {
  const { isReady } = useRequireAdmin();

  if (!isReady) {
    return <div>Checking permissions...</div>; // Will redirect if not admin
  }

  return <div>Admin content</div>;
}
```

### Login Form Integration

```tsx
import { useLoginForm } from '../hooks/useAuthHooks';

function LoginForm() {
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
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
        disabled={isLoading}
      />
      {fieldErrors.email && <span>{fieldErrors.email}</span>}
      
      <input
        type="password"
        value={formData.password}
        onChange={(e) => updateField('password', e.target.value)}
        disabled={isLoading}
      />
      {fieldErrors.password && <span>{fieldErrors.password}</span>}
      
      {error && <div>{error}</div>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

### Guest-Only Pages

```tsx
import { useGuestOnly } from '../hooks/useAuthHooks';

function LoginPage() {
  const { showContent } = useGuestOnly();

  if (!showContent) {
    return <div>Redirecting...</div>; // Will redirect authenticated users
  }

  return (
    <div>
      <LoginForm />
    </div>
  );
}
```

## Available Hooks

### Core Authentication Hooks

- `useAuth()` - Complete authentication context
- `useIsAuthenticated()` - Simple boolean authentication status
- `useCurrentUser()` - Current user object or null
- `useAuthLoading()` - Loading state for auth operations
- `useAuthError()` - Error state and clearError function
- `useUserPermissions()` - User role and permission checks
- `useAuthStatus()` - Comprehensive authentication status

### Navigation and Route Protection

- `useAuthRedirect()` - Navigation utilities for auth flows
- `useRequireAuth()` - Protect routes requiring authentication
- `useRequireAdmin()` - Protect admin-only routes
- `useGuestOnly()` - Redirect authenticated users (for login/signup)

### Form Integration

- `useLoginForm()` - Complete login form state and validation
- `useRegisterForm()` - Complete registration form state and validation

### User Management

- `useUserProfile()` - User profile information and utilities
- `useUserSecurity()` - Session management and security functions

## Integration with Services

The AuthContext integrates seamlessly with the existing PlayShelf services:

- **AuthService** - All authentication API calls
- **EnhancedTokenStorage** - Secure token storage with cross-tab sync
- **HTTP Client** - Automatic token injection for authenticated requests

## Cross-Tab Synchronisation

The system automatically synchronises authentication state across browser tabs:

- User logs in on Tab A → Tab B updates automatically
- User logs out on Tab B → Tab A clears authentication state
- Token refresh on any tab → All tabs get new tokens

## Error Handling

Comprehensive error handling with user-friendly messages:

- Network errors → "Unable to connect to server"
- Invalid credentials → "Invalid email or password"
- Token expiry → Automatic refresh or redirect to login
- Validation errors → Field-specific error messages

## Token Management

Automatic token lifecycle management:

- **Storage** - Secure localStorage with validation
- **Refresh** - Background refresh 5 minutes before expiry
- **Cleanup** - Automatic cleanup of expired tokens
- **Cross-tab** - Token state synchronisation

## Security Features

- **Token Validation** - JWT structure and expiry validation
- **Secure Storage** - Error handling for storage quota/availability
- **Cross-tab Events** - Secure event broadcasting
- **Automatic Cleanup** - Expired token removal
- **Error Recovery** - Graceful handling of token/network errors

## Performance Considerations

- **Lazy Loading** - Context only loads when needed
- **Memoization** - Optimised re-renders with useCallback/useMemo
- **Error Boundaries** - Graceful error recovery
- **Token Caching** - Minimal API calls with intelligent caching

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

- All hooks are fully typed
- Context state and actions have proper interfaces
- Form data and validation errors are typed
- User permissions and roles are type-safe

## Migration Guide

To integrate into existing components:

1. **Replace hardcoded auth** - Replace mock auth states with context hooks
2. **Add route protection** - Wrap protected routes with auth hooks
3. **Update navigation** - Use auth state for conditional rendering
4. **Integrate forms** - Replace form logic with auth form hooks

## Examples

See `src/examples/AuthIntegrationExample.tsx` for comprehensive integration examples covering:

- Basic authentication checks
- User profile displays
- Protected route patterns
- Admin-only components
- Login/registration forms
- Navigation integration
- Loading and error states
- Permission-based rendering

## Best Practices

1. **Use specific hooks** - Use `useIsAuthenticated()` instead of `useAuth().isAuthenticated`
2. **Handle loading states** - Always check `isInitialized` before rendering auth-dependent content
3. **Error handling** - Display errors to users and provide clear actions
4. **Route protection** - Use protection hooks instead of manual redirect logic
5. **Form validation** - Leverage built-in form hooks for consistent validation
6. **Performance** - Use convenience hooks to minimise re-renders

## Testing

The AuthContext is designed for easy testing:

- Mock the context provider for unit tests
- Use `AuthProvider` wrapper for integration tests
- Test authentication flows with mock API responses
- Verify cross-tab synchronisation with multiple browser instances

## Future Enhancements

Potential future additions:

- **Remember me** functionality with extended token expiry
- **Device management** for tracking active sessions
- **Two-factor authentication** integration
- **Social login** provider support
- **Session timeout** warnings and automatic logout
- **Audit logging** for security events