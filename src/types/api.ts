// API Response and Request Types for PlayShelf Authentication System

// ============================================================================
// Base API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: Record<string, string[]>; // For validation errors
  statusCode?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName?: string; // Computed field: firstName + lastName or username
  isAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  profilePicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string; // ISO date string
  lastLoginAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface PublicUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
}

// ============================================================================
// Authentication Request Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// ============================================================================
// Authentication Response Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface LoginResponse extends ApiResponse<{
  user: User;
  tokens: AuthTokens;
}> {}

export interface RegisterResponse extends ApiResponse<{
  user: User;
  message: string;
}> {}

export interface RefreshTokenResponse extends ApiResponse<{
  tokens: AuthTokens;
}> {}

export interface ForgotPasswordResponse extends ApiResponse<{
  message: string;
}> {}

export interface ResetPasswordResponse extends ApiResponse<{
  message: string;
}> {}

export interface VerifyEmailResponse extends ApiResponse<{
  message: string;
}> {}

export interface ResendVerificationResponse extends ApiResponse<{
  message: string;
}> {}

export interface LogoutResponse extends ApiResponse<{
  message: string;
}> {}

export interface ChangePasswordResponse extends ApiResponse<{
  message: string;
}> {}

export interface UpdateProfileResponse extends ApiResponse<{
  user: User;
}> {}

export interface GetProfileResponse extends ApiResponse<User> {}

export interface DeleteAccountResponse extends ApiResponse<{
  message: string;
}> {}

// ============================================================================
// Session and Token Types
// ============================================================================

export interface TokenPayload {
  userId: number;
  email: string;
  isAdmin: boolean;
  iat: number; // issued at
  exp: number; // expires at
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: number;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface GetSessionsResponse extends ApiResponse<Session[]> {}

export interface RevokeSessionRequest {
  sessionId: string;
}

export interface RevokeSessionResponse extends ApiResponse<{
  message: string;
}> {}

export interface RevokeAllSessionsResponse extends ApiResponse<{
  message: string;
  revokedCount: number;
}> {}

// ============================================================================
// Validation Error Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ApiError {
  errors: Record<string, string[]>;
}

// ============================================================================
// Common Error Response Types
// ============================================================================

export interface AuthErrorResponse extends ApiError {
  code: 
    | 'INVALID_CREDENTIALS'
    | 'USER_NOT_FOUND'
    | 'EMAIL_ALREADY_EXISTS'
    | 'USERNAME_ALREADY_EXISTS'
    | 'INVALID_TOKEN'
    | 'TOKEN_EXPIRED'
    | 'EMAIL_NOT_VERIFIED'
    | 'ACCOUNT_DISABLED'
    | 'INVALID_PASSWORD'
    | 'PASSWORD_REQUIREMENTS_NOT_MET'
    | 'VERIFICATION_TOKEN_INVALID'
    | 'RESET_TOKEN_INVALID'
    | 'RESET_TOKEN_EXPIRED'
    | 'SESSION_EXPIRED'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN';
}

// ============================================================================
// HTTP Status Code Types
// ============================================================================

export type HttpStatusCode = 
  | 200 // OK
  | 201 // Created
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error;

// ============================================================================
// API Client Configuration Types
// ============================================================================

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string; // ISO date string
}

export interface RateLimitExceededResponse extends ApiError {
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number; // seconds
  rateLimitInfo: RateLimitInfo;
}

// ============================================================================
// Email Verification Types
// ============================================================================

export interface EmailVerificationStatus {
  isVerified: boolean;
  verificationSentAt?: string;
  canResendAt?: string;
}

export interface CheckEmailVerificationResponse extends ApiResponse<EmailVerificationStatus> {}

// ============================================================================
// Password Strength Types
// ============================================================================

export interface PasswordStrength {
  score: number; // 0-4
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  isValid: boolean;
}

export interface CheckPasswordStrengthRequest {
  password: string;
}

export interface CheckPasswordStrengthResponse extends ApiResponse<PasswordStrength> {}

// ============================================================================
// Admin User Management Types (for future use)
// ============================================================================

export interface AdminUserListResponse extends PaginatedResponse<User> {}

export interface AdminUserUpdateRequest {
  isActive?: boolean;
  isAdmin?: boolean;
  emailVerified?: boolean;
}

export interface AdminUserUpdateResponse extends ApiResponse<User> {}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(response: any): response is ApiError {
  return response && response.success === false && typeof response.message === 'string';
}

export function isAuthErrorResponse(error: any): error is AuthErrorResponse {
  return isApiError(error) && typeof (error as any).code === 'string';
}

export function isValidationErrorResponse(error: any): error is ValidationErrorResponse {
  return isApiError(error) && !!(error as any).errors && typeof (error as any).errors === 'object';
}

export function isRateLimitExceededResponse(error: any): error is RateLimitExceededResponse {
  return isApiError(error) && (error as any).code === 'RATE_LIMIT_EXCEEDED';
}

// ============================================================================
// Utility Types
// ============================================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthEndpoint = 
  | '/auth/login'
  | '/auth/register'
  | '/auth/logout'
  | '/auth/refresh'
  | '/auth/forgot-password'
  | '/auth/reset-password'
  | '/auth/verify-email'
  | '/auth/resend-verification'
  | '/auth/change-password'
  | '/auth/profile'
  | '/auth/profile/update'
  | '/auth/profile/delete'
  | '/auth/sessions'
  | '/auth/sessions/revoke'
  | '/auth/sessions/revoke-all';

// Export all types for convenient importing
export type {
  // Re-export commonly used types for convenience
  User as AuthUser,
  LoginRequest as AuthLoginRequest,
  LoginResponse as AuthLoginResponse,
  RegisterRequest as AuthRegisterRequest,
  RegisterResponse as AuthRegisterResponse,
  Session as AuthSession,
};

// Note: AuthTokens and TokenPayload are already defined above and available for import