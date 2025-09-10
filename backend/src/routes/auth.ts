import { Router, Request, Response } from 'express';
import { UserService } from '../auth/userService.js';
import { TokenService } from '../auth/tokenService.js';
import { PasswordResetService } from '../auth/passwordResetService.js';
import { logAuth, logError } from '../utils/logger.js';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  AuthenticationError,
  ValidationError,
  TokenExpiredError,
  InvalidTokenError
} from '../auth/types.js';
import {
  combinedLoginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  resetRateLimitOnSuccess
} from '../middleware/authRateLimit.js';
import {
  sanitizeEmailInput,
  sanitizeUsernameInput,
  validatePasswordSecurity,
  sanitizeStringInputs,
  validateFileInputs
} from '../middleware/authValidation.js';

const router = Router();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  registerRateLimit,
  sanitizeEmailInput,
  sanitizeUsernameInput,
  sanitizeStringInputs(['firstName', 'lastName']),
  validatePasswordSecurity,
  resetRateLimitOnSuccess(['register'])
], async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = RegisterSchema.parse(req.body);
    
    // Get client info
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Register user
    const result = await UserService.register(validatedData, ipAddress, userAgent);

    // Set refresh token as httpOnly cookie (optional, for enhanced security)
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/v1/auth/refresh'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.message,
        field: error.field
      });
    }

    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid input data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Registration endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/register'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Registration failed. Please try again later.'
    });
  }
});

/**
 * @route POST /auth/login
 * @desc Authenticate user and return tokens
 * @access Public
 */
router.post('/login', [
  ...combinedLoginRateLimit,
  sanitizeEmailInput,
  resetRateLimitOnSuccess(['login', 'loginEmail'])
], async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = LoginSchema.parse(req.body);
    
    // Get client info
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Authenticate user
    const result = await UserService.login(validatedData, ipAddress, userAgent);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/v1/auth/refresh'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid email or password format'
      });
    }

    logError('Login endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/login'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Login failed. Please try again later.'
    });
  }
});

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Get refresh token from body or cookie
    let refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required'
      });
    }

    // Validate if provided in body
    if (req.body.refreshToken) {
      const validatedData = RefreshTokenSchema.parse({ refreshToken });
      refreshToken = validatedData.refreshToken;
    }

    // Get client info
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Refresh tokens
    const result = await UserService.refreshToken(refreshToken, ipAddress, userAgent);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/v1/auth/refresh'
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: result.tokens
      }
    });

  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof InvalidTokenError) {
      // Clear refresh token cookie on invalid/expired token
      res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
      
      return res.status(401).json({
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired'
      });
    }

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Refresh endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/refresh'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Token refresh failed. Please try again later.'
    });
  }
});

/**
 * @route POST /auth/logout
 * @desc Logout user by revoking refresh token
 * @access Public
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    
    if (refreshToken) {
      const ipAddress = req.ip;
      await UserService.logout(refreshToken, ipAddress);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logError('Logout endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/logout'
    });

    // Always return success for logout, even if there's an error
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = TokenService.extractBearerToken(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = TokenService.verifyAccessToken(token);
    
    // Get user profile
    const user = await UserService.getProfile(decoded.id);

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired'
      });
    }

    if (error instanceof InvalidTokenError) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token'
      });
    }

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Me endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/me'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user information'
    });
  }
});

/**
 * @route POST /auth/forgot-password
 * @desc Initiate password reset process
 * @access Public
 */
router.post('/forgot-password', [
  forgotPasswordRateLimit,
  sanitizeEmailInput
], async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = ForgotPasswordSchema.parse(req.body);
    
    // Get client info
    const ipAddress = req.ip;

    // Initiate password reset
    const result = await PasswordResetService.initiatePasswordReset(validatedData, ipAddress);

    res.json({
      success: true,
      message: result.message,
      ...(result.resetToken ? { resetToken: result.resetToken } : {})
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid email format',
        field: firstIssue?.path?.join('.') || 'email'
      });
    }

    logError('Forgot password endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/forgot-password'
    });

    // Always return success message to prevent information disclosure
    res.json({
      success: true,
      message: 'If an account with this email exists, you will receive password reset instructions.'
    });
  }
});

/**
 * @route POST /auth/reset-password
 * @desc Reset password using reset token
 * @access Public
 */
router.post('/reset-password', [
  resetPasswordRateLimit,
  validatePasswordSecurity
], async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = ResetPasswordSchema.parse(req.body);
    
    // Get client info
    const ipAddress = req.ip;

    // Reset password
    const result = await PasswordResetService.resetPassword(validatedData, ipAddress);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid input data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Reset password endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/reset-password'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Password reset failed. Please try again later.'
    });
  }
});

/**
 * @route GET /auth/validate-reset-token
 * @desc Validate a password reset token
 * @access Public
 */
router.get('/validate-reset-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Reset token is required'
      });
    }

    const result = await PasswordResetService.validateResetToken(token);

    res.json({
      success: true,
      data: {
        valid: result.valid,
        email: result.email
      }
    });

  } catch (error) {
    logError('Validate reset token endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/auth/validate-reset-token'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Token validation failed'
    });
  }
});

export default router;