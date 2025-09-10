import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { config } from '../config/index.js';
import { logSecurity } from '../utils/logger.js';

// Create rate limiter instance
const createRateLimiter = () => {
  // For development, use memory store. For production, use Redis
  if (config.server.nodeEnv === 'development') {
    return new RateLimiterMemory({
      points: config.rateLimit.maxRequests,
      duration: Math.floor(config.rateLimit.windowMs / 1000), // Convert to seconds
    });
  }

  // TODO: Add Redis implementation when Redis client is set up
  return new RateLimiterMemory({
    points: config.rateLimit.maxRequests,
    duration: Math.floor(config.rateLimit.windowMs / 1000),
  });
};

const defaultRateLimiter = createRateLimiter();

export const createRateLimit = (options?: { 
  points?: number; 
  duration?: number; 
}) => {
  const limiter = options ? new RateLimiterMemory({
    points: options.points || config.rateLimit.maxRequests,
    duration: options.duration || Math.floor(config.rateLimit.windowMs / 1000),
  }) : defaultRateLimiter;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await limiter.consume(req.ip || '');
      next();
    } catch (rateLimiterRes: any) {
      logSecurity('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      const remainingTime = Math.round((rateLimiterRes?.msBeforeNext || 60000) / 1000) || 1;
      
      res.set({
        'Retry-After': String(remainingTime),
        'X-RateLimit-Limit': String(config.rateLimit.maxRequests),
        'X-RateLimit-Remaining': String(rateLimiterRes?.remainingHits || 0),
        'X-RateLimit-Reset': String(new Date(Date.now() + (rateLimiterRes?.msBeforeNext || 60000))),
      });

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime,
      });
    }
  };
};

// Default rate limiter
export const rateLimit = createRateLimit();

// Stricter rate limiter for auth endpoints
export const authRateLimit = createRateLimit({
  points: 5, // 5 attempts
  duration: 900, // 15 minutes
});

// More permissive rate limiter for public endpoints
export const publicRateLimit = createRateLimit({
  points: 1000, // 1000 requests
  duration: 3600, // 1 hour
});

// Export rateLimiter as alias for createRateLimit for compatibility
export const rateLimiter = createRateLimit;