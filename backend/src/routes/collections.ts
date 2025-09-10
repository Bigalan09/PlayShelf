import { Router, Request, Response } from 'express';
import { 
  CollectionService, 
  AddToCollectionSchema, 
  UpdateCollectionEntrySchema, 
  CollectionQuerySchema,
  AddToCollectionRequest,
  UpdateCollectionEntryRequest,
  CollectionQuery
} from '../services/collectionService.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logError, logger } from '../utils/logger.js';

const router = Router();

/**
 * @route GET /collections/me
 * @desc Get current user's collection
 * @access Private
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = CollectionQuerySchema.parse(req.query);
    const result = await CollectionService.getUserCollection(req.user!.id, query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid query parameters',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Get user collection endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/collections/me',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve collection'
    });
  }
});

/**
 * @route GET /collections/me/statistics
 * @desc Get current user's collection statistics
 * @access Private
 */
router.get('/me/statistics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statistics = await CollectionService.getCollectionStatistics(req.user!.id);

    res.json({
      success: true,
      data: {
        statistics
      }
    });
  } catch (error) {
    logError('Get collection statistics endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/collections/me/statistics',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve collection statistics'
    });
  }
});

/**
 * @route POST /collections/me
 * @desc Add game to current user's collection
 * @access Private
 */
router.post('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = AddToCollectionSchema.parse(req.body);
    const entry = await CollectionService.addToCollection(req.user!.id, validatedData);

    res.status(201).json({
      success: true,
      message: `Game added to ${validatedData.status} successfully`,
      data: {
        entry
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid collection data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return res.status(404).json({
          success: false,
          error: 'GAME_NOT_FOUND',
          message: 'Game not found'
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_ENTRY',
          message: error.message
        });
      }
    }

    logError('Add to collection endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/collections/me',
      userId: req.user?.id,
      gameId: req.body?.gameId
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to add game to collection'
    });
  }
});

/**
 * @route PUT /collections/me/:gameId/:status
 * @desc Update collection entry
 * @access Private
 */
router.put('/me/:gameId/:status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, status } = req.params;
    
    // Validate UUID format
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    // Validate status
    const validStatuses = ['owned', 'wishlist', 'played', 'for_trade', 'want_in_trade'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: 'Invalid collection status'
      });
    }

    const validatedData = UpdateCollectionEntrySchema.parse(req.body);
    const entry = await CollectionService.updateCollectionEntry(req.user!.id, gameId, status, validatedData);

    res.json({
      success: true,
      message: 'Collection entry updated successfully',
      data: {
        entry
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid collection data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error && error.message === 'Collection entry not found') {
      return res.status(404).json({
        success: false,
        error: 'ENTRY_NOT_FOUND',
        message: 'Collection entry not found'
      });
    }

    logError('Update collection entry endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/collections/me/${req.params.gameId}/${req.params.status}`,
      userId: req.user?.id,
      gameId: req.params.gameId,
      status: req.params.status
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update collection entry'
    });
  }
});

/**
 * @route DELETE /collections/me/:gameId/:status
 * @desc Remove game from collection
 * @access Private
 */
router.delete('/me/:gameId/:status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, status } = req.params;
    
    // Validate UUID format
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    // Validate status
    const validStatuses = ['owned', 'wishlist', 'played', 'for_trade', 'want_in_trade'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: 'Invalid collection status'
      });
    }

    await CollectionService.removeFromCollection(req.user!.id, gameId, status);

    res.json({
      success: true,
      message: `Game removed from ${status} successfully`
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Collection entry not found') {
      return res.status(404).json({
        success: false,
        error: 'ENTRY_NOT_FOUND',
        message: 'Collection entry not found'
      });
    }

    logError('Remove from collection endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/collections/me/${req.params.gameId}/${req.params.status}`,
      userId: req.user?.id,
      gameId: req.params.gameId,
      status: req.params.status
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to remove game from collection'
    });
  }
});

/**
 * @route GET /collections/:userId
 * @desc Get public collection of another user
 * @access Public
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Validate UUID format
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid user ID format'
      });
    }

    // Parse query but filter for public entries only
    const query = CollectionQuerySchema.parse(req.query);
    const result = await CollectionService.getUserCollection(userId, {
      ...query,
      // Note: Service should be modified to handle public-only filtering
    });

    // Filter for public entries only (this should be handled in the service)
    const publicEntries = result.entries.filter(entry => entry.isPublic);

    res.json({
      success: true,
      data: {
        ...result,
        entries: publicEntries,
      }
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid query parameters',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    logError('Get public collection endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/collections/${req.params.userId}`,
      targetUserId: req.params.userId
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve collection'
    });
  }
});

export default router;