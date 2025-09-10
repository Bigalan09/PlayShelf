import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { config } from '../config/index.js';
import { logSecurity } from '../utils/logger.js';

// Rate limiter configurations for different auth endpoints
const rateLimiterConfigs: Record<string, {
  keyGenerator: (req: Request) => string;
  points: number;
  duration: number;
  blockDuration: number;
  execEvenly: boolean;
}> = {
  login: {
    keyGenerator: (req: Request) => `login_${req.ip}`,
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
    execEvenly: true
  },
  loginEmail: {
    keyGenerator: (req: Request) => `login_email_${req.body.email?.toLowerCase() || 'unknown'}`,
    points: 3, // 3 attempts per email
    duration: 900, // Per 15 minutes
    blockDuration: 1800, // Block for 30 minutes
    execEvenly: true
  },
  register: {
    keyGenerator: (req: Request) => `register_${req.ip}`,
    points: 3, // 3 registrations
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
    execEvenly: true
  },
  forgotPassword: {
    keyGenerator: (req: Request) => `forgot_${req.body.email?.toLowerCase() || req.ip}`,
    points: 3, // 3 attempts
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
    execEvenly: true
  },
  resetPassword: {
    keyGenerator: (req: Request) => `reset_${req.ip}`,
    points: 5, // 5 attempts
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
    execEvenly: true
  },
  changePassword: {
    keyGenerator: (req: Request) => `change_pwd_${req.ip}`,
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
    execEvenly: true
  }
};

// Create rate limiters
const rateLimiters: { [key: string]: RateLimiterMemory } = {};

// Initialize rate limiters
Object.entries(rateLimiterConfigs).forEach(([name, config]) => {
  rateLimiters[name] = new RateLimiterMemory(config);
});

/**
 * Generic rate limiting middleware factory
 */
function createRateLimit(limiterName: string, options: {
  skipSuccessfulRequests?: boolean;
  message?: string;
  onLimitReached?: (req: Request) => void;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const limiter = rateLimiters[limiterName];
    if (!limiter) {
      return next();
    }

    try {
      const key = rateLimiterConfigs[limiterName].keyGenerator(req);
      await limiter.consume(key);
      
      // Set rate limit headers
      const resRateLimiter = await limiter.get(key);
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': rateLimiterConfigs[limiterName].points.toString(),
          'X-RateLimit-Remaining': (resRateLimiter.remainingPoints || 0).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + (resRateLimiter.msBeforeNext || 0)).toISOString()
        });
      }
      
      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      // Log security event
      logSecurity(`Rate limit exceeded for ${limiterName}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        blockDurationSeconds: secs,
        email: req.body.email
      });
      
      // Call custom handler if provided
      if (options.onLimitReached) {
        options.onLimitReached(req);
      }
      
      res.set({
        'X-RateLimit-Limit': rateLimiterConfigs[limiterName].points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
        'Retry-After': secs.toString()
      });
      
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message || `Too many attempts. Please try again in ${secs} seconds.`,
        retryAfter: secs
      });
    }
  };
}

/**
 * Rate limiter for login attempts (by IP)
 */
export const loginRateLimit = createRateLimit('login', {
  message: 'Too many login attempts from this IP address. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Login rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for login attempts (by email)
 */
export const loginEmailRateLimit = createRateLimit('loginEmail', {
  message: 'Too many login attempts for this email address. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Login email rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for registration attempts
 */
export const registerRateLimit = createRateLimit('register', {
  message: 'Too many registration attempts. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Registration rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      username: req.body.username,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for forgot password attempts
 */
export const forgotPasswordRateLimit = createRateLimit('forgotPassword', {
  message: 'Too many password reset requests. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Forgot password rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for reset password attempts
 */
export const resetPasswordRateLimit = createRateLimit('resetPassword', {
  message: 'Too many password reset attempts. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Reset password rate limit exceeded', {
      ip: req.ip,
      token: req.body.token ? 'provided' : 'missing',
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for change password attempts
 */
export const changePasswordRateLimit = createRateLimit('changePassword', {
  message: 'Too many password change attempts. Please try again later.',
  onLimitReached: (req) => {
    logSecurity('Change password rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Combined login rate limiters middleware
 */
export const combinedLoginRateLimit = [
  loginRateLimit,
  loginEmailRateLimit
];

/**
 * Middleware to reset rate limit on successful authentication
 */
export const resetRateLimitOnSuccess = (limiterNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // Check if response indicates success
      if (data && data.success === true) {
        // Reset rate limits for successful operation
        limiterNames.forEach(async (limiterName) => {
          const limiter = rateLimiters[limiterName];
          const config = rateLimiterConfigs[limiterName];
          if (limiter && config) {
            try {
              const key = config.keyGenerator(req);
              await limiter.delete(key);
            } catch (error) {
              // Ignore errors when deleting rate limit keys
            }
          }
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Clean up expired rate limit keys (should be called periodically)
 */
export const cleanupRateLimiters = () => {
  // For memory-based rate limiters, this is handled automatically
  // This function is kept for future Redis implementation compatibility
  logSecurity('Rate limiter cleanup completed', {});
};

/**
 * Get rate limit info for a specific limiter and key
 */
export const getRateLimitInfo = async (limiterName: string, req: Request) => {
  const limiter = rateLimiters[limiterName];
  const config = rateLimiterConfigs[limiterName];
  
  if (!limiter || !config) {
    return null;
  }
  
  try {
    const key = config.keyGenerator(req);
    const resRateLimiter = await limiter.get(key);
    
    if (resRateLimiter) {
      return {
        limit: config.points,
        remaining: resRateLimiter.remainingPoints || 0,
        reset: new Date(Date.now() + (resRateLimiter.msBeforeNext || 0))
      };
    }
    
    return {
      limit: config.points,
      remaining: config.points,
      reset: null
    };
  } catch (error) {
    return null;
  }
};