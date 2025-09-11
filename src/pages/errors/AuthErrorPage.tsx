import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, LogIn, UserPlus, Dice6, AlertTriangle } from 'lucide-react';

// ============================================================================
// Authentication Error Page
// ============================================================================

interface ActionConfig {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
}

interface AuthErrorPageProps {
  type?: 'unauthorized' | 'forbidden' | 'session-expired' | 'token-invalid';
  message?: string;
  returnUrl?: string;
}

const AuthErrorPage: React.FC<AuthErrorPageProps> = ({ 
  type = 'unauthorized',
  message,
  returnUrl 
}) => {
  const navigate = useNavigate();

  // Error configuration based on type
  const errorConfig: Record<string, {
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    bgColor: string;
    primaryAction: ActionConfig;
    secondaryAction: ActionConfig;
  }> = {
    unauthorized: {
      title: 'Authentication Required',
      description: 'You need to log in to access this page.',
      icon: LogIn,
      iconColor: 'text-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      primaryAction: {
        label: 'Log In',
        path: '/auth/login',
        icon: LogIn,
      },
      secondaryAction: {
        label: 'Sign Up',
        path: '/auth/signup',
        icon: UserPlus,
      },
    },
    forbidden: {
      title: 'Access Forbidden',
      description: 'You don\'t have permission to access this page.',
      icon: Lock,
      iconColor: 'text-red-600',
      bgColor: 'from-red-50 to-red-100',
      primaryAction: {
        label: 'Go Home',
        path: '/',
        icon: Dice6,
      },
      secondaryAction: {
        label: 'Contact Support',
        path: '#',
        icon: AlertTriangle,
        onClick: () => {
          // Handle contact support
          console.log('Contact support clicked');
        },
      },
    },
    'session-expired': {
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again to continue.',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      bgColor: 'from-amber-50 to-amber-100',
      primaryAction: {
        label: 'Log In Again',
        path: '/auth/login',
        icon: LogIn,
      },
      secondaryAction: {
        label: 'Go Home',
        path: '/',
        icon: Dice6,
      },
    },
    'token-invalid': {
      title: 'Invalid Authentication',
      description: 'Your authentication token is invalid or has been corrupted. Please log in again.',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      primaryAction: {
        label: 'Log In',
        path: '/auth/login',
        icon: LogIn,
      },
      secondaryAction: {
        label: 'Clear Data & Retry',
        path: '#',
        icon: AlertTriangle,
        onClick: () => {
          // Clear auth data and redirect
          localStorage.clear();
          sessionStorage.clear();
          navigate('/auth/login');
        },
      },
    },
  };

  const config = errorConfig[type];
  const Icon = config.icon;

  const handlePrimaryAction = () => {
    if (config.primaryAction.onClick) {
      config.primaryAction.onClick();
    } else if (config.primaryAction.path === '/auth/login' && returnUrl) {
      navigate('/auth/login', { 
        state: { returnUrl } 
      });
    } else {
      navigate(config.primaryAction.path);
    }
  };

  const handleSecondaryAction = () => {
    if (config.secondaryAction.onClick) {
      config.secondaryAction.onClick();
    } else {
      navigate(config.secondaryAction.path);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgColor} flex items-center justify-center px-4`}>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {/* Icon with Dice */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              <Dice6 className={`h-24 w-24 ${config.iconColor}`} />
              <div className='absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg'>
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-2xl font-bold text-gray-900 mb-4'>
              {config.title}
            </h1>
            <p className='text-gray-600 leading-relaxed'>
              {message || config.description}
            </p>
          </div>

          {/* Additional Information */}
          {type === 'session-expired' && (
            <div className='mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg'>
              <p className='text-sm text-amber-700'>
                For your security, we automatically log you out after periods of inactivity.
              </p>
            </div>
          )}

          {type === 'forbidden' && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-sm text-red-700'>
                This area is restricted. If you believe you should have access, please contact an administrator.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className='space-y-3 mb-6'>
            <button
              onClick={handlePrimaryAction}
              className={`w-full font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center space-x-2 ${
                config.iconColor === 'text-blue-600'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                  : config.iconColor === 'text-red-600'
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : config.iconColor === 'text-amber-600'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
                  : 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500'
              }`}
            >
              <config.primaryAction.icon className='h-5 w-5' />
              <span>{config.primaryAction.label}</span>
            </button>

            <button
              onClick={handleSecondaryAction}
              className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <config.secondaryAction.icon className='h-5 w-5' />
              <span>{config.secondaryAction.label}</span>
            </button>
          </div>

          {/* Return URL Notice */}
          {returnUrl && type !== 'forbidden' && (
            <div className='bg-gray-50 rounded-lg p-3 mb-4'>
              <p className='text-xs text-gray-600'>
                After logging in, you'll be redirected back to where you were.
              </p>
            </div>
          )}

          {/* Help Information */}
          <div className='border-t border-gray-200 pt-6'>
            <p className='text-sm text-gray-500 mb-3'>Need help?</p>
            <div className='space-y-1'>
              <Link
                to='/'
                className='text-sm text-primary-600 hover:text-primary-700 block'
              >
                Return to Home
              </Link>
              {type !== 'forbidden' && (
                <Link
                  to='/auth/signup'
                  className='text-sm text-primary-600 hover:text-primary-700 block'
                >
                  Create a New Account
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className='mt-6 text-sm text-gray-500'>
          {type === 'session-expired' 
            ? 'Your data is safe and will be available after you log in.'
            : 'Having trouble? Contact our support team for assistance.'
          }
        </p>
      </div>
    </div>
  );
};

export default AuthErrorPage;