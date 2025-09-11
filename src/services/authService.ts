import { httpClient, TokenManager, ApiError, AuthenticationError, NetworkError } from './httpClient';
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  GetProfileResponse,
  LogoutResponse,
  AuthTokens,
} from '../types/api';
import {
  isApiError,
  isAuthErrorResponse,
  isValidationErrorResponse,
} from '../types/api';

// Custom service error types for better error handling
class AuthServiceError extends Error {
  public code: string;
  public statusCode?: number;
  public field?: string;
  
  constructor(
    message: string,
    code: string,
    statusCode?: number,
    field?: string
  ) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

class ServiceValidationError extends AuthServiceError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, field);
    this.name = 'ServiceValidationError';
  }
}

class NetworkServiceError extends AuthServiceError {
  constructor(message: string = 'Network error - please check your connection') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkServiceError';
  }
}

// User-friendly error messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USERNAME_ALREADY_EXISTS: 'This username is already taken. Please choose another.',
  USER_NOT_FOUND: 'No account found with this email address.',
  WEAK_PASSWORD: 'Password does not meet security requirements.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  INVALID_TOKEN: 'Invalid or expired token. Please request a new one.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
  RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again later.',
  DEFAULT: 'An unexpected error occurred. Please try again.',
} as const;

// Helper function to transform API errors into user-friendly messages
function transformApiError(error: any): AuthServiceError {
  // Handle network errors
  if (error instanceof NetworkError) {
    return new NetworkServiceError();
  }

  // Handle authentication errors
  if (error instanceof AuthenticationError) {
    const message = ERROR_MESSAGES.INVALID_CREDENTIALS;
    return new AuthServiceError(message, 'AUTHENTICATION_ERROR', 401);
  }

  // Handle API errors
  if (error instanceof ApiError) {
    const errorCode = error.code as keyof typeof ERROR_MESSAGES;
    const message = ERROR_MESSAGES[errorCode] || error.message || ERROR_MESSAGES.DEFAULT;
    
    // Handle validation errors
    if (error.status === 422 || error.code === 'VALIDATION_ERROR') {
      const field = error.details?.field;
      return new ServiceValidationError(message, field);
    }

    // Handle rate limiting errors with enhanced details
    if (error.status === 429 || error.code === 'RATE_LIMITED') {
      const retryAfter = error.details?.retryAfter;
      const rateLimitMessage = retryAfter 
        ? `${ERROR_MESSAGES.RATE_LIMITED} Please wait ${retryAfter} seconds before trying again.`
        : ERROR_MESSAGES.RATE_LIMITED;
      
      return new AuthServiceError(rateLimitMessage, error.code || 'RATE_LIMITED', error.status);
    }

    return new AuthServiceError(message, error.code || 'API_ERROR', error.status);
  }

  // Handle validation response errors
  if (isValidationErrorResponse(error)) {
    const firstError = Object.values(error.errors || {})[0]?.[0];
    const field = Object.keys(error.errors || {})[0];
    return new ServiceValidationError(firstError || error.message || ERROR_MESSAGES.DEFAULT, field);
  }

  // Handle auth response errors
  if (isAuthErrorResponse(error)) {
    const errorCode = error.code as keyof typeof ERROR_MESSAGES;
    const message = ERROR_MESSAGES[errorCode] || error.message || ERROR_MESSAGES.DEFAULT;
    return new AuthServiceError(message, error.code, error.statusCode);
  }

  // Handle generic API errors
  if (isApiError(error)) {
    return new AuthServiceError(error.message || ERROR_MESSAGES.DEFAULT, 'API_ERROR');
  }

  // Handle unknown errors
  return new AuthServiceError(
    error?.message || ERROR_MESSAGES.DEFAULT,
    'UNKNOWN_ERROR'
  );
}

