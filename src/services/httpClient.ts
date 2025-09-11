import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnhancedTokenStorage, TokenManager } from '../utils/tokenStorage';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Custom error types
class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;
  
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

// HTTP Client class
class HttpClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private crossTabCleanup?: () => void;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupCrossTabSync();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = TokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Network error
        if (!error.response) {
          throw new NetworkError('Unable to connect to server. Please check your internet connection.');
        }

        // Handle 401 errors with token refresh
        if (error.response.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = TokenManager.getRefreshToken();
            if (!refreshToken) {
              throw new AuthenticationError();
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            TokenManager.setTokens(accessToken, newRefreshToken);

            // Process queued requests
            this.failedQueue.forEach(({ resolve }) => resolve(accessToken));
            this.failedQueue = [];

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            TokenManager.clearTokens();
            
            // Trigger logout/redirect to login
            window.dispatchEvent(new CustomEvent('auth:logout'));
            throw new AuthenticationError();
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other HTTP errors
        const status = error.response.status;
        const data = error.response.data;
        const message = data?.message || data?.error || 'An error occurred';
        const code = data?.code;
        const details = data?.details;

        switch (status) {
          case 400:
            throw new ApiError(message, status, code || 'BAD_REQUEST', details);
          case 403:
            throw new ApiError(message, status, code || 'FORBIDDEN', details);
          case 404:
            throw new ApiError(message, status, code || 'NOT_FOUND', details);
          case 409:
            throw new ApiError(message, status, code || 'CONFLICT', details);
          case 422:
            throw new ApiError(message, status, code || 'VALIDATION_ERROR', details);
          case 429:
            // Enhanced rate limiting error with retry information
            const retryAfter = error.response.headers['retry-after'] || 
                              error.response.headers['x-retry-after'] ||
                              details?.retryAfter;
            const rateLimitDetails = {
              ...details,
              retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
              rateLimitType: details?.type || 'request',
              limit: details?.limit,
              remaining: details?.remaining,
              resetTime: details?.resetTime,
            };
            throw new ApiError(
              message || 'Too many requests. Please wait before trying again.', 
              status, 
              code || 'RATE_LIMITED', 
              rateLimitDetails
            );
          case 500:
            throw new ApiError('Internal server error', status, 'INTERNAL_ERROR');
          default:
            throw new ApiError(message, status, code || 'UNKNOWN_ERROR', details);
        }
      }
    );
  }

  private setupCrossTabSync(): void {
    // Set up cross-tab token synchronisation
    this.crossTabCleanup = EnhancedTokenStorage.setupCrossTabSync();

    // Listen for token changes across tabs
    EnhancedTokenStorage.addChangeListener((event) => {
      if (event === 'removed') {
        // Tokens were removed in another tab - trigger logout
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    });
  }

  // Cleanup method for when the client is destroyed
  destroy(): void {
    if (this.crossTabCleanup) {
      this.crossTabCleanup();
    }
  }

  // Generic request methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response: AxiosResponse<T> = await this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  }

  // Authentication methods
  setAuthToken(token: string): void {
    try {
      EnhancedTokenStorage.setAccessToken(token);
    } catch (error) {
      console.warn('Failed to set access token with enhanced storage, using fallback:', error);
      TokenManager.setAccessToken(token);
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    try {
      EnhancedTokenStorage.setTokens(accessToken, refreshToken);
    } catch (error) {
      console.warn('Failed to set tokens with enhanced storage, using fallback:', error);
      TokenManager.setTokens(accessToken, refreshToken);
    }
  }

  clearAuth(): void {
    EnhancedTokenStorage.clearTokens();
  }

  isAuthenticated(): boolean {
    return EnhancedTokenStorage.hasValidTokens();
  }

  // Enhanced authentication methods
  isAccessTokenExpired(): boolean {
    return EnhancedTokenStorage.isAccessTokenExpired();
  }

  getUserInfo(): { userId: string; email: string } | null {
    return EnhancedTokenStorage.getUserInfo();
  }

  getTokenExpiry(tokenType: 'access' | 'refresh'): Date | null {
    return EnhancedTokenStorage.getTokenExpiry(tokenType);
  }

  getTimeToExpiry(tokenType: 'access' | 'refresh'): number | null {
    return EnhancedTokenStorage.getTimeToExpiry(tokenType);
  }

  // Request cancellation
  createCancelToken() {
    return axios.CancelToken.source();
  }

  isCancel(error: any): boolean {
    return axios.isCancel(error);
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Export token managers for direct access if needed
export { TokenManager, EnhancedTokenStorage };

// Export error types
export { ApiError, AuthenticationError, NetworkError };

// Export token storage errors
export { TokenStorageError, TokenValidationError } from '../utils/tokenStorage';

// Default export
export default httpClient;