import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ToastContainer } from '../components/common/Toast';
import type { ToastData, ToastType, ToastPosition } from '../components/common/Toast';

// ============================================================================
// Notification Context Types
// ============================================================================

export interface NotificationOptions {
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationContextType {
  // Toast management
  toasts: ToastData[];
  addToast: (type: ToastType, options: NotificationOptions) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  
  // Convenience methods
  success: (options: NotificationOptions) => string;
  error: (options: NotificationOptions) => string;
  warning: (options: NotificationOptions) => string;
  info: (options: NotificationOptions) => string;
  
  // Global loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Configuration
  position: ToastPosition;
  setPosition: (position: ToastPosition) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access notification context
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Convenience hook for toast notifications only
 */
export const useToast = () => {
  const { addToast, removeToast, clearAllToasts, success, error, warning, info } = useNotification();
  
  return {
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
};

/**
 * Convenience hook for loading state only
 */
export const useLoading = () => {
  const { isLoading, setLoading } = useNotification();
  
  return {
    isLoading,
    setLoading,
  };
};

// ============================================================================
// Provider Component
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
  defaultPosition?: ToastPosition;
  maxToasts?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  defaultPosition = 'top-right',
  maxToasts = 5,
}) => {
  // ========================================================================
  // State Management
  // ========================================================================
  
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);

  // ========================================================================
  // Toast Management
  // ========================================================================

  /**
   * Generate unique ID for toast
   */
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Add a new toast notification
   */
  const addToast = useCallback((type: ToastType, options: NotificationOptions): string => {
    const id = generateId();
    
    const newToast: ToastData = {
      id,
      type,
      ...options,
    };

    setToasts(prev => {
      // Limit number of toasts
      const updatedToasts = [newToast, ...prev];
      return updatedToasts.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // ========================================================================
  // Convenience Methods
  // ========================================================================

  /**
   * Add success toast
   */
  const success = useCallback((options: NotificationOptions): string => {
    return addToast('success', options);
  }, [addToast]);

  /**
   * Add error toast
   */
  const error = useCallback((options: NotificationOptions): string => {
    return addToast('error', {
      ...options,
      duration: options.duration ?? 8000, // Longer duration for errors
    });
  }, [addToast]);

  /**
   * Add warning toast
   */
  const warning = useCallback((options: NotificationOptions): string => {
    return addToast('warning', options);
  }, [addToast]);

  /**
   * Add info toast
   */
  const info = useCallback((options: NotificationOptions): string => {
    return addToast('info', options);
  }, [addToast]);

  // ========================================================================
  // Loading State Management
  // ========================================================================

  /**
   * Set global loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // ========================================================================
  // Context Value
  // ========================================================================

  const contextValue: NotificationContextType = {
    // Toast management
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    
    // Convenience methods
    success,
    error,
    warning,
    info,
    
    // Loading state
    isLoading,
    setLoading,
    
    // Configuration
    position,
    setPosition,
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        position={position}
        onClose={removeToast}
      />
      
      {/* Global Loading Overlay */}
      {isLoading && (
        <div 
          className='fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50'
          role='status'
          aria-label='Loading'
        >
          <div className='bg-white rounded-lg shadow-lg p-6 flex items-center space-x-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
            <span className='text-gray-700 font-medium'>Loading...</span>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Helper to create error toast with common error handling
 */
export const createErrorToast = (error: unknown, defaultMessage = 'An unexpected error occurred'): NotificationOptions => {
  let title = 'Error';
  let message = defaultMessage;

  if (error instanceof Error) {
    title = 'Error';
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as any).message);
  }

  return {
    title,
    message,
    persistent: false,
    duration: 8000,
  };
};

/**
 * Helper to create network error toast with retry option
 */
export const createNetworkErrorToast = (onRetry?: () => void): NotificationOptions => {
  return {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    persistent: true,
    action: onRetry ? {
      label: 'Retry',
      onClick: onRetry,
    } : undefined,
  };
};

/**
 * Helper to create success toast
 */
export const createSuccessToast = (title: string, message?: string): NotificationOptions => {
  return {
    title,
    message,
    duration: 4000,
  };
};

// ============================================================================
// Default Export
// ============================================================================

export default NotificationProvider;