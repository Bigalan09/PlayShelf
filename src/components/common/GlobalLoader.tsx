import React from 'react';
import { Dice6 } from 'lucide-react';

// ============================================================================
// Global Loading Indicator
// ============================================================================

interface GlobalLoaderProps {
  isVisible: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  isVisible,
  message = 'Loading...',
  size = 'medium',
  overlay = true,
}) => {
  if (!isVisible) return null;

  // Size configurations
  const sizeConfig = {
    small: {
      dice: 'h-8 w-8',
      container: 'p-4',
      text: 'text-sm',
    },
    medium: {
      dice: 'h-12 w-12',
      container: 'p-6',
      text: 'text-base',
    },
    large: {
      dice: 'h-16 w-16',
      container: 'p-8',
      text: 'text-lg',
    },
  };

  const config = sizeConfig[size];

  const LoaderContent = () => (
    <div 
      className={`bg-white rounded-lg shadow-lg flex items-center space-x-4 ${config.container}`}
      role='status'
      aria-label={message}
    >
      {/* Animated Dice */}
      <div className='relative'>
        <Dice6 className={`${config.dice} text-primary-600 animate-pulse`} />
        <div className='absolute inset-0 animate-spin'>
          <div className={`${config.dice} border-2 border-transparent border-t-primary-300 rounded`}></div>
        </div>
      </div>
      
      {/* Loading Text */}
      <div className='flex flex-col'>
        <span className={`text-gray-700 font-medium ${config.text}`}>
          {message}
        </span>
        <div className='flex space-x-1 mt-1'>
          <div className='w-1 h-1 bg-primary-400 rounded-full animate-bounce'></div>
          <div className='w-1 h-1 bg-primary-400 rounded-full animate-bounce' style={{ animationDelay: '0.1s' }}></div>
          <div className='w-1 h-1 bg-primary-400 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );

  if (!overlay) {
    return <LoaderContent />;
  }

  return (
    <div 
      className='fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 backdrop-blur-sm'
      role='status'
      aria-live='polite'
      aria-label='Loading content'
    >
      <LoaderContent />
    </div>
  );
};

// ============================================================================
// Inline Loading Indicator
// ============================================================================

interface InlineLoaderProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = 'small',
  message,
  className = '',
}) => {
  const sizeConfig = {
    small: {
      dice: 'h-4 w-4',
      text: 'text-sm',
    },
    medium: {
      dice: 'h-6 w-6',
      text: 'text-base',
    },
    large: {
      dice: 'h-8 w-8',
      text: 'text-lg',
    },
  };

  const config = sizeConfig[size];

  return (
    <div 
      className={`flex items-center space-x-2 ${className}`}
      role='status'
      aria-label={message || 'Loading'}
    >
      <div className='relative'>
        <Dice6 className={`${config.dice} text-primary-600 animate-pulse`} />
        <div className='absolute inset-0 animate-spin'>
          <div className={`${config.dice} border border-transparent border-t-primary-300 rounded`}></div>
        </div>
      </div>
      
      {message && (
        <span className={`text-gray-600 ${config.text}`}>
          {message}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Button Loading State
// ============================================================================

interface ButtonLoaderProps {
  size?: 'small' | 'medium';
  className?: string;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  size = 'small',
  className = '',
}) => {
  const sizeClass = size === 'small' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={`animate-spin ${sizeClass} ${className}`} role='status' aria-label='Loading'>
      <div className={`${sizeClass} border-2 border-transparent border-t-current rounded-full`}></div>
    </div>
  );
};

// ============================================================================
// Page Loading Skeleton
// ============================================================================

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {/* Animated Dice Logo */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              <Dice6 className='h-16 w-16 text-primary-600 animate-pulse' />
              <div className='absolute inset-0 animate-spin'>
                <div className='h-16 w-16 border-4 border-transparent border-t-primary-300 rounded'></div>
              </div>
            </div>
          </div>

          {/* PlayShelf Branding */}
          <div className='mb-8'>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>PlayShelf</h1>
            <div className='space-y-2'>
              <div className='h-4 bg-gray-200 rounded animate-pulse mx-auto w-3/4'></div>
              <div className='h-3 bg-gray-200 rounded animate-pulse mx-auto w-1/2'></div>
            </div>
          </div>

          {/* Loading Progress */}
          <div className='mb-6'>
            <div className='w-full bg-gray-200 rounded-full h-2'>
              <div className='bg-primary-600 h-2 rounded-full animate-pulse' style={{width: '60%'}}></div>
            </div>
            <p className='text-sm text-gray-500 mt-2'>Setting up your game collection...</p>
          </div>

          {/* Loading Dots */}
          <div className='flex justify-center space-x-2'>
            <div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce'></div>
            <div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{ animationDelay: '0.1s' }}></div>
            <div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default GlobalLoader;