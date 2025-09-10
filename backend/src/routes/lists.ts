import { Router, Request, Response } from 'express';
import { 
  CollectionService, 
  CreateListSchema, 
  UpdateListSchema, 
  AddGameToListSchema,
  CreateListRequest,
  UpdateListRequest,
  AddGameToListRequest
} from '../services/collectionService.js';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { logError, logger } from '../utils/logger.js';

const router = Router();

/**
 * @route GET /lists/me
 * @desc Get current user's lists
 * @access Private
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lists = await CollectionService.getUserLists(req.user!.id);

    res.json({
      success: true,
      data: {
        lists
      }
    });
  } catch (error) {
    logError('Get user lists endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/lists/me',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve lists'
    });
  }
});

/**
 * @route POST /lists/me
 * @desc Create a new user list
 * @access Private
 */
router.post('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreateListSchema.parse(req.body);
    const list = await CollectionService.createUserList(req.user!.id, validatedData);

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      data: {
        list
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
        message: firstIssue?.message || 'Invalid list data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_LIST_NAME',
        message: error.message
      });
    }

    logError('Create list endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/lists/me',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create list'
    });
  }
});

/**
 * @route GET /lists/:listId
 * @desc Get list by ID (public or own)
 * @access Public (with optional auth)
 */
router.get('/:listId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listId } = req.params;
    
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid list ID format'
      });
    }

    const list = await CollectionService.getListById(listId, req.user?.id);

    res.json({
      success: true,
      data: {
        list
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'List not found') {
      return res.status(404).json({
        success: false,
        error: 'LIST_NOT_FOUND',
        message: 'List not found'
      });
    }

    logError('Get list by ID endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/lists/${req.params.listId}`,
      listId: req.params.listId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve list'
    });
  }
});

/**
 * @route PUT /lists/me/:listId
 * @desc Update user list
 * @access Private
 */
router.put('/me/:listId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listId } = req.params;
    
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid list ID format'
      });
    }

    const validatedData = UpdateListSchema.parse(req.body);
    const list = await CollectionService.updateUserList(req.user!.id, listId, validatedData);

    res.json({
      success: true,
      message: 'List updated successfully',
      data: {
        list
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
        message: firstIssue?.message || 'Invalid list data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error) {
      if (error.message === 'List not found') {
        return res.status(404).json({
          success: false,
          error: 'LIST_NOT_FOUND',
          message: 'List not found'
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_LIST_NAME',
          message: error.message
        });
      }
    }

    logError('Update list endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/lists/me/${req.params.listId}`,
      listId: req.params.listId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update list'
    });
  }
});

/**
 * @route DELETE /lists/me/:listId
 * @desc Delete user list
 * @access Private
 */
router.delete('/me/:listId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listId } = req.params;
    
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid list ID format'
      });
    }

    await CollectionService.deleteUserList(req.user!.id, listId);

    res.json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'List not found') {
      return res.status(404).json({
        success: false,
        error: 'LIST_NOT_FOUND',
        message: 'List not found'
      });
    }

    logError('Delete list endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/lists/me/${req.params.listId}`,
      listId: req.params.listId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete list'
    });
  }
});

/**
 * @route POST /lists/me/:listId/games
 * @desc Add game to user list
 * @access Private
 */
router.post('/me/:listId/games', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listId } = req.params;
    
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid list ID format'
      });
    }

    const validatedData = AddGameToListSchema.parse(req.body);
    await CollectionService.addGameToList(req.user!.id, listId, validatedData);

    res.status(201).json({
      success: true,
      message: 'Game added to list successfully'
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstIssue?.message || 'Invalid game ID',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error) {
      if (error.message === 'List not found') {
        return res.status(404).json({
          success: false,
          error: 'LIST_NOT_FOUND',
          message: 'List not found'
        });
      }

      if (error.message === 'Game not found') {
        return res.status(404).json({
          success: false,
          error: 'GAME_NOT_FOUND',
          message: 'Game not found'
        });
      }

      if (error.message.includes('already in this list')) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_GAME',
          message: error.message
        });
      }
    }

    logError('Add game to list endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/lists/me/${req.params.listId}/games`,
      listId: req.params.listId,
      userId: req.user?.id,
      gameId: req.body?.gameId
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to add game to list'
    });
  }
});

/**
 * @route DELETE /lists/me/:listId/games/:gameId
 * @desc Remove game from user list
 * @access Private
 */
router.delete('/me/:listId/games/:gameId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { listId, gameId } = req.params;
    
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LIST_ID',
        message: 'Invalid list ID format'
      });
    }

    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      });
    }

    await CollectionService.removeGameFromList(req.user!.id, listId, gameId);

    res.json({
      success: true,
      message: 'Game removed from list successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'List not found') {
        return res.status(404).json({
          success: false,
          error: 'LIST_NOT_FOUND',
          message: 'List not found'
        });
      }

      if (error.message === 'Game not found in list') {
        return res.status(404).json({
          success: false,
          error: 'GAME_NOT_IN_LIST',
          message: 'Game not found in list'
        });
      }
    }

    logError('Remove game from list endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/lists/me/${req.params.listId}/games/${req.params.gameId}`,
      listId: req.params.listId,
      gameId: req.params.gameId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to remove game from list'
    });
  }
});

export default router;