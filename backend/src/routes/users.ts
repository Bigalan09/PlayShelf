import { Router, Response } from 'express';
import { UserService } from '../auth/userService.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logAuth, logError } from '../utils/logger.js';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  AuthenticationError,
  ValidationError
} from '../auth/types.js';
import { changePasswordRateLimit } from '../middleware/authRateLimit.js';
import {
  validatePasswordSecurity,
  preventPasswordReuse,
  sanitizeStringInputs,
  validateFileInputs
} from '../middleware/authValidation.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /users/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    const user = await UserService.getProfile(req.user.id);

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(404).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Get profile endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/profile',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user profile'
    });
  }
});

/**
 * @route PUT /users/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put('/profile', [
  sanitizeStringInputs(['firstName', 'lastName', 'bio']),
  validateFileInputs
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Validate request body
    const validatedData = UpdateProfileSchema.parse(req.body);
    
    // Update profile
    const user = await UserService.updateProfile(req.user.id, validatedData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
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
      return res.status(404).json({
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

    logError('Update profile endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/profile',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route PUT /users/password
 * @desc Change user's password
 * @access Private
 */
router.put('/password', [
  changePasswordRateLimit,
  validatePasswordSecurity,
  preventPasswordReuse
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Validate request body
    const validatedData = ChangePasswordSchema.parse(req.body);
    
    // Change password
    await UserService.changePassword(req.user.id, validatedData);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
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
      const statusCode = error.code === 'INVALID_PASSWORD' ? 400 : 404;
      return res.status(statusCode).json({
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
        message: firstIssue?.message || 'Invalid password format',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Change password endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/password',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to change password'
    });
  }
});

/**
 * @route DELETE /users/account
 * @desc Delete current user's account (soft delete)
 * @access Private
 */
router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Delete account
    await UserService.deleteAccount(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(404).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Delete account endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/account',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete account'
    });
  }
});

/**
 * @route POST /users/logout-all
 * @desc Logout from all devices by revoking all refresh tokens
 * @access Private
 */
router.post('/logout-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Logout from all devices
    await UserService.logoutAllDevices(req.user.id);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Logout all devices endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/logout-all',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to logout from all devices'
    });
  }
});

/**
 * @route GET /users/sessions
 * @desc Get user's active sessions
 * @access Private
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Get user sessions
    const sessions = await UserService.getUserSessions(req.user.id);

    res.json({
      success: true,
      data: {
        sessions
      }
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        success: false,
        error: error.code,
        message: error.message
      });
    }

    logError('Get sessions endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/users/sessions',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user sessions'
    });
  }
});

export default router;