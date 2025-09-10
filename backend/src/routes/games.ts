import { Router, Request, Response } from 'express';
import { 
  GameService, 
  CreateGameSchema, 
  UpdateGameSchema, 
  GameQuerySchema,
  CreateGameRequest,
  UpdateGameRequest,
  GameQuery
} from '../services/gameService.js';
import { authenticateToken, optionalAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { logError, logger } from '../utils/logger.js';

const router = Router();

/**
 * @route GET /games
 * @desc Get games with search and filtering
 * @access Public
 */
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = GameQuerySchema.parse(req.query);
    const result = await GameService.searchGames(query);

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

    logError('Get games endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/games'
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve games'
    });
  }
});

/**
 * @route GET /games/:id
 * @desc Get game by ID
 * @access Public
 */
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    const game = await GameService.getGameById(gameId);

    res.json({
      success: true,
      data: {
        game
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({
        success: false,
        error: 'GAME_NOT_FOUND',
        message: 'Game not found'
      });
    }

    logError('Get game by ID endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/games/${req.params.id}`,
      gameId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve game'
    });
  }
});

/**
 * @route POST /games
 * @desc Create a new game
 * @access Admin
 */
router.post('/', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CreateGameSchema.parse(req.body);
    const game = await GameService.createGame(validatedData);

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: {
        game
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
        message: firstIssue?.message || 'Invalid game data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_GAME',
          message: error.message
        });
      }

      if (error.message.includes('cannot be greater than')) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PLAYER_COUNT',
          message: error.message
        });
      }
    }

    logError('Create game endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/games',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create game'
    });
  }
});

/**
 * @route PUT /games/:id
 * @desc Update a game
 * @access Admin
 */
router.put('/:id', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    const validatedData = UpdateGameSchema.parse(req.body);
    const game = await GameService.updateGame(gameId, validatedData);

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: {
        game
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
        message: firstIssue?.message || 'Invalid game data',
        field: firstIssue?.path?.join('.') || 'unknown'
      });
    }

    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({
        success: false,
        error: 'GAME_NOT_FOUND',
        message: 'Game not found'
      });
    }

    logError('Update game endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/games/${req.params.id}`,
      gameId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update game'
    });
  }
});

/**
 * @route DELETE /games/:id
 * @desc Delete a game (soft delete)
 * @access Admin
 */
router.delete('/:id', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    await GameService.deleteGame(gameId);

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({
        success: false,
        error: 'GAME_NOT_FOUND',
        message: 'Game not found'
      });
    }

    logError('Delete game endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/games/${req.params.id}`,
      gameId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete game'
    });
  }
});

/**
 * @route GET /games/bgg/search
 * @desc Search BoardGameGeek for games
 * @access Public
 */
router.get('/bgg/search', async (req: Request, res: Response) => {
  try {
    const { query, exact } = req.query as { query?: string; exact?: string };
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QUERY',
        message: 'Query must be at least 2 characters long'
      });
    }

    const result = await GameService.searchBGG(query.trim(), exact === 'true');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('BGG search endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/games/bgg/search',
      query: req.query.query
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to search BoardGameGeek'
    });
  }
});

/**
 * @route GET /games/bgg/:bggId
 * @desc Get BGG game details by BGG ID
 * @access Public
 */
router.get('/bgg/:bggId', async (req: Request, res: Response) => {
  try {
    const bggId = parseInt(req.params.bggId);
    
    if (isNaN(bggId) || bggId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_BGG_ID',
        message: 'Invalid BoardGameGeek ID'
      });
    }

    const result = await GameService.getBGGGameById(bggId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'BGG_GAME_NOT_FOUND',
        message: 'Game not found on BoardGameGeek'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('BGG game details endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/games/bgg/${req.params.bggId}`,
      bggId: req.params.bggId
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get BoardGameGeek game details'
    });
  }
});

/**
 * @route POST /games/:id/bgg/refresh
 * @desc Refresh BGG rating data for a game
 * @access Admin
 */
router.post('/:id/bgg/refresh', [authenticateToken, requireAdmin], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gameId = req.params.id;
    
    if (!gameId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid game ID format'
      });
    }

    const updatedGame = await GameService.refreshBGGRating(gameId);

    res.json({
      success: true,
      data: updatedGame,
      message: 'BGG rating refreshed successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({
        success: false,
        error: 'GAME_NOT_FOUND',
        message: 'Game not found'
      });
    }

    if (error instanceof Error && error.message === 'Game has no BGG ID') {
      return res.status(400).json({
        success: false,
        error: 'NO_BGG_ID',
        message: 'Game has no BoardGameGeek ID'
      });
    }

    logError('BGG refresh endpoint error', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: `/games/${req.params.id}/bgg/refresh`,
      gameId: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to refresh BGG rating'
    });
  }
});

export default router;