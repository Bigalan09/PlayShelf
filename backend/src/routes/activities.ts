import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { ActivityService, ActivityQuerySchema } from '../services/activityService.js';
import { logError, logger } from '../utils/logger.js';

const router = Router();

// Rate limiting for activity operations
const activityRateLimit = rateLimiter({
  points: 100, // 100 requests
  duration: 15 * 60, // 15 minutes in seconds
});

// Validation schemas for route parameters
const UserParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * @route GET /api/v1/activities
 * @desc Get public activity feed with filters
 * @access Public (with optional auth for personalized feed)
 */
router.get('/',
  activityRateLimit,
  optionalAuth,
  validateRequest({ query: ActivityQuerySchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = req.query as any;
      const requestUserId = req.user?.userId;

      const result = await ActivityService.getActivityFeed(query, requestUserId);

      res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination
      });
    } catch (error) {
      logError('Activity feed failed', error instanceof Error ? error : new Error('Unknown error'), {
        query: req.query,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/activities/users/:userId
 * @desc Get activities for a specific user
 * @access Public (public activities only, unless viewing own)
 */
router.get('/users/:userId',
  activityRateLimit,
  optionalAuth,
  validateRequest({ 
    params: UserParamsSchema,
    query: ActivityQuerySchema.omit({ userId: true })
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const query = { ...req.query, userId } as any;
      const requestUserId = req.user?.userId;

      const result = await ActivityService.getActivityFeed(query, requestUserId);

      res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination
      });
    } catch (error) {
      logError('User activities failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.params.userId,
        query: req.query,
        requestUserId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/activities/users/:userId/stats
 * @desc Get activity statistics for a user
 * @access Public
 */
router.get('/users/:userId/stats',
  activityRateLimit,
  validateRequest({ params: UserParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await ActivityService.getUserActivityStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logError('User activity stats failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/activities/friends
 * @desc Get activity feed from friends
 * @access Private
 */
router.get('/friends',
  activityRateLimit,
  authenticateToken,
  validateRequest({ query: ActivityQuerySchema.omit({ userId: true }) }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const query = req.query as any;

      const result = await ActivityService.getFriendActivityFeed(userId, query);

      res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination
      });
    } catch (error) {
      logError('Friend activity feed failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.user!.userId,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/v1/activities/users/:userId
 * @desc Delete user's activities (privacy/cleanup)
 * @access Private (own activities only)
 */
router.delete('/users/:userId',
  activityRateLimit,
  authenticateToken,
  validateRequest({ 
    params: UserParamsSchema,
    query: z.object({
      olderThanDays: z.coerce.number().int().min(1).optional()
    })
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestUserId = req.user!.userId;
      const { olderThanDays } = req.query as any;

      // Users can only delete their own activities
      if (userId !== requestUserId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to delete these activities'
        });
        return;
      }

      const deletedCount = await ActivityService.deleteUserActivities(userId, olderThanDays);

      res.json({
        success: true,
        message: `${deletedCount} activities deleted`,
        data: { deletedCount }
      });
    } catch (error) {
      logError('Delete user activities failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.params.userId,
        requestUserId: req.user!.userId,
        olderThanDays: req.query.olderThanDays
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;