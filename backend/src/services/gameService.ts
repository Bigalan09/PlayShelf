import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database.js';
import { logError, logger } from '../utils/logger.js';
import { Game, GameSchema } from '../types/database.js';
import { BGGService } from './bggService.js';

// Game request/response schemas
export const CreateGameSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  yearPublished: z.number().int().min(1900).max(2100).optional(),
  minPlayers: z.number().int().min(1).optional(),
  maxPlayers: z.number().int().min(1).optional(),
  playingTime: z.number().int().min(1).optional(),
  minAge: z.number().int().min(0).optional(),
  complexity: z.number().min(1).max(5).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  bggId: z.number().int().optional(),
  categories: z.array(z.string().uuid()).optional(),
  mechanisms: z.array(z.string().uuid()).optional(),
  publishers: z.array(z.string().uuid()).optional(),
  designers: z.array(z.string().uuid()).optional(),
});

export const UpdateGameSchema = CreateGameSchema.partial();

export const GameQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().uuid().optional(),
  mechanism: z.string().uuid().optional(),
  publisher: z.string().uuid().optional(),
  designer: z.string().uuid().optional(),
  minPlayers: z.coerce.number().int().min(1).optional(),
  maxPlayers: z.coerce.number().int().min(1).optional(),
  complexity: z.coerce.number().min(1).max(5).optional(),
  yearPublished: z.coerce.number().int().min(1900).max(2100).optional(),
  sortBy: z.enum(['title', 'year_published', 'average_rating', 'created_at']).default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateGameRequest = z.infer<typeof CreateGameSchema>;
export type UpdateGameRequest = z.infer<typeof UpdateGameSchema>;
export type GameQuery = z.infer<typeof GameQuerySchema>;

