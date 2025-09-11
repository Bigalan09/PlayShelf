import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Dice6, Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { AuthService } from '../../services/authService'
import { useNotification } from '../../contexts/NotificationContext'
import { isNetworkError, getNetworkErrorDetails, retryWithBackoff } from '../../utils/networkErrorHandler'
import { ButtonLoader } from '../../components/common/GlobalLoader'
import { useGuestOnly, useAuthRedirect } from '../../hooks/useAuthHooks'
import { useAuth, useAuthStatus } from '../../contexts/AuthContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error: showError } = useNotification()
  const { redirectAfterLogin } = useAuthRedirect()
  const { login: authLogin } = useAuth()
  const { isAuthenticated, isInitialized } = useAuthStatus()
  
  // Automatically redirect authenticated users
  const guestOnlyResult = useGuestOnly()
  
  // Debug logging for authentication state changes
  React.useEffect(() => {
    console.log('🔐 LoginPage auth state changed:', {
      isAuthenticated,
      isInitialized,
      pathname: location.pathname,
      showContent: guestOnlyResult?.showContent
    })
  }, [isAuthenticated, isInitialized, location.pathname, guestOnlyResult])
  
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [retryAttempt, setRetryAttempt] = useState(0)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    setGeneralError('')
    
    // Basic client-side validation
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      console.log('🔐 Starting login process with AuthContext only')
      
      // Use AuthContext login method with retry mechanism
      const loginWithRetry = async () => {
        return await authLogin({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe
        })
      }
      
      await retryWithBackoff(loginWithRetry, {
        maxAttempts: 3,
        delay: 1000,
        onRetry: (attempt) => {
          setRetryAttempt(attempt)
          showError({
            title: 'Connection Issue',
            message: `Retrying login attempt ${attempt}/3...`,
            duration: 2000,
          })
        }
      })
      
      console.log('🔐 AuthContext login completed successfully')
      
      // Show success notification
      success({
        title: 'Login Successful',
        message: `Welcome back!`,
        duration: 3000,
      })
      
      // Let useGuestOnly handle the redirect - no manual redirect needed
      console.log('🔐 Login successful, letting useGuestOnly handle redirect')
    } catch (error) {
      console.error('Login error:', error)
      setRetryAttempt(0)
      
      // Handle network errors with detailed feedback
      if (isNetworkError(error)) {
        const errorDetails = getNetworkErrorDetails(error)
        setGeneralError(errorDetails.userMessage)
        
        // Show toast notification for network errors
        showError({
          title: 'Connection Error',
          message: errorDetails.userMessage,
          duration: 8000,
          action: errorDetails.canRetry ? {
            label: 'Retry',
            onClick: () => handleSubmit(e),
          } : undefined,
        })
      } else if (AuthService.isValidationError(error)) {
        // Handle field-specific validation errors
        if (error.field) {
          setErrors({ [error.field]: error.message })
        } else {
          setGeneralError(error.message)
        }
      } else if (AuthService.isAuthServiceError(error)) {
        setGeneralError(error.message)
        
        // Show specific error notifications
        if (error.message.includes('Invalid credentials') || error.message.includes('password')) {
          showError({
            title: 'Login Failed',
            message: 'Please check your email and password and try again.',
            duration: 6000,
          })
        } else if (error.code === 'RATE_LIMITED' || error.statusCode === 429) {
          // Extract wait time from error message if available
          const waitTimeMatch = error.message.match(/wait (\d+) seconds?/);
          const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : null;
          
          showError({
            title: 'Too Many Attempts',
            message: error.message,
            duration: waitTime ? Math.max(waitTime * 1000, 10000) : 15000,
            action: waitTime && waitTime < 60 ? {
              label: `Retry in ${waitTime}s`,
              onClick: () => {
                setTimeout(() => {
                  const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                  if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                  }
                }, waitTime * 1000);
              },
            } : undefined,
          })
        }
      } else {
        const errorMessage = 'An unexpected error occurred. Please try again.'
        setGeneralError(errorMessage)
        showError({
          title: 'Login Error',
          message: errorMessage,
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error for this field and general error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    if (generalError) {
      setGeneralError('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-6">
              <Dice6 className="h-10 w-10 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">PlayShelf</span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">
              Log in to manage your collection
            </p>
          </div>

          {/* General Error */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-600">{generalError}</p>
                  {retryAttempt > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Retry attempt: {retryAttempt}/3
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isLoading 
                  ? 'bg-primary-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isLoading && <ButtonLoader className="text-white" />}
              <span>
                {isLoading 
                  ? retryAttempt > 0 
                    ? `Retrying... (${retryAttempt}/3)`
                    : 'Logging in...' 
                  : 'Log in'
                }
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="font-medium text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
