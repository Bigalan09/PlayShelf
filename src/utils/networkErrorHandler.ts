// ============================================================================
// Network Error Handler Utility
// ============================================================================

export interface NetworkError extends Error {
  code: string;
  status?: number;
  isNetworkError: boolean;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  retryCondition?: (error: NetworkError) => boolean;
  onRetry?: (attempt: number, error: NetworkError) => void;
}

export interface NetworkErrorDetails {
  type: 'offline' | 'timeout' | 'server-error' | 'client-error' | 'unknown';
  message: string;
  userMessage: string;
  canRetry: boolean;
  isTemporary: boolean;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Check if an error is a network error
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  if (!error || typeof error !== 'object') return false;
  
  return (
    'isNetworkError' in error ||
    error instanceof TypeError && error.message.includes('fetch') ||
    error instanceof Error && (
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('ERR_NETWORK') ||
      error.message.includes('ERR_INTERNET_DISCONNECTED')
    )
  );
};

/**
 * Create a network error from a standard error
 */
export const createNetworkError = (
  error: unknown,
  status?: number,
  code?: string
): NetworkError => {
  const message = error instanceof Error ? error.message : String(error);
  
  const networkError = new Error(message) as NetworkError;
  networkError.name = 'NetworkError';
  networkError.isNetworkError = true;
  networkError.status = status;
  networkError.code = code || 'UNKNOWN_NETWORK_ERROR';
  
  return networkError;
};

/**
 * Get detailed error information for user display
 */
export const getNetworkErrorDetails = (error: unknown): NetworkErrorDetails => {
  // Check if user is offline
  if (!navigator.onLine) {
    return {
      type: 'offline',
      message: 'No internet connection',
      userMessage: 'You appear to be offline. Please check your internet connection and try again.',
      canRetry: true,
      isTemporary: true,
    };
  }

  // Handle network errors
  if (isNetworkError(error)) {
    const networkError = error as NetworkError;
    
    // Timeout errors
    if (networkError.message.includes('timeout') || networkError.code === 'TIMEOUT') {
      return {
        type: 'timeout',
        message: 'Request timeout',
        userMessage: 'The request took too long to complete. Please try again.',
        canRetry: true,
        isTemporary: true,
      };
    }

    // Server errors (5xx)
    if (networkError.status && networkError.status >= 500) {
      return {
        type: 'server-error',
        message: `Server error (${networkError.status})`,
        userMessage: 'Our servers are temporarily unavailable. Please try again in a few moments.',
        canRetry: true,
        isTemporary: true,
      };
    }

    // Client errors (4xx)
    if (networkError.status && networkError.status >= 400 && networkError.status < 500) {
      // Don't retry auth errors or not found
      const canRetry = ![401, 403, 404].includes(networkError.status);
      
      return {
        type: 'client-error',
        message: `Client error (${networkError.status})`,
        userMessage: networkError.status === 401 
          ? 'You need to log in to access this resource.'
          : networkError.status === 403
          ? 'You don\'t have permission to access this resource.'
          : networkError.status === 404
          ? 'The requested resource was not found.'
          : 'There was an error with your request. Please try again.',
        canRetry,
        isTemporary: false,
      };
    }

    // Generic network error
    return {
      type: 'unknown',
      message: networkError.message,
      userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
      canRetry: true,
      isTemporary: true,
    };
  }

  // Non-network error
  const message = error instanceof Error ? error.message : String(error);
  return {
    type: 'unknown',
    message,
    userMessage: 'An unexpected error occurred. Please try again.',
    canRetry: false,
    isTemporary: false,
  };
};

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay for retry attempt
 */
const calculateDelay = (attempt: number, baseDelay: number, backoff: 'linear' | 'exponential'): number => {
  switch (backoff) {
    case 'exponential':
      return baseDelay * Math.pow(2, attempt - 1);
    case 'linear':
    default:
      return baseDelay * attempt;
  }
};

/**
 * Default retry condition - retry on network errors and server errors
 */
const defaultRetryCondition = (error: NetworkError): boolean => {
  // Don't retry client errors (4xx) except for specific cases
  if (error.status && error.status >= 400 && error.status < 500) {
    // Retry on rate limiting and certain client errors
    return [408, 409, 429].includes(error.status);
  }
  
  // Retry on network errors and server errors
  return error.isNetworkError || (error.status && error.status >= 500) || false;
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    retryCondition = defaultRetryCondition,
    onRetry,
  } = options;

  let lastError: NetworkError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Convert to network error if needed
      const networkError = isNetworkError(error) 
        ? error as NetworkError
        : createNetworkError(error);
      
      lastError = networkError;

      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === maxAttempts || !retryCondition(networkError)) {
        break;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, networkError);
      }

      // Wait before retrying
      const retryDelay = calculateDelay(attempt, delay, backoff);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError!;
};

// ============================================================================
// Fetch Wrapper with Retry
// ============================================================================

export interface FetchWithRetryOptions extends Partial<RetryOptions> {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Fetch wrapper with automatic retry and timeout
 */
export const fetchWithRetry = async (
  url: string,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> => {
  const { timeout = 10000, signal, ...retryOptions } = options;

  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Combine signals if provided
      const combinedSignal = signal 
        ? AbortSignal.any?.([signal, controller.signal]) || controller.signal
        : controller.signal;

      const response = await fetch(url, {
        ...init,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Throw network error for non-ok responses
      if (!response.ok) {
        throw createNetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          `HTTP_${response.status}`
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw createNetworkError('Request timeout', 408, 'TIMEOUT');
      }

      // Re-throw network errors as-is
      if (isNetworkError(error)) {
        throw error;
      }

      // Convert other errors to network errors
      throw createNetworkError(error);
    }
  }, retryOptions);
};

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Check if the user is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Listen to connection status changes
 */
export const addConnectionListener = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// ============================================================================
// React Hook for Network Status
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline status
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    const cleanup = addConnectionListener(handleOnline, handleOffline);
    return cleanup;
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    justCameOnline: isOnline && wasOffline,
  };
};

// ============================================================================
// Export
// ============================================================================

export default {
  isNetworkError,
  createNetworkError,
  getNetworkErrorDetails,
  retryWithBackoff,
  fetchWithRetry,
  isOnline,
  addConnectionListener,
  useNetworkStatus,
};