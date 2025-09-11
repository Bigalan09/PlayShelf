import React from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, RotateCcw, Home, Dice6, Signal } from 'lucide-react';
import { useNetworkStatus } from '../../utils/networkErrorHandler';

// ============================================================================
// Network Error Page
// ============================================================================

interface NetworkErrorPageProps {
  onRetry?: () => void;
  error?: string;
}

const NetworkErrorPage: React.FC<NetworkErrorPageProps> = ({ 
  onRetry,
  error 
}) => {
  const { isOnline, wasOffline, justCameOnline } = useNetworkStatus();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  // Auto-retry when connection is restored
  React.useEffect(() => {
    if (justCameOnline && onRetry) {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        onRetry();
      }, 1000);
    }
  }, [justCameOnline, onRetry]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {/* Connection Status Icon */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              <Dice6 className='h-24 w-24 text-orange-600' />
              <div className='absolute -top-2 -right-2'>
                {isOnline ? (
                  <Signal className='h-8 w-8 text-green-500 bg-white rounded-full p-1' />
                ) : (
                  <WifiOff className='h-8 w-8 text-orange-500 bg-white rounded-full p-1' />
                )}
              </div>
            </div>
          </div>

          {/* Status-based Content */}
          {!isOnline ? (
            // Offline Content
            <div className='mb-8'>
              <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                You're Offline
              </h1>
              <p className='text-gray-600 leading-relaxed mb-4'>
                It looks like you've lost your internet connection. Please check your network settings and try again.
              </p>
              <div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
                <h3 className='text-sm font-semibold text-orange-800 mb-2'>
                  Connection Status: Offline
                </h3>
                <p className='text-sm text-orange-700'>
                  Waiting for connection to be restored...
                </p>
              </div>
            </div>
          ) : wasOffline && justCameOnline ? (
            // Just reconnected
            <div className='mb-8'>
              <h1 className='text-2xl font-bold text-green-700 mb-4'>
                Connection Restored!
              </h1>
              <p className='text-gray-600 leading-relaxed mb-4'>
                Your internet connection has been restored. Retrying your request...
              </p>
              <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                <div className='flex items-center space-x-2'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-green-600'></div>
                  <span className='text-sm text-green-700'>Reconnecting...</span>
                </div>
              </div>
            </div>
          ) : (
            // General network error
            <div className='mb-8'>
              <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                Connection Problem
              </h1>
              <p className='text-gray-600 leading-relaxed mb-4'>
                We're having trouble connecting to our servers. This could be due to a network issue or temporary server maintenance.
              </p>
              {error && (
                <div className='bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 text-left'>
                  <h3 className='text-sm font-semibold text-orange-800 mb-1'>
                    Error Details:
                  </h3>
                  <p className='text-sm text-orange-700'>{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className='space-y-3 mb-6'>
            <button
              onClick={handleRetry}
              disabled={!isOnline}
              className={`w-full font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center space-x-2 ${
                isOnline
                  ? 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <RotateCcw className={`h-5 w-5 ${justCameOnline ? 'animate-spin' : ''}`} />
              <span>{isOnline ? 'Try Again' : 'Waiting for Connection...'}</span>
            </button>

            <Link
              to='/'
              className='w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <Home className='h-5 w-5' />
              <span>Go to Home</span>
            </Link>
          </div>

          {/* Connection Tips */}
          <div className='bg-gray-50 rounded-lg p-4 mb-4'>
            <h3 className='text-sm font-medium text-gray-700 mb-2'>
              Troubleshooting Tips:
            </h3>
            <ul className='text-sm text-gray-600 space-y-1 text-left'>
              <li>• Check your WiFi or mobile data connection</li>
              <li>• Try moving closer to your router</li>
              <li>• Restart your router or modem</li>
              <li>• Check if other websites are working</li>
            </ul>
          </div>

          {/* Network Status Indicator */}
          <div className='border-t border-gray-200 pt-4'>
            <div className='flex items-center justify-center space-x-2'>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className='text-xs text-gray-500'>
                {isOnline ? 'Connected' : 'No Connection'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className='mt-6 text-sm text-gray-500'>
          {isOnline 
            ? 'Connection restored. You can try your request again.'
            : 'We\'ll automatically retry when your connection is restored.'
          }
        </p>
      </div>
    </div>
  );
};

export default NetworkErrorPage;