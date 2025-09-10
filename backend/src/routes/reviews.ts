import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { ReviewService, CreateReviewSchema, UpdateReviewSchema, ReviewQuerySchema } from '../services/reviewService.js';
import { logError, logger } from '../utils/logger.js';

const router = Router();

// Rate limiting for review operations
const reviewRateLimit = rateLimiter({
  points: 30, // 30 requests
  duration: 15 * 60, // 15 minutes in seconds
});

const createReviewRateLimit = rateLimiter({
  points: 10, // 10 review creations
  duration: 60 * 60, // 1 hour in seconds
});

// Validation schemas for route parameters
const ReviewParamsSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID format'),
});

const GameReviewParamsSchema = z.object({
  gameId: z.string().uuid('Invalid game ID format'),
});

const UserReviewParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * @route POST /api/v1/reviews
 * @desc Create a new review
 * @access Private
 */
router.post('/',
  createReviewRateLimit,
  authenticateToken,
  validateRequest({ body: CreateReviewSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const reviewData = req.body;

      const review = await ReviewService.createReview(userId, reviewData);

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create review';
      
      if (errorMessage === 'Game not found') {
        res.status(404).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      if (errorMessage.includes('already reviewed')) {
        res.status(409).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      logError('Review creation failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.user!.userId,
        gameId: req.body.gameId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/reviews/:reviewId
 * @desc Get review by ID
 * @access Public
 */
router.get('/:reviewId',
  reviewRateLimit,
  validateRequest({ params: ReviewParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;

      const review = await ReviewService.getReviewById(reviewId);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get review';
      
      if (errorMessage === 'Review not found') {
        res.status(404).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      logError('Failed to get review', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId: req.params.reviewId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route PUT /api/v1/reviews/:reviewId
 * @desc Update review
 * @access Private (own reviews only)
 */
router.put('/:reviewId',
  reviewRateLimit,
  authenticateToken,
  validateRequest({ 
    params: ReviewParamsSchema,
    body: UpdateReviewSchema 
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.user!.userId;
      const updates = req.body;

      const review = await ReviewService.updateReview(reviewId, userId, updates);

      res.json({
        success: true,
        data: review,
        message: 'Review updated successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update review';
      
      if (errorMessage === 'Review not found') {
        res.status(404).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      if (errorMessage === 'Not authorized to update this review') {
        res.status(403).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      if (errorMessage === 'No updates provided') {
        res.status(400).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      logError('Review update failed', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId: req.params.reviewId,
        userId: req.user!.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/v1/reviews/:reviewId
 * @desc Delete review
 * @access Private (own reviews only)
 */
router.delete('/:reviewId',
  reviewRateLimit,
  authenticateToken,
  validateRequest({ params: ReviewParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.user!.userId;

      await ReviewService.deleteReview(reviewId, userId);

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete review';
      
      if (errorMessage === 'Review not found') {
        res.status(404).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      if (errorMessage === 'Not authorized to delete this review') {
        res.status(403).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      logError('Review deletion failed', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId: req.params.reviewId,
        userId: req.user!.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/reviews
 * @desc Search reviews with filters
 * @access Public (private reviews filtered out unless own)
 */
router.get('/',
  reviewRateLimit,
  validateRequest({ query: ReviewQuerySchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = req.query as any;
      const requestUserId = req.user?.userId;

      const result = await ReviewService.searchReviews(query, requestUserId);

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
        stats: result.stats
      });
    } catch (error) {
      logError('Review search failed', error instanceof Error ? error : new Error('Unknown error'), {
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
 * @route GET /api/v1/reviews/games/:gameId
 * @desc Get reviews for a specific game
 * @access Public
 */
router.get('/games/:gameId',
  reviewRateLimit,
  validateRequest({ 
    params: GameReviewParamsSchema,
    query: ReviewQuerySchema.omit({ gameId: true })
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;
      const query = { ...req.query, gameId } as any;
      const requestUserId = req.user?.userId;

      const result = await ReviewService.searchReviews(query, requestUserId);

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
        stats: result.stats
      });
    } catch (error) {
      logError('Game reviews search failed', error instanceof Error ? error : new Error('Unknown error'), {
        gameId: req.params.gameId,
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
 * @route GET /api/v1/reviews/users/:userId
 * @desc Get reviews by a specific user
 * @access Public (public reviews only, unless viewing own)
 */
router.get('/users/:userId',
  reviewRateLimit,
  validateRequest({ 
    params: UserReviewParamsSchema,
    query: ReviewQuerySchema.omit({ userId: true })
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const query = { ...req.query, userId } as any;
      const requestUserId = req.user?.userId;

      const result = await ReviewService.searchReviews(query, requestUserId);

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination
      });
    } catch (error) {
      logError('User reviews search failed', error instanceof Error ? error : new Error('Unknown error'), {
        userId: req.params.userId,
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
 * @route GET /api/v1/reviews/games/:gameId/stats
 * @desc Get review statistics for a game
 * @access Public
 */
router.get('/games/:gameId/stats',
  reviewRateLimit,
  validateRequest({ params: GameReviewParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;

      const stats = await ReviewService.getGameReviewStats(gameId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logError('Game review stats failed', error instanceof Error ? error : new Error('Unknown error'), {
        gameId: req.params.gameId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/reviews/users/:userId/stats
 * @desc Get review statistics for a user
 * @access Public
 */
router.get('/users/:userId/stats',
  reviewRateLimit,
  validateRequest({ params: UserReviewParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await ReviewService.getUserReviewStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logError('User review stats failed', error instanceof Error ? error : new Error('Unknown error'), {
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
 * @route POST /api/v1/reviews/:reviewId/helpful
 * @desc Mark a review as helpful
 * @access Private
 */
router.post('/:reviewId/helpful',
  reviewRateLimit,
  authenticateToken,
  validateRequest({ params: ReviewParamsSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const userId = req.user!.userId;

      await ReviewService.markReviewHelpful(reviewId, userId);

      res.json({
        success: true,
        message: 'Review marked as helpful'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark review as helpful';
      
      if (errorMessage === 'Review not found') {
        res.status(404).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      if (errorMessage === 'Cannot mark your own review as helpful') {
        res.status(400).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      logError('Mark review helpful failed', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId: req.params.reviewId,
        userId: req.user!.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Admin routes for moderation
/**
 * @route PUT /api/v1/reviews/:reviewId/moderate
 * @desc Moderate a review (admin only)
 * @access Private (admin)
 */
router.put('/:reviewId/moderate',
  reviewRateLimit,
  authenticateToken,
  validateRequest({ 
    params: ReviewParamsSchema,
    body: z.object({
      action: z.enum(['hide', 'show', 'flag']),
      reason: z.string().optional()
    })
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      const { reviewId } = req.params;
      const { action, reason } = req.body;

      // Simple moderation - just update visibility
      // In a full implementation, you'd have a moderation log table
      const isPublic = action === 'show';
      
      await ReviewService.updateReview(reviewId, req.user!.userId, { isPublic });

      logger.info('Review moderated', { 
        reviewId, 
        action, 
        reason, 
        moderatorId: req.user!.userId 
      });

      res.json({
        success: true,
        message: `Review ${action} successfully`
      });
    } catch (error) {
      logError('Review moderation failed', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId: req.params.reviewId,
        moderatorId: req.user!.userId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;