// Authentication Service Class
export class AuthService {
  // ========================================================================
  // User Registration
  // ========================================================================
  static async register(data: RegisterRequest): Promise<{user: User; tokens: AuthTokens}> {
    try {
      const response = await httpClient.post<RegisterResponse>('/auth/register', data);
      
      if (!response.success || !response.data) {
        throw new AuthServiceError('Registration failed', 'REGISTRATION_ERROR');
      }

      // For registration, tokens may not be immediately available
      const tokens = (response.data as any).tokens;
      if (tokens) {
        TokenManager.setTokens(
          tokens.accessToken,
          tokens.refreshToken
        );
        
        return {
          user: response.data.user,
          tokens: tokens
        };
      }

      // If no tokens (email verification required), create dummy tokens
      const dummyTokens: AuthTokens = {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        tokenType: 'Bearer'
      };

      return {
        user: response.data.user,
        tokens: dummyTokens
      };
    } catch (error) {
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // User Login
  // ========================================================================
  static async login(credentials: LoginRequest): Promise<{user: User; tokens: AuthTokens}> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', credentials);
      
      if (!response.success || !response.data) {
        throw new AuthServiceError('Login failed', 'LOGIN_ERROR');
      }

      // Store tokens
      TokenManager.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );

      return {
        user: response.data.user,
        tokens: response.data.tokens
      };
    } catch (error) {
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // User Logout
  // ========================================================================
  static async logout(): Promise<void> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      // Call logout endpoint if we have a refresh token
      if (refreshToken) {
        await httpClient.post<LogoutResponse>('/auth/logout', { refreshToken });
      }

      // Always clear local tokens, even if the API call fails
      TokenManager.clearTokens();
    } catch (error) {
      // Always clear local tokens, even if logout API call fails
      TokenManager.clearTokens();
      
      // Don't throw errors for logout - just log them
      console.warn('Logout API call failed, but local tokens cleared:', error);
    }
  }

  // ========================================================================
  // Token Refresh
  // ========================================================================
  static async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      if (!refreshToken) {
        throw new AuthServiceError('No refresh token available', 'NO_REFRESH_TOKEN', 401);
      }

      const response = await httpClient.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken,
      });

      if (!response.success || !response.data?.tokens) {
        throw new AuthServiceError('Token refresh failed', 'REFRESH_ERROR');
      }

      // Store new tokens
      TokenManager.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );

      return response.data.tokens;
    } catch (error) {
      // Clear tokens on refresh failure
      TokenManager.clearTokens();
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // Get Current User
  // ========================================================================
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await httpClient.get<GetProfileResponse>('/auth/me');
      
      if (!response.success || !response.data) {
        throw new AuthServiceError('Failed to get user profile', 'PROFILE_ERROR');
      }

      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        if ('user' in response.data) {
          return (response.data as any).user as User;
        }
        // Type assertion since we know it's a User from the API
        return response.data as User;
      }
      
      throw new AuthServiceError('Invalid user data received', 'INVALID_DATA');
    } catch (error) {
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // Forgot Password
  // ========================================================================
  static async forgotPassword(data: ForgotPasswordRequest): Promise<{message: string}> {
    try {
      const response = await httpClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
      
      if (!response.success) {
        throw new AuthServiceError('Password reset request failed', 'FORGOT_PASSWORD_ERROR');
      }

      return {
        message: response.data?.message || response.message || 'Password reset instructions sent to your email.'
      };
    } catch (error) {
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // Reset Password
  // ========================================================================
  static async resetPassword(data: ResetPasswordRequest): Promise<{message: string}> {
    try {
      const response = await httpClient.post<ResetPasswordResponse>('/auth/reset-password', data);
      
      if (!response.success) {
        throw new AuthServiceError('Password reset failed', 'RESET_PASSWORD_ERROR');
      }

      return {
        message: response.data?.message || response.message || 'Password reset successfully.'
      };
    } catch (error) {
      throw transformApiError(error);
    }
  }

  // ========================================================================
  // Validate Reset Token
  // ========================================================================
  static async validateResetToken(token: string): Promise<{valid: boolean; email?: string}> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {valid: boolean; email?: string};
      }>(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
      
      if (!response.success || !response.data) {
        return {valid: false};
      }

      return response.data;
    } catch (error) {
      // Don't throw for token validation - just return invalid
      return {valid: false};
    }
  }

  // ========================================================================
  // Authentication Status Checks
  // ========================================================================
  static isAuthenticated(): boolean {
    return TokenManager.hasValidTokens();
  }

  static getAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  static getRefreshToken(): string | null {
    return TokenManager.getRefreshToken();
  }

  // ========================================================================
  // Session Management
  // ========================================================================
  static clearSession(): void {
    TokenManager.clearTokens();
  }

  static hasTokens(): boolean {
    return !!(TokenManager.getAccessToken() && TokenManager.getRefreshToken());
  }

  // ========================================================================
  // Error Helper Methods
  // ========================================================================
  static isAuthServiceError(error: any): error is AuthServiceError {
    return error instanceof AuthServiceError;
  }

  static isValidationError(error: any): error is ServiceValidationError {
    return error instanceof ServiceValidationError;
  }

  static isNetworkError(error: any): error is NetworkServiceError {
    return error instanceof NetworkServiceError;
  }

  // ========================================================================
  // Token Utilities
  // ========================================================================
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // Invalid token format
    }
  }

  static getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  static getUserFromToken(): {id: number; email: string; isAdmin: boolean} | null {
    const token = TokenManager.getAccessToken();
    if (!token) return null;

    try {
      const payload = this.getTokenPayload(token);
      return {
        id: payload.userId || payload.id,
        email: payload.email,
        isAdmin: payload.isAdmin || false,
      };
    } catch {
      return null;
    }
  }
}

// Export service instance and utilities
export const authService = AuthService;

// Export error types for consumer use
export { AuthServiceError, ServiceValidationError as ValidationError, NetworkServiceError };

// Export helper functions
export const authUtils = {
  isAuthenticated: AuthService.isAuthenticated,
  clearSession: AuthService.clearSession,
  hasTokens: AuthService.hasTokens,
  getUserFromToken: AuthService.getUserFromToken,
  isTokenExpired: AuthService.isTokenExpired,
} as const;

// Default export
export default AuthService;