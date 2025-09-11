import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, Dice6 } from 'lucide-react';

// ============================================================================
// 500 Server Error Page
// ============================================================================

interface ServerErrorPageProps {
  error?: Error;
  onRetry?: () => void;
}

const ServerErrorPage: React.FC<ServerErrorPageProps> = ({ 
  error, 
  onRetry 
}) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {/* Error Icon with Dice */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              <Dice6 className='h-24 w-24 text-red-600' />
              <div className='absolute -top-2 -right-2'>
                <AlertTriangle className='h-8 w-8 text-red-500 bg-white rounded-full p-1' />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-6xl font-bold text-gray-900 mb-2'>500</h1>
            <h2 className='text-2xl font-semibold text-gray-700 mb-4'>
              Server Error
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              Our servers are having trouble processing your request. This is a temporary issue and we're working to fix it.
            </p>
          </div>

          {/* Error Details (Development Only) */}
          {import.meta.env.MODE === 'development' && error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left'>
              <h3 className='text-sm font-semibold text-red-800 mb-2'>
                Error Details (Development):
              </h3>
              <p className='text-xs text-red-700 font-mono break-words'>
                {error.message}
              </p>
              {error.stack && (
                <details className='mt-2'>
                  <summary className='text-xs text-red-700 cursor-pointer hover:text-red-800'>
                    Stack trace
                  </summary>
                  <pre className='text-xs text-red-600 mt-2 overflow-auto max-h-32'>
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className='space-y-3 mb-6'>
            <button
              onClick={handleRefresh}
              className='w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <RotateCcw className='h-5 w-5' />
              <span>Try Again</span>
            </button>

            <Link
              to='/'
              className='w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <Home className='h-5 w-5' />
              <span>Go to Home</span>
            </Link>

            <button
              onClick={handleGoBack}
              className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
            >
              Go Back
            </button>
          </div>

          {/* Status Information */}
          <div className='bg-gray-50 rounded-lg p-4 mb-4'>
            <h3 className='text-sm font-medium text-gray-700 mb-2'>
              What's happening?
            </h3>
            <ul className='text-sm text-gray-600 space-y-1'>
              <li>• Our servers are temporarily unavailable</li>
              <li>• This issue is usually resolved quickly</li>
              <li>• Your data is safe and secure</li>
            </ul>
          </div>

          {/* Help Section */}
          <div className='border-t border-gray-200 pt-6'>
            <p className='text-sm text-gray-500 mb-3'>
              If the problem persists:
            </p>
            <div className='space-y-2'>
              <p className='text-xs text-gray-400'>
                • Wait a few minutes and try again
              </p>
              <p className='text-xs text-gray-400'>
                • Check our status page for updates
              </p>
              <p className='text-xs text-gray-400'>
                • Contact support if the issue continues
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className='mt-6 text-sm text-gray-500'>
          We apologise for the inconvenience and appreciate your patience.
        </p>
      </div>
    </div>
  );
};

export default ServerErrorPage;