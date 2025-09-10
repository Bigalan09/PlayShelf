import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logError } from '../utils/logger.js';

/**
 * Validation middleware factory for auth endpoints
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        const field = firstIssue.path.join('.');
        
        // Create user-friendly error messages
        let message = firstIssue.message;
        
        switch (firstIssue.code) {
          case 'too_small':
            if (firstIssue.type === 'string') {
              if (field === 'password') {
                message = 'Password must be at least 8 characters long';
              } else if (field === 'username') {
                message = 'Username must be at least 3 characters long';
              } else {
                message = `${field} is too short`;
              }
            }
            break;
          case 'too_big':
            if (firstIssue.type === 'string') {
              message = `${field} is too long`;
            }
            break;
          case 'invalid_string':
            if (firstIssue.validation === 'email') {
              message = 'Please provide a valid email address';
            } else if (firstIssue.validation === 'regex') {
              if (field === 'password') {
                message = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
              } else if (field === 'username') {
                message = 'Username can only contain letters, numbers, and underscores';
              } else {
                message = `${field} format is invalid`;
              }
            }
            break;
          case 'invalid_type':
            message = `${field} is required`;
            break;
          default:
            message = firstIssue.message;
        }

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message,
          field,
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
      }

      logError('Validation middleware error', error instanceof Error ? error : new Error('Unknown error'));
      
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Request validation failed'
      });
    }
  };
};

/**
 * Middleware to sanitize email input (convert to lowercase and trim)
 */
export const sanitizeEmailInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.email && typeof req.body.email === 'string') {
    req.body.email = req.body.email.trim().toLowerCase();
  }
  next();
};

/**
 * Middleware to sanitize username input (trim and validate characters)
 */
export const sanitizeUsernameInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.username && typeof req.body.username === 'string') {
    req.body.username = req.body.username.trim();
  }
  next();
};

/**
 * Middleware to check for common security issues in password
 */
export const validatePasswordSecurity = (req: Request, res: Response, next: NextFunction) => {
  const password = req.body.password || req.body.newPassword;
  
  if (!password || typeof password !== 'string') {
    return next();
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome',
    'monkey', '1234567890', 'dragon', 'master', 'password!',
    'Password1', 'Password123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'Password is too common. Please choose a stronger password.',
      field: req.body.newPassword ? 'newPassword' : 'password'
    });
  }

  // Check for repeated characters (more than 3 in a row)
  if (/(.)\1{3,}/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'Password cannot contain more than 3 repeated characters in a row.',
      field: req.body.newPassword ? 'newPassword' : 'password'
    });
  }

  // Check for keyboard patterns
  const keyboardPatterns = [
    'qwerty', 'asdf', 'zxcv', '1234', '4321',
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of keyboardPatterns) {
    if (lowerPassword.includes(pattern)) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password cannot contain keyboard patterns.',
        field: req.body.newPassword ? 'newPassword' : 'password'
      });
    }
  }

  next();
};

/**
 * Middleware to prevent password reuse (checks against current password in change password)
 */
export const preventPasswordReuse = (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  
  if (currentPassword && newPassword && currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      error: 'PASSWORD_REUSE',
      message: 'New password must be different from current password.',
      field: 'newPassword'
    });
  }
  
  next();
};

/**
 * Middleware to trim and validate string inputs
 */
export const sanitizeStringInputs = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Trim whitespace
        req.body[field] = req.body[field].trim();
        
        // Remove null bytes and other control characters
        req.body[field] = req.body[field].replace(/[\x00-\x1F\x7F]/g, '');
        
        // Convert empty strings to undefined (for optional fields)
        if (req.body[field] === '') {
          req.body[field] = undefined;
        }
      }
    }
    next();
  };
};

/**
 * Middleware to validate file upload inputs (for avatar URLs)
 */
export const validateFileInputs = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.avatar && typeof req.body.avatar === 'string') {
    const avatar = req.body.avatar.trim();
    
    // Check if it's a valid URL
    try {
      const url = new URL(avatar);
      
      // Only allow HTTPS URLs (except in development)
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_AVATAR_URL',
          message: 'Avatar URL must use HTTPS protocol',
          field: 'avatar'
        });
      }
      
      // Check for allowed file extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = allowedExtensions.some(ext => 
        url.pathname.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_AVATAR_URL',
          message: 'Avatar must be a valid image file (jpg, jpeg, png, gif, webp)',
          field: 'avatar'
        });
      }
      
      req.body.avatar = avatar;
    } catch {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AVATAR_URL',
        message: 'Avatar must be a valid URL',
        field: 'avatar'
      });
    }
  }
  
  next();
};