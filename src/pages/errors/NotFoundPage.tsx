import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, Dice6, ArrowLeft } from 'lucide-react';

// ============================================================================
// 404 Not Found Page
// ============================================================================

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          {/* Animated Dice */}
          <div className='mb-6 flex justify-center'>
            <div className='relative'>
              <Dice6 className='h-24 w-24 text-primary-600 animate-pulse' />
              <div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center'>
                ?
              </div>
            </div>
          </div>

          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-6xl font-bold text-gray-900 mb-2'>404</h1>
            <h2 className='text-2xl font-semibold text-gray-700 mb-4'>
              Page Not Found
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              Looks like this game isn't in our collection! The page you're looking for doesn't exist or may have been moved.
            </p>
          </div>

          {/* Suggested Actions */}
          <div className='space-y-3 mb-6'>
            <Link
              to='/'
              className='w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <Home className='h-5 w-5' />
              <span>Go to Home</span>
            </Link>

            <button
              onClick={handleGoBack}
              className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <ArrowLeft className='h-5 w-5' />
              <span>Go Back</span>
            </button>

            <Link
              to='/games'
              className='w-full bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 flex items-center justify-center space-x-2'
            >
              <Search className='h-5 w-5' />
              <span>Browse Games</span>
            </Link>
          </div>

          {/* Popular Links */}
          <div className='border-t border-gray-200 pt-6'>
            <p className='text-sm text-gray-500 mb-3'>Popular pages:</p>
            <div className='flex flex-wrap gap-2 justify-center'>
              <Link
                to='/games'
                className='text-sm text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-full transition-colors'
              >
                Games
              </Link>
              <Link
                to='/dashboard'
                className='text-sm text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-full transition-colors'
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className='mt-6 text-sm text-gray-500'>
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;