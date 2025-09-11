import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================================================
// Toast Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
  position: ToastPosition;
}

// ============================================================================
// Toast Component
// ============================================================================

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  action,
  onClose,
  position,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Show animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-close timer
  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, persistent]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  // Toast type configurations
  const toastConfig = {
    success: {
      icon: CheckCircle,
      className: 'bg-green-50 border-green-200 text-green-800',
      iconClassName: 'text-green-500',
    },
    error: {
      icon: XCircle,
      className: 'bg-red-50 border-red-200 text-red-800',
      iconClassName: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-amber-50 border-amber-200 text-amber-800',
      iconClassName: 'text-amber-500',
    },
    info: {
      icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-800',
      iconClassName: 'text-blue-500',
    },
  };

  const config = toastConfig[type];
  const Icon = config.icon;

  // Position-based animations
  const getAnimationClasses = () => {
    if (position.includes('right')) {
      return isLeaving
        ? 'transform translate-x-full opacity-0'
        : isVisible
        ? 'transform translate-x-0 opacity-100'
        : 'transform translate-x-full opacity-0';
    } else if (position.includes('left')) {
      return isLeaving
        ? 'transform -translate-x-full opacity-0'
        : isVisible
        ? 'transform translate-x-0 opacity-100'
        : 'transform -translate-x-full opacity-0';
    } else {
      // center positions
      return isLeaving
        ? 'transform -translate-y-2 opacity-0 scale-95'
        : isVisible
        ? 'transform translate-y-0 opacity-100 scale-100'
        : 'transform -translate-y-2 opacity-0 scale-95';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full border rounded-lg shadow-lg pointer-events-auto transition-all duration-300 ease-in-out
        ${config.className}
        ${getAnimationClasses()}
      `}
      role='alert'
      aria-live='polite'
    >
      <div className='p-4'>
        <div className='flex items-start'>
          {/* Icon */}
          <div className='flex-shrink-0'>
            <Icon className={`h-6 w-6 ${config.iconClassName}`} />
          </div>

          {/* Content */}
          <div className='ml-3 flex-1'>
            <h4 className='text-sm font-semibold'>{title}</h4>
            {message && (
              <p className='mt-1 text-sm opacity-90'>{message}</p>
            )}

            {/* Action button */}
            {action && (
              <div className='mt-3'>
                <button
                  type='button'
                  onClick={action.onClick}
                  className='text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded'
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className='ml-4 flex-shrink-0'>
            <button
              type='button'
              onClick={handleClose}
              className='inline-flex rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current'
              aria-label='Close notification'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Toast Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: ToastData[];
  position: ToastPosition;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position,
  onClose,
}) => {
  // Position styles
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 pointer-events-none ${getPositionClasses()}`}
      aria-live='polite'
      aria-label='Notifications'
    >
      <div className='flex flex-col space-y-3'>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            position={position}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default Toast;