export interface GameWithMetadata extends Omit<Game, 'createdAt' | 'updatedAt'> {
  categories: Array<{ id: string; name: string; slug: string; color?: string }>;
  mechanisms: Array<{ id: string; name: string; slug: string }>;
  publishers: Array<{ id: string; name: string; slug: string; website?: string }>;
  designers: Array<{ id: string; name: string; slug: string; website?: string }>;
  bggUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameQueryResult {
  games: GameWithMetadata[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class GameService {
  /**
   * Create a new game
   */
  static async createGame(gameData: CreateGameRequest): Promise<GameWithMetadata> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if game with same title and year already exists
      if (gameData.yearPublished) {
        const existingGame = await client.query(
          'SELECT id FROM games WHERE LOWER(title) = LOWER($1) AND year_published = $2',
          [gameData.title, gameData.yearPublished]
        );

        if (existingGame.rows.length > 0) {
          throw new Error('Game with this title and year already exists');
        }
      }

      // Check if BGG ID already exists
      if (gameData.bggId) {
        const existingBggGame = await client.query(
          'SELECT id FROM games WHERE bgg_id = $1',
          [gameData.bggId]
        );

        if (existingBggGame.rows.length > 0) {
          throw new Error('Game with this BoardGameGeek ID already exists');
        }
      }

      // Validate player count constraint
      if (gameData.minPlayers && gameData.maxPlayers && gameData.minPlayers > gameData.maxPlayers) {
        throw new Error('Minimum players cannot be greater than maximum players');
      }

      // Create game
      const gameId = uuidv4();
      const gameResult = await client.query(`
        INSERT INTO games (
          id, title, description, year_published, min_players, max_players,
          playing_time, min_age, complexity, image_url, thumbnail_url, bgg_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          gameId,
          gameData.title,
          gameData.description || null,
          gameData.yearPublished || null,
          gameData.minPlayers || null,
          gameData.maxPlayers || null,
          gameData.playingTime || null,
          gameData.minAge || null,
          gameData.complexity || null,
          gameData.imageUrl || null,
          gameData.thumbnailUrl || null,
          gameData.bggId || null,
        ]
      );

      const game = gameResult.rows[0];

      // Import BGG rating if BGG ID is provided
      if (gameData.bggId) {
        await this.importBGGRating(client, gameId, gameData.bggId);
      }

      // Add relationships
      if (gameData.categories?.length) {
        await this.addGameRelationships(client, gameId, 'categories', gameData.categories);
      }
      if (gameData.mechanisms?.length) {
        await this.addGameRelationships(client, gameId, 'mechanisms', gameData.mechanisms);
      }
      if (gameData.publishers?.length) {
        await this.addGameRelationships(client, gameId, 'publishers', gameData.publishers);
      }
      if (gameData.designers?.length) {
        await this.addGameRelationships(client, gameId, 'designers', gameData.designers);
      }

      await client.query('COMMIT');

      // Fetch complete game with metadata
      const gameWithMetadata = await this.getGameById(gameId);
      
      logger.info('Game created successfully', { gameId, title: gameData.title });
      
      return gameWithMetadata;

    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to create game', error instanceof Error ? error : new Error('Unknown error'), {
        title: gameData.title
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get game by ID with metadata
   */
  static async getGameById(gameId: string): Promise<GameWithMetadata> {
    try {
      const gameResult = await db.query(`
        SELECT * FROM games WHERE id = $1 AND is_active = true
      `, [gameId]);

      if (gameResult.rows.length === 0) {
        throw new Error('Game not found');
      }

      const game = gameResult.rows[0];

      // Fetch metadata
      const [categories, mechanisms, publishers, designers] = await Promise.all([
        this.getGameCategories(gameId),
        this.getGameMechanisms(gameId),
        this.getGamePublishers(gameId),
        this.getGameDesigners(gameId),
      ]);

      return {
        id: game.id,
        title: game.title,
        description: game.description,
        yearPublished: game.year_published,
        minPlayers: game.min_players,
        maxPlayers: game.max_players,
        playingTime: game.playing_time,
        minAge: game.min_age,
        complexity: game.complexity,
        imageUrl: game.image_url,
        thumbnailUrl: game.thumbnail_url,
        bggId: game.bgg_id,
        averageRating: parseFloat(game.average_rating) || 0,
        ratingCount: game.rating_count || 0,
        isActive: game.is_active,
        categories,
        mechanisms,
        publishers,
        designers,
        bggUrl: game.bgg_id ? BGGService.generateGameURL(game.bgg_id, game.title) : undefined,
        createdAt: new Date(game.created_at),
        updatedAt: new Date(game.updated_at),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Game not found') {
        throw error;
      }
      
      logError('Failed to get game by ID', error instanceof Error ? error : new Error('Unknown error'), {
        gameId
      });
      throw new Error('Failed to retrieve game');
    }
  }

  /**
   * Update game
   */
  static async updateGame(gameId: string, updates: UpdateGameRequest): Promise<GameWithMetadata> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if game exists
      const existingGame = await client.query(
        'SELECT id FROM games WHERE id = $1 AND is_active = true',
        [gameId]
      );

      if (existingGame.rows.length === 0) {
        throw new Error('Game not found');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(updates.title);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(updates.description);
        paramIndex++;
      }

      if (updates.yearPublished !== undefined) {
        updateFields.push(`year_published = $${paramIndex}`);
        updateValues.push(updates.yearPublished);
        paramIndex++;
      }

      if (updates.minPlayers !== undefined) {
        updateFields.push(`min_players = $${paramIndex}`);
        updateValues.push(updates.minPlayers);
        paramIndex++;
      }

      if (updates.maxPlayers !== undefined) {
        updateFields.push(`max_players = $${paramIndex}`);
        updateValues.push(updates.maxPlayers);
        paramIndex++;
      }

      if (updates.playingTime !== undefined) {
        updateFields.push(`playing_time = $${paramIndex}`);
        updateValues.push(updates.playingTime);
        paramIndex++;
      }

      if (updates.minAge !== undefined) {
        updateFields.push(`min_age = $${paramIndex}`);
        updateValues.push(updates.minAge);
        paramIndex++;
      }

      if (updates.complexity !== undefined) {
        updateFields.push(`complexity = $${paramIndex}`);
        updateValues.push(updates.complexity);
        paramIndex++;
      }

      if (updates.imageUrl !== undefined) {
        updateFields.push(`image_url = $${paramIndex}`);
        updateValues.push(updates.imageUrl);
        paramIndex++;
      }

      if (updates.thumbnailUrl !== undefined) {
        updateFields.push(`thumbnail_url = $${paramIndex}`);
        updateValues.push(updates.thumbnailUrl);
        paramIndex++;
      }

      if (updates.bggId !== undefined) {
        updateFields.push(`bgg_id = $${paramIndex}`);
        updateValues.push(updates.bggId);
        paramIndex++;
      }

      // Update game basic info if there are changes
      if (updateFields.length > 0) {
        updateValues.push(gameId);
        await client.query(`
          UPDATE games 
          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
        `, updateValues);
      }

      // Import BGG rating if BGG ID was updated
      if (updates.bggId !== undefined && updates.bggId) {
        await this.importBGGRating(client, gameId, updates.bggId);
      }

      // Update relationships if provided
      if (updates.categories !== undefined) {
        await this.updateGameRelationships(client, gameId, 'categories', updates.categories);
      }
      if (updates.mechanisms !== undefined) {
        await this.updateGameRelationships(client, gameId, 'mechanisms', updates.mechanisms);
      }
      if (updates.publishers !== undefined) {
        await this.updateGameRelationships(client, gameId, 'publishers', updates.publishers);
      }
      if (updates.designers !== undefined) {
        await this.updateGameRelationships(client, gameId, 'designers', updates.designers);
      }

      await client.query('COMMIT');

      // Fetch updated game
      const updatedGame = await this.getGameById(gameId);
      
      logger.info('Game updated successfully', { gameId });
      
      return updatedGame;

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && error.message === 'Game not found') {
        throw error;
      }
      
      logError('Failed to update game', error instanceof Error ? error : new Error('Unknown error'), {
        gameId
      });
      throw new Error('Failed to update game');
    } finally {
      client.release();
    }
  }

  /**
   * Delete game (soft delete)
   */
  static async deleteGame(gameId: string): Promise<void> {
    try {
      const result = await db.query(`
        UPDATE games 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
        RETURNING title
      `, [gameId]);

      if (result.rows.length === 0) {
        throw new Error('Game not found');
      }

      logger.info('Game deleted successfully', { gameId, title: result.rows[0].title });
    } catch (error) {
      if (error instanceof Error && error.message === 'Game not found') {
        throw error;
      }
      
      logError('Failed to delete game', error instanceof Error ? error : new Error('Unknown error'), {
        gameId
      });
      throw new Error('Failed to delete game');
    }
  }

  /**
   * Search games with filters and pagination
   */
  static async searchGames(query: GameQuery): Promise<GameQueryResult> {
    try {
      const { page, limit, search, sortBy, sortOrder } = query;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = ['g.is_active = true'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(LOWER(g.title) LIKE LOWER($${paramIndex}) OR LOWER(g.description) LIKE LOWER($${paramIndex}))`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (query.category) {
        whereConditions.push(`g.id IN (
          SELECT gc.game_id FROM game_categories gc WHERE gc.category_id = $${paramIndex}
        )`);
        queryParams.push(query.category);
        paramIndex++;
      }

      if (query.mechanism) {
        whereConditions.push(`g.id IN (
          SELECT gm.game_id FROM game_mechanisms gm WHERE gm.mechanism_id = $${paramIndex}
        )`);
        queryParams.push(query.mechanism);
        paramIndex++;
      }

      if (query.publisher) {
        whereConditions.push(`g.id IN (
          SELECT gp.game_id FROM game_publishers gp WHERE gp.publisher_id = $${paramIndex}
        )`);
        queryParams.push(query.publisher);
        paramIndex++;
      }

      if (query.designer) {
        whereConditions.push(`g.id IN (
          SELECT gd.game_id FROM game_designers gd WHERE gd.designer_id = $${paramIndex}
        )`);
        queryParams.push(query.designer);
        paramIndex++;
      }

      if (query.minPlayers) {
        whereConditions.push(`(g.max_players IS NULL OR g.max_players >= $${paramIndex})`);
        queryParams.push(query.minPlayers);
        paramIndex++;
      }

      if (query.maxPlayers) {
        whereConditions.push(`(g.min_players IS NULL OR g.min_players <= $${paramIndex})`);
        queryParams.push(query.maxPlayers);
        paramIndex++;
      }

      if (query.complexity) {
        whereConditions.push(`g.complexity = $${paramIndex}`);
        queryParams.push(query.complexity);
        paramIndex++;
      }

      if (query.yearPublished) {
        whereConditions.push(`g.year_published = $${paramIndex}`);
        queryParams.push(query.yearPublished);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total FROM games g WHERE ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get games
      const gamesResult = await db.query(`
        SELECT g.* FROM games g 
        WHERE ${whereClause}
        ORDER BY g.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Fetch metadata for each game
      const games: GameWithMetadata[] = await Promise.all(
        gamesResult.rows.map(async (game: any) => {
          const [categories, mechanisms, publishers, designers] = await Promise.all([
            this.getGameCategories(game.id),
            this.getGameMechanisms(game.id),
            this.getGamePublishers(game.id),
            this.getGameDesigners(game.id),
          ]);

          return {
            id: game.id,
            title: game.title,
            description: game.description,
            yearPublished: game.year_published,
            minPlayers: game.min_players,
            maxPlayers: game.max_players,
            playingTime: game.playing_time,
            minAge: game.min_age,
            complexity: game.complexity,
            imageUrl: game.image_url,
            thumbnailUrl: game.thumbnail_url,
            bggId: game.bgg_id,
            averageRating: parseFloat(game.average_rating) || 0,
            ratingCount: game.rating_count || 0,
            isActive: game.is_active,
            categories,
            mechanisms,
            publishers,
            designers,
            bggUrl: game.bgg_id ? BGGService.generateGameURL(game.bgg_id, game.title) : undefined,
            createdAt: new Date(game.created_at),
            updatedAt: new Date(game.updated_at),
          };
        })
      );

      return {
        games,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logError('Failed to search games', error instanceof Error ? error : new Error('Unknown error'), {
        query
      });
      throw new Error('Failed to search games');
    }
  }

  // Helper methods for relationships
  private static async addGameRelationships(
    client: any,
    gameId: string,
    type: 'categories' | 'mechanisms' | 'publishers' | 'designers',
    ids: string[]
  ): Promise<void> {
    const tableName = `game_${type}`;
    const columnName = type.slice(0, -1) + '_id'; // Remove 's' and add '_id'

    for (const id of ids) {
      await client.query(`
        INSERT INTO ${tableName} (game_id, ${columnName}) 
        VALUES ($1, $2)
        ON CONFLICT (game_id, ${columnName}) DO NOTHING
      `, [gameId, id]);
    }
  }

  private static async updateGameRelationships(
    client: any,
    gameId: string,
    type: 'categories' | 'mechanisms' | 'publishers' | 'designers',
    ids: string[]
  ): Promise<void> {
    const tableName = `game_${type}`;
    
    // Delete existing relationships
    await client.query(`DELETE FROM ${tableName} WHERE game_id = $1`, [gameId]);
    
    // Add new relationships
    if (ids.length > 0) {
      await this.addGameRelationships(client, gameId, type, ids);
    }
  }

  private static async getGameCategories(gameId: string) {
    const result = await db.query(`
      SELECT c.id, c.name, c.slug, c.color
      FROM categories c
      JOIN game_categories gc ON c.id = gc.category_id
      WHERE gc.game_id = $1 AND c.is_active = true
      ORDER BY c.name
    `, [gameId]);
    return result.rows;
  }

  private static async getGameMechanisms(gameId: string) {
    const result = await db.query(`
      SELECT m.id, m.name, m.slug
      FROM mechanisms m
      JOIN game_mechanisms gm ON m.id = gm.mechanism_id
      WHERE gm.game_id = $1 AND m.is_active = true
      ORDER BY m.name
    `, [gameId]);
    return result.rows;
  }

  private static async getGamePublishers(gameId: string) {
    const result = await db.query(`
      SELECT p.id, p.name, p.slug, p.website
      FROM publishers p
      JOIN game_publishers gp ON p.id = gp.publisher_id
      WHERE gp.game_id = $1 AND p.is_active = true
      ORDER BY p.name
    `, [gameId]);
    return result.rows;
  }

  private static async getGameDesigners(gameId: string) {
    const result = await db.query(`
      SELECT d.id, d.name, d.slug, d.website
      FROM designers d
      JOIN game_designers gd ON d.id = gd.designer_id
      WHERE gd.game_id = $1 AND d.is_active = true
      ORDER BY d.name
    `, [gameId]);
    return result.rows;
  }

  /**
   * Import BGG rating data for a game
   */
  private static async importBGGRating(client: any, gameId: string, bggId: number): Promise<void> {
    try {
      logger.info('Importing BGG rating', { gameId, bggId });
      
      const ratingData = await BGGService.importGameRating(bggId);
      
      if (ratingData && ratingData.averageRating > 0) {
        // Update only BGG-specific rating data, preserve local user ratings
        await client.query(`
          UPDATE games 
          SET 
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [gameId]);

        logger.info('BGG rating imported successfully', {
          gameId,
          bggId,
          bggRating: ratingData.averageRating,
          bggUsersRated: ratingData.usersRated
        });
      } else {
        logger.warn('No BGG rating data available', { gameId, bggId });
      }
    } catch (error) {
      // Don't throw error - BGG import should not block game creation/update
      logError('BGG rating import failed', error instanceof Error ? error : new Error('Unknown error'), {
        gameId,
        bggId
      });
    }
  }

  /**
   * Search BGG for games
   */
  static async searchBGG(query: string, exact = false) {
    try {
      logger.info('Searching BGG', { query, exact });
      
      const result = await BGGService.searchGames(query, exact);
      
      logger.info('BGG search completed', { 
        query, 
        resultCount: result.games.length 
      });
      
      return result;
    } catch (error) {
      logError('BGG search failed', error instanceof Error ? error : new Error('Unknown error'), {
        query,
        exact
      });
      
      // Return empty result on error
      return { games: [] };
    }
  }

  /**
   * Get BGG game details by ID
   */
  static async getBGGGameById(bggId: number) {
    try {
      logger.info('Getting BGG game details', { bggId });
      
      const result = await BGGService.getGameById(bggId);
      
      if (result) {
        logger.info('BGG game details retrieved', { 
          bggId, 
          averageRating: result.averageRating 
        });
      } else {
        logger.warn('BGG game not found', { bggId });
      }
      
      return result;
    } catch (error) {
      logError('Failed to get BGG game details', error instanceof Error ? error : new Error('Unknown error'), {
        bggId
      });
      
      return null;
    }
  }

  /**
   * Refresh BGG rating for existing game
   */
  static async refreshBGGRating(gameId: string): Promise<GameWithMetadata> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get game with BGG ID
      const gameResult = await client.query(
        'SELECT bgg_id FROM games WHERE id = $1 AND is_active = true',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error('Game not found');
      }

      const bggId = gameResult.rows[0].bgg_id;
      if (!bggId) {
        throw new Error('Game has no BGG ID');
      }

      // Import fresh BGG rating
      await this.importBGGRating(client, gameId, bggId);

      await client.query('COMMIT');

      // Return updated game
      const updatedGame = await this.getGameById(gameId);
      
      logger.info('BGG rating refreshed successfully', { gameId, bggId });
      
      return updatedGame;

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof Error && (
        error.message === 'Game not found' ||
        error.message === 'Game has no BGG ID'
      )) {
        throw error;
      }
      
      logError('Failed to refresh BGG rating', error instanceof Error ? error : new Error('Unknown error'), {
        gameId
      });
      throw new Error('Failed to refresh BGG rating');
    } finally {
      client.release();
    }
  }
}