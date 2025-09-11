import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Dice6 } from 'lucide-react';

// ============================================================================
// Error Boundary Types
// ============================================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for development
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4'>
          <div className='max-w-md w-full'>
            <div className='bg-white rounded-2xl shadow-xl p-8 text-center'>
              {/* Header with game-themed styling */}
              <div className='mb-6'>
                <div className='flex justify-center mb-4'>
                  <div className='relative'>
                    <Dice6 className='h-16 w-16 text-red-600' />
                    <div className='absolute -top-1 -right-1'>
                      <AlertTriangle className='h-6 w-6 text-red-500 bg-white rounded-full p-1' />
                    </div>
                  </div>
                </div>
                <h1 className='text-2xl font-bold text-gray-900 mb-2'>
                  Oops! Something went wrong
                </h1>
                <p className='text-gray-600'>
                  We encountered an unexpected error whilst loading your game collection.
                </p>
              </div>

              {/* Error details (only in development) */}
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left'>
                  <h3 className='text-sm font-semibold text-red-800 mb-2'>
                    Error Details (Development):
                  </h3>
                  <p className='text-xs text-red-700 font-mono break-words'>
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className='mt-2'>
                      <summary className='text-xs text-red-700 cursor-pointer hover:text-red-800'>
                        Stack trace
                      </summary>
                      <pre className='text-xs text-red-600 mt-2 overflow-auto max-h-32'>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className='space-y-3'>
                <button
                  onClick={this.handleReset}
                  className='w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
                >
                  <RotateCcw className='h-5 w-5' />
                  <span>Try again</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
                >
                  <Home className='h-5 w-5' />
                  <span>Go home</span>
                </button>
              </div>

              {/* Help text */}
              <p className='mt-6 text-sm text-gray-500'>
                If this problem persists, please contact support or try refreshing your browser.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Functional Wrapper Hook
// ============================================================================

/**
 * Hook to reset error boundary from within child components
 */
export const useErrorReset = () => {
  const [, setError] = React.useState<Error | null>(null);
  
  return () => setError(null);
};

// ============================================================================
// Higher Order Component
// ============================================================================

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// ============================================================================
// Export
// ============================================================================

export default ErrorBoundary;