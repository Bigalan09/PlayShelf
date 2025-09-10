import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database.js';
import { logError, logger } from '../utils/logger.js';
import { CollectionEntry } from '../types/database.js';
import { GameWithMetadata } from './gameService.js';

// Collection request/response schemas
export const AddToCollectionSchema = z.object({
  gameId: z.string().uuid(),
  status: z.enum(['owned', 'wishlist', 'played', 'for_trade', 'want_in_trade']).default('owned'),
  purchasePrice: z.number().min(0).optional(),
  purchaseDate: z.coerce.date().optional(),
  condition: z.enum(['mint', 'excellent', 'good', 'fair', 'poor']).optional(),
  notes: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateCollectionEntrySchema = AddToCollectionSchema.partial();

export const CollectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['owned', 'wishlist', 'played', 'for_trade', 'want_in_trade']).optional(),
  search: z.string().optional(),
  category: z.string().uuid().optional(),
  mechanism: z.string().uuid().optional(),
  publisher: z.string().uuid().optional(),
  designer: z.string().uuid().optional(),
  condition: z.enum(['mint', 'excellent', 'good', 'fair', 'poor']).optional(),
  sortBy: z.enum(['title', 'purchase_date', 'created_at', 'average_rating']).default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type AddToCollectionRequest = z.infer<typeof AddToCollectionSchema>;
export type UpdateCollectionEntryRequest = z.infer<typeof UpdateCollectionEntrySchema>;
export type CollectionQuery = z.infer<typeof CollectionQuerySchema>;

export interface CollectionEntryWithGame extends Omit<CollectionEntry, 'createdAt' | 'updatedAt'> {
  game: GameWithMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionQueryResult {
  entries: CollectionEntryWithGame[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    totalOwned: number;
    totalWishlist: number;
    totalPlayed: number;
    totalForTrade: number;
    totalWantInTrade: number;
    totalValue: number;
  };
}

export interface UserListSchema {
  name: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
  isPublic: z.ZodDefault<z.ZodBoolean>;
}

export const CreateListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateListSchema = CreateListSchema.partial();

export const AddGameToListSchema = z.object({
  gameId: z.string().uuid(),
});

export type CreateListRequest = z.infer<typeof CreateListSchema>;
export type UpdateListRequest = z.infer<typeof UpdateListSchema>;
export type AddGameToListRequest = z.infer<typeof AddGameToListSchema>;

export interface UserList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  gameCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListWithGames extends UserList {
  games: GameWithMetadata[];
}

export class CollectionService {
  /**
   * Add game to user collection
   */
  static async addToCollection(userId: string, collectionData: AddToCollectionRequest): Promise<CollectionEntryWithGame> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if game exists
      const gameCheck = await client.query(
        'SELECT id FROM games WHERE id = $1 AND is_active = true',
        [collectionData.gameId]
      );

      if (gameCheck.rows.length === 0) {
        throw new Error('Game not found');
      }

      // Check if entry already exists for this user, game, and status
      const existingEntry = await client.query(
        'SELECT id FROM collection_entries WHERE user_id = $1 AND game_id = $2 AND status = $3',
        [userId, collectionData.gameId, collectionData.status]
      );

      if (existingEntry.rows.length > 0) {
        throw new Error(`Game already exists in your ${collectionData.status} collection`);
      }

      // Create collection entry
      const entryId = uuidv4();
      const entryResult = await client.query(`
        INSERT INTO collection_entries (
          id, user_id, game_id, status, purchase_price, purchase_date,
          condition, notes, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          entryId,
          userId,
          collectionData.gameId,
          collectionData.status,
          collectionData.purchasePrice || null,
          collectionData.purchaseDate || null,
          collectionData.condition || null,
          collectionData.notes || null,
          collectionData.isPublic,
        ]
      );

      // Create activity log
      await client.query(`
        INSERT INTO activities (user_id, type, entity_type, entity_id, metadata)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          collectionData.status === 'wishlist' ? 'wishlist_added' : 'game_added',
          'game',
          collectionData.gameId,
          { status: collectionData.status }
        ]
      );

      await client.query('COMMIT');

      // Fetch complete entry with game data
      const entryWithGame = await this.getCollectionEntryById(entryId, userId);
      
      logger.info('Game added to collection', { 
        userId, 
        gameId: collectionData.gameId, 
        status: collectionData.status 
      });
      
      return entryWithGame;

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'Game not found' || 
        error.message.includes('already exists')
      )) {
        throw error;
      }
      
      logError('Failed to add game to collection', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        gameId: collectionData.gameId
      });
      throw new Error('Failed to add game to collection');
    } finally {
      client.release();
    }
  }

  /**
   * Remove game from collection
   */
  static async removeFromCollection(userId: string, gameId: string, status: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        DELETE FROM collection_entries 
        WHERE user_id = $1 AND game_id = $2 AND status = $3
        RETURNING game_id, status`,
        [userId, gameId, status]
      );

      if (result.rows.length === 0) {
        throw new Error('Collection entry not found');
      }

      // Create activity log
      await client.query(`
        INSERT INTO activities (user_id, type, entity_type, entity_id, metadata)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'game_removed',
          'game',
          gameId,
          { status: result.rows[0].status }
        ]
      );

      await client.query('COMMIT');
      
      logger.info('Game removed from collection', { userId, gameId, status });

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && error.message === 'Collection entry not found') {
        throw error;
      }
      
      logError('Failed to remove game from collection', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        gameId,
        status
      });
      throw new Error('Failed to remove game from collection');
    } finally {
      client.release();
    }
  }

  /**
   * Update collection entry
   */
  static async updateCollectionEntry(
    userId: string, 
    gameId: string, 
    status: string,
    updates: UpdateCollectionEntryRequest
  ): Promise<CollectionEntryWithGame> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if entry exists
      const existingEntry = await client.query(
        'SELECT id FROM collection_entries WHERE user_id = $1 AND game_id = $2 AND status = $3',
        [userId, gameId, status]
      );

      if (existingEntry.rows.length === 0) {
        throw new Error('Collection entry not found');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.purchasePrice !== undefined) {
        updateFields.push(`purchase_price = $${paramIndex}`);
        updateValues.push(updates.purchasePrice);
        paramIndex++;
      }

      if (updates.purchaseDate !== undefined) {
        updateFields.push(`purchase_date = $${paramIndex}`);
        updateValues.push(updates.purchaseDate);
        paramIndex++;
      }

      if (updates.condition !== undefined) {
        updateFields.push(`condition = $${paramIndex}`);
        updateValues.push(updates.condition);
        paramIndex++;
      }

      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(updates.notes);
        paramIndex++;
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex}`);
        updateValues.push(updates.isPublic);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateValues.push(userId, gameId, status);
        await client.query(`
          UPDATE collection_entries 
          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${paramIndex} AND game_id = $${paramIndex + 1} AND status = $${paramIndex + 2}
        `, updateValues);

        // Create activity log
        await client.query(`
          INSERT INTO activities (user_id, type, entity_type, entity_id, metadata)
          VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            'collection_updated',
            'game',
            gameId,
            { status, updates }
          ]
        );
      }

      await client.query('COMMIT');

      // Fetch updated entry
      const updatedEntry = await this.getCollectionEntryByGame(userId, gameId, status);
      
      logger.info('Collection entry updated', { userId, gameId, status });
      
      return updatedEntry;

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && error.message === 'Collection entry not found') {
        throw error;
      }
      
      logError('Failed to update collection entry', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        gameId,
        status
      });
      throw new Error('Failed to update collection entry');
    } finally {
      client.release();
    }
  }

  /**
   * Get user's collection with filtering and pagination
   */
  static async getUserCollection(userId: string, query: CollectionQuery): Promise<CollectionQueryResult> {
    try {
      const { page, limit, status, search, sortBy, sortOrder } = query;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = ['ce.user_id = $1', 'g.is_active = true'];
      const queryParams: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`ce.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

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

      if (query.condition) {
        whereConditions.push(`ce.condition = $${paramIndex}`);
        queryParams.push(query.condition);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM collection_entries ce
        JOIN games g ON ce.game_id = g.id
        WHERE ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get collection entries with game data
      const sortColumn = sortBy === 'title' ? 'g.title' : 
                        sortBy === 'average_rating' ? 'g.average_rating' :
                        `ce.${sortBy}`;

      const entriesResult = await db.query(`
        SELECT ce.*, g.*,
               ce.created_at as entry_created_at, ce.updated_at as entry_updated_at,
               g.created_at as game_created_at, g.updated_at as game_updated_at
        FROM collection_entries ce
        JOIN games g ON ce.game_id = g.id
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Fetch game metadata for each entry
      const entries: CollectionEntryWithGame[] = await Promise.all(
        entriesResult.rows.map(async (row: any) => {
          const [categories, mechanisms, publishers, designers] = await Promise.all([
            this.getGameCategories(row.game_id),
            this.getGameMechanisms(row.game_id),
            this.getGamePublishers(row.game_id),
            this.getGameDesigners(row.game_id),
          ]);

          return {
            id: row.id,
            userId: row.user_id,
            gameId: row.game_id,
            status: row.status,
            purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
            purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
            condition: row.condition,
            notes: row.notes,
            isPublic: row.is_public,
            createdAt: new Date(row.entry_created_at),
            updatedAt: new Date(row.entry_updated_at),
            game: {
              id: row.game_id,
              title: row.title,
              description: row.description,
              yearPublished: row.year_published,
              minPlayers: row.min_players,
              maxPlayers: row.max_players,
              playingTime: row.playing_time,
              minAge: row.min_age,
              complexity: row.complexity,
              imageUrl: row.image_url,
              thumbnailUrl: row.thumbnail_url,
              bggId: row.bgg_id,
              averageRating: parseFloat(row.average_rating) || 0,
              ratingCount: row.rating_count || 0,
              isActive: row.is_active,
              categories,
              mechanisms,
              publishers,
              designers,
              createdAt: new Date(row.game_created_at),
              updatedAt: new Date(row.game_updated_at),
            },
          };
        })
      );

      // Get collection statistics
      const statistics = await this.getCollectionStatistics(userId);

      return {
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        statistics,
      };

    } catch (error) {
      logError('Failed to get user collection', error instanceof Error ? error : new Error('Unknown error'), {
        userId
      });
      throw new Error('Failed to retrieve collection');
    }
  }

  /**
   * Get collection statistics for a user
   */
  static async getCollectionStatistics(userId: string) {
    try {
      const result = await db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(purchase_price), 0) as total_value
        FROM collection_entries 
        WHERE user_id = $1 
        GROUP BY status
      `, [userId]);

      const stats = {
        totalOwned: 0,
        totalWishlist: 0,
        totalPlayed: 0,
        totalForTrade: 0,
        totalWantInTrade: 0,
        totalValue: 0,
      };

      result.rows.forEach((row: any) => {
        const count = parseInt(row.count);
        const value = parseFloat(row.total_value) || 0;

        switch (row.status) {
          case 'owned':
            stats.totalOwned = count;
            stats.totalValue += value;
            break;
          case 'wishlist':
            stats.totalWishlist = count;
            break;
          case 'played':
            stats.totalPlayed = count;
            break;
          case 'for_trade':
            stats.totalForTrade = count;
            break;
          case 'want_in_trade':
            stats.totalWantInTrade = count;
            break;
        }
      });

      return stats;
    } catch (error) {
      logError('Failed to get collection statistics', error instanceof Error ? error : new Error('Unknown error'), {
        userId
      });
      return {
        totalOwned: 0,
        totalWishlist: 0,
        totalPlayed: 0,
        totalForTrade: 0,
        totalWantInTrade: 0,
        totalValue: 0,
      };
    }
  }

  // User Lists functionality
  /**
   * Create a custom user list
   */
  static async createUserList(userId: string, listData: CreateListRequest): Promise<UserList> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if list name already exists for user
      const existingList = await client.query(
        'SELECT id FROM user_lists WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
        [userId, listData.name]
      );

      if (existingList.rows.length > 0) {
        throw new Error('A list with this name already exists');
      }

      // Create list
      const listId = uuidv4();
      const listResult = await client.query(`
        INSERT INTO user_lists (id, user_id, name, description, is_public)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [listId, userId, listData.name, listData.description || null, listData.isPublic]
      );

      await client.query('COMMIT');

      const list = listResult.rows[0];
      
      logger.info('User list created', { userId, listId, name: listData.name });

      return {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        gameCount: 0,
        createdAt: new Date(list.created_at),
        updatedAt: new Date(list.updated_at),
      };

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && error.message === 'A list with this name already exists') {
        throw error;
      }
      
      logError('Failed to create user list', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        name: listData.name
      });
      throw new Error('Failed to create list');
    } finally {
      client.release();
    }
  }

  /**
   * Get user's lists
   */
  static async getUserLists(userId: string): Promise<UserList[]> {
    try {
      const result = await db.query(`
        SELECT ul.*, 
               COALESCE(COUNT(ulg.game_id), 0) as game_count
        FROM user_lists ul
        LEFT JOIN user_list_games ulg ON ul.id = ulg.list_id
        WHERE ul.user_id = $1
        GROUP BY ul.id, ul.user_id, ul.name, ul.description, ul.is_public, ul.created_at, ul.updated_at
        ORDER BY ul.created_at DESC
      `, [userId]);

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        isPublic: row.is_public,
        gameCount: parseInt(row.game_count),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      logError('Failed to get user lists', error instanceof Error ? error : new Error('Unknown error'), {
        userId
      });
      throw new Error('Failed to retrieve lists');
    }
  }

  /**
   * Get list by ID with games
   */
  static async getListById(listId: string, requestingUserId?: string): Promise<ListWithGames> {
    try {
      // Get list info
      const listResult = await db.query(`
        SELECT ul.*, 
               COALESCE(COUNT(ulg.game_id), 0) as game_count
        FROM user_lists ul
        LEFT JOIN user_list_games ulg ON ul.id = ulg.list_id
        WHERE ul.id = $1
        GROUP BY ul.id, ul.user_id, ul.name, ul.description, ul.is_public, ul.created_at, ul.updated_at
      `, [listId]);

      if (listResult.rows.length === 0) {
        throw new Error('List not found');
      }

      const list = listResult.rows[0];

      // Check if requesting user can access this list
      if (!list.is_public && list.user_id !== requestingUserId) {
        throw new Error('List not found');
      }

      // Get games in the list
      const gamesResult = await db.query(`
        SELECT g.*, ulg.added_at
        FROM games g
        JOIN user_list_games ulg ON g.id = ulg.game_id
        WHERE ulg.list_id = $1 AND g.is_active = true
        ORDER BY ulg.added_at DESC
      `, [listId]);

      // Fetch game metadata
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
            createdAt: new Date(game.created_at),
            updatedAt: new Date(game.updated_at),
          };
        })
      );

      return {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        gameCount: games.length,
        createdAt: new Date(list.created_at),
        updatedAt: new Date(list.updated_at),
        games,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'List not found') {
        throw error;
      }
      
      logError('Failed to get list by ID', error instanceof Error ? error : new Error('Unknown error'), {
        listId,
        requestingUserId
      });
      throw new Error('Failed to retrieve list');
    }
  }

  /**
   * Update user list
   */
  static async updateUserList(userId: string, listId: string, updates: UpdateListRequest): Promise<UserList> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if list exists and belongs to user
      const existingList = await client.query(
        'SELECT id FROM user_lists WHERE id = $1 AND user_id = $2',
        [listId, userId]
      );

      if (existingList.rows.length === 0) {
        throw new Error('List not found');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        // Check for duplicate name
        const duplicateCheck = await client.query(
          'SELECT id FROM user_lists WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
          [userId, updates.name, listId]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error('A list with this name already exists');
        }

        updateFields.push(`name = $${paramIndex}`);
        updateValues.push(updates.name);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(updates.description);
        paramIndex++;
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex}`);
        updateValues.push(updates.isPublic);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        // No changes, return existing list
        const listWithGames = await this.getListById(listId, userId);
        return listWithGames;
      }

      updateValues.push(listId);
      
      const result = await client.query(`
        UPDATE user_lists 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *`,
        updateValues
      );

      await client.query('COMMIT');

      const list = result.rows[0];
      
      logger.info('User list updated', { userId, listId });

      return {
        id: list.id,
        userId: list.user_id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        gameCount: 0, // Will be updated when fetched with games
        createdAt: new Date(list.created_at),
        updatedAt: new Date(list.updated_at),
      };

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'List not found' || 
        error.message.includes('already exists')
      )) {
        throw error;
      }
      
      logError('Failed to update user list', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        listId
      });
      throw new Error('Failed to update list');
    } finally {
      client.release();
    }
  }

  /**
   * Delete user list
   */
  static async deleteUserList(userId: string, listId: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        DELETE FROM user_lists 
        WHERE id = $1 AND user_id = $2
        RETURNING name`,
        [listId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('List not found');
      }

      await client.query('COMMIT');
      
      logger.info('User list deleted', { userId, listId, name: result.rows[0].name });

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && error.message === 'List not found') {
        throw error;
      }
      
      logError('Failed to delete user list', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        listId
      });
      throw new Error('Failed to delete list');
    } finally {
      client.release();
    }
  }

  /**
   * Add game to user list
   */
  static async addGameToList(userId: string, listId: string, gameData: AddGameToListRequest): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if list exists and belongs to user
      const listCheck = await client.query(
        'SELECT id FROM user_lists WHERE id = $1 AND user_id = $2',
        [listId, userId]
      );

      if (listCheck.rows.length === 0) {
        throw new Error('List not found');
      }

      // Check if game exists
      const gameCheck = await client.query(
        'SELECT id FROM games WHERE id = $1 AND is_active = true',
        [gameData.gameId]
      );

      if (gameCheck.rows.length === 0) {
        throw new Error('Game not found');
      }

      // Check if game is already in list
      const existingEntry = await client.query(
        'SELECT list_id FROM user_list_games WHERE list_id = $1 AND game_id = $2',
        [listId, gameData.gameId]
      );

      if (existingEntry.rows.length > 0) {
        throw new Error('Game is already in this list');
      }

      // Add game to list
      await client.query(`
        INSERT INTO user_list_games (list_id, game_id)
        VALUES ($1, $2)`,
        [listId, gameData.gameId]
      );

      await client.query('COMMIT');
      
      logger.info('Game added to user list', { userId, listId, gameId: gameData.gameId });

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'List not found' ||
        error.message === 'Game not found' ||
        error.message.includes('already in this list')
      )) {
        throw error;
      }
      
      logError('Failed to add game to list', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        listId,
        gameId: gameData.gameId
      });
      throw new Error('Failed to add game to list');
    } finally {
      client.release();
    }
  }

  /**
   * Remove game from user list
   */
  static async removeGameFromList(userId: string, listId: string, gameId: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if list exists and belongs to user
      const listCheck = await client.query(
        'SELECT id FROM user_lists WHERE id = $1 AND user_id = $2',
        [listId, userId]
      );

      if (listCheck.rows.length === 0) {
        throw new Error('List not found');
      }

      const result = await client.query(`
        DELETE FROM user_list_games 
        WHERE list_id = $1 AND game_id = $2`,
        [listId, gameId]
      );

      if (result.rowCount === 0) {
        throw new Error('Game not found in list');
      }

      await client.query('COMMIT');
      
      logger.info('Game removed from user list', { userId, listId, gameId });

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'List not found' ||
        error.message === 'Game not found in list'
      )) {
        throw error;
      }
      
      logError('Failed to remove game from list', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        listId,
        gameId
      });
      throw new Error('Failed to remove game from list');
    } finally {
      client.release();
    }
  }

  // Helper methods
  private static async getCollectionEntryById(entryId: string, userId: string): Promise<CollectionEntryWithGame> {
    // Implementation similar to getting single entry with game data
    const result = await db.query(`
      SELECT ce.*, g.*,
             ce.created_at as entry_created_at, ce.updated_at as entry_updated_at,
             g.created_at as game_created_at, g.updated_at as game_updated_at
      FROM collection_entries ce
      JOIN games g ON ce.game_id = g.id
      WHERE ce.id = $1 AND ce.user_id = $2
    `, [entryId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Collection entry not found');
    }

    const row = result.rows[0];
    const [categories, mechanisms, publishers, designers] = await Promise.all([
      this.getGameCategories(row.game_id),
      this.getGameMechanisms(row.game_id),
      this.getGamePublishers(row.game_id),
      this.getGameDesigners(row.game_id),
    ]);

    return {
      id: row.id,
      userId: row.user_id,
      gameId: row.game_id,
      status: row.status,
      purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
      purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
      condition: row.condition,
      notes: row.notes,
      isPublic: row.is_public,
      createdAt: new Date(row.entry_created_at),
      updatedAt: new Date(row.entry_updated_at),
      game: {
        id: row.game_id,
        title: row.title,
        description: row.description,
        yearPublished: row.year_published,
        minPlayers: row.min_players,
        maxPlayers: row.max_players,
        playingTime: row.playing_time,
        minAge: row.min_age,
        complexity: row.complexity,
        imageUrl: row.image_url,
        thumbnailUrl: row.thumbnail_url,
        bggId: row.bgg_id,
        averageRating: parseFloat(row.average_rating) || 0,
        ratingCount: row.rating_count || 0,
        isActive: row.is_active,
        categories,
        mechanisms,
        publishers,
        designers,
        createdAt: new Date(row.game_created_at),
        updatedAt: new Date(row.game_updated_at),
      },
    };
  }

  private static async getCollectionEntryByGame(userId: string, gameId: string, status: string): Promise<CollectionEntryWithGame> {
    const result = await db.query(`
      SELECT ce.*, g.*,
             ce.created_at as entry_created_at, ce.updated_at as entry_updated_at,
             g.created_at as game_created_at, g.updated_at as game_updated_at
      FROM collection_entries ce
      JOIN games g ON ce.game_id = g.id
      WHERE ce.user_id = $1 AND ce.game_id = $2 AND ce.status = $3
    `, [userId, gameId, status]);

    if (result.rows.length === 0) {
      throw new Error('Collection entry not found');
    }

    const row = result.rows[0];
    const [categories, mechanisms, publishers, designers] = await Promise.all([
      this.getGameCategories(row.game_id),
      this.getGameMechanisms(row.game_id),
      this.getGamePublishers(row.game_id),
      this.getGameDesigners(row.game_id),
    ]);

    return {
      id: row.id,
      userId: row.user_id,
      gameId: row.game_id,
      status: row.status,
      purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
      purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
      condition: row.condition,
      notes: row.notes,
      isPublic: row.is_public,
      createdAt: new Date(row.entry_created_at),
      updatedAt: new Date(row.entry_updated_at),
      game: {
        id: row.game_id,
        title: row.title,
        description: row.description,
        yearPublished: row.year_published,
        minPlayers: row.min_players,
        maxPlayers: row.max_players,
        playingTime: row.playing_time,
        minAge: row.min_age,
        complexity: row.complexity,
        imageUrl: row.image_url,
        thumbnailUrl: row.thumbnail_url,
        bggId: row.bgg_id,
        averageRating: parseFloat(row.average_rating) || 0,
        ratingCount: row.rating_count || 0,
        isActive: row.is_active,
        categories,
        mechanisms,
        publishers,
        designers,
        createdAt: new Date(row.game_created_at),
        updatedAt: new Date(row.game_updated_at),
      },
    };
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
}