import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../config/database.js';
import { logError, logger } from '../utils/logger.js';
import { Review, ReviewSchema } from '../types/database.js';

// Review request/response schemas
export const CreateReviewSchema = z.object({
  gameId: z.string().uuid(),
  rating: z.number().int().min(1).max(10),
  title: z.string().max(255).optional(),
  content: z.string().max(5000).optional(),
  isRecommended: z.boolean().optional(),
  playCount: z.number().int().min(1).default(1),
  difficulty: z.number().min(1).max(5).optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateReviewSchema = CreateReviewSchema.partial().omit({ gameId: true });

export const ReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  gameId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  minRating: z.coerce.number().int().min(1).max(10).optional(),
  maxRating: z.coerce.number().int().min(1).max(10).optional(),
  isRecommended: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'rating', 'helpful_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type CreateReviewRequest = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewSchema>;
export type ReviewQuery = z.infer<typeof ReviewQuerySchema>;

export interface ReviewWithDetails extends Omit<Review, 'createdAt' | 'updatedAt'> {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  game: {
    id: string;
    title: string;
    yearPublished?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recommendationRate: number;
  averageDifficulty?: number;
}

export interface ReviewQueryResult {
  reviews: ReviewWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: ReviewStats;
}

export interface UserReviewStats {
  totalReviews: number;
  averageRating: number;
  favoriteCategories: Array<{ name: string; count: number }>;
  reviewsThisMonth: number;
  helpfulVotes: number;
}

export class ReviewService {
  /**
   * Create a new review
   */
  static async createReview(userId: string, reviewData: CreateReviewRequest): Promise<ReviewWithDetails> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if game exists
      const gameResult = await client.query(
        'SELECT id, title, year_published, image_url, thumbnail_url FROM games WHERE id = $1 AND is_active = true',
        [reviewData.gameId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error('Game not found');
      }

      // Check if user already has a review for this game
      const existingReview = await client.query(
        'SELECT id FROM reviews WHERE user_id = $1 AND game_id = $2',
        [userId, reviewData.gameId]
      );

      if (existingReview.rows.length > 0) {
        throw new Error('You have already reviewed this game. Use update instead.');
      }

      // Create review
      const reviewId = uuidv4();
      const reviewResult = await client.query(`
        INSERT INTO reviews (
          id, user_id, game_id, rating, title, content, is_recommended,
          play_count, difficulty, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          reviewId,
          userId,
          reviewData.gameId,
          reviewData.rating,
          reviewData.title || null,
          reviewData.content || null,
          reviewData.isRecommended ?? null,
          reviewData.playCount,
          reviewData.difficulty || null,
          reviewData.isPublic,
        ]
      );

      const review = reviewResult.rows[0];

      // Update game's average rating
      await this.updateGameRating(client, reviewData.gameId);

      // Create activity log entry
      await client.query(`
        INSERT INTO activities (user_id, type, entity_type, entity_id, metadata, is_public)
        VALUES ($1, 'review_created', 'review', $2, $3, $4)`,
        [
          userId,
          reviewId,
          JSON.stringify({ gameId: reviewData.gameId, rating: reviewData.rating }),
          reviewData.isPublic,
        ]
      );

      await client.query('COMMIT');

      // Fetch complete review with details
      const reviewWithDetails = await this.getReviewById(reviewId);
      
      logger.info('Review created successfully', { 
        reviewId, 
        userId, 
        gameId: reviewData.gameId, 
        rating: reviewData.rating 
      });
      
      return reviewWithDetails;

    } catch (error) {
      await client.query('ROLLBACK');
      logError('Failed to create review', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        gameId: reviewData.gameId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get review by ID with user and game details
   */
  static async getReviewById(reviewId: string): Promise<ReviewWithDetails> {
    try {
      const result = await db.query(`
        SELECT 
          r.*,
          u.username, u.first_name, u.last_name, u.avatar,
          g.title, g.year_published, g.image_url, g.thumbnail_url
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN games g ON r.game_id = g.id
        WHERE r.id = $1
      `, [reviewId]);

      if (result.rows.length === 0) {
        throw new Error('Review not found');
      }

      const row = result.rows[0];
      return this.formatReviewWithDetails(row);
    } catch (error) {
      if (error instanceof Error && error.message === 'Review not found') {
        throw error;
      }
      
      logError('Failed to get review by ID', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId
      });
      throw new Error('Failed to retrieve review');
    }
  }

  /**
   * Update review
   */
  static async updateReview(
    reviewId: string, 
    userId: string, 
    updates: UpdateReviewRequest
  ): Promise<ReviewWithDetails> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if review exists and belongs to user
      const existingReview = await client.query(
        'SELECT user_id, game_id, rating FROM reviews WHERE id = $1',
        [reviewId]
      );

      if (existingReview.rows.length === 0) {
        throw new Error('Review not found');
      }

      if (existingReview.rows[0].user_id !== userId) {
        throw new Error('Not authorized to update this review');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.rating !== undefined) {
        updateFields.push(`rating = $${paramIndex}`);
        updateValues.push(updates.rating);
        paramIndex++;
      }

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(updates.title);
        paramIndex++;
      }

      if (updates.content !== undefined) {
        updateFields.push(`content = $${paramIndex}`);
        updateValues.push(updates.content);
        paramIndex++;
      }

      if (updates.isRecommended !== undefined) {
        updateFields.push(`is_recommended = $${paramIndex}`);
        updateValues.push(updates.isRecommended);
        paramIndex++;
      }

      if (updates.playCount !== undefined) {
        updateFields.push(`play_count = $${paramIndex}`);
        updateValues.push(updates.playCount);
        paramIndex++;
      }

      if (updates.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramIndex}`);
        updateValues.push(updates.difficulty);
        paramIndex++;
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex}`);
        updateValues.push(updates.isPublic);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No updates provided');
      }

      // Update review
      updateValues.push(reviewId);
      await client.query(`
        UPDATE reviews 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `, updateValues);

      // Update game rating if rating changed
      if (updates.rating !== undefined) {
        await this.updateGameRating(client, existingReview.rows[0].game_id);
      }

      // Create activity log entry
      await client.query(`
        INSERT INTO activities (user_id, type, entity_type, entity_id, metadata, is_public)
        VALUES ($1, 'review_updated', 'review', $2, $3, $4)`,
        [
          userId,
          reviewId,
          JSON.stringify({ 
            gameId: existingReview.rows[0].game_id,
            oldRating: existingReview.rows[0].rating,
            newRating: updates.rating || existingReview.rows[0].rating
          }),
          updates.isPublic ?? true,
        ]
      );

      await client.query('COMMIT');

      // Fetch updated review
      const updatedReview = await this.getReviewById(reviewId);
      
      logger.info('Review updated successfully', { reviewId, userId });
      
      return updatedReview;

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'Review not found' ||
        error.message === 'Not authorized to update this review' ||
        error.message === 'No updates provided'
      )) {
        throw error;
      }
      
      logError('Failed to update review', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId,
        userId
      });
      throw new Error('Failed to update review');
    } finally {
      client.release();
    }
  }

  /**
   * Delete review
   */
  static async deleteReview(reviewId: string, userId: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if review exists and get details
      const reviewResult = await client.query(
        'SELECT user_id, game_id FROM reviews WHERE id = $1',
        [reviewId]
      );

      if (reviewResult.rows.length === 0) {
        throw new Error('Review not found');
      }

      if (reviewResult.rows[0].user_id !== userId) {
        throw new Error('Not authorized to delete this review');
      }

      const gameId = reviewResult.rows[0].game_id;

      // Delete review
      await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

      // Update game rating
      await this.updateGameRating(client, gameId);

      await client.query('COMMIT');
      
      logger.info('Review deleted successfully', { reviewId, userId, gameId });

    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error && (
        error.message === 'Review not found' ||
        error.message === 'Not authorized to delete this review'
      )) {
        throw error;
      }
      
      logError('Failed to delete review', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId,
        userId
      });
      throw new Error('Failed to delete review');
    } finally {
      client.release();
    }
  }

  /**
   * Search reviews with filters and pagination
   */
  static async searchReviews(query: ReviewQuery, requestUserId?: string): Promise<ReviewQueryResult> {
    try {
      const { page, limit, sortBy, sortOrder } = query;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Privacy filter - only show public reviews unless viewing own reviews
      if (query.userId && requestUserId && query.userId === requestUserId) {
        // User viewing their own reviews - show all
        whereConditions.push('r.user_id = $' + paramIndex);
        queryParams.push(query.userId);
        paramIndex++;
      } else if (query.userId) {
        // Viewing another user's reviews - only public
        whereConditions.push('r.user_id = $' + paramIndex);
        whereConditions.push('r.is_public = true');
        queryParams.push(query.userId);
        paramIndex++;
      } else {
        // General search - only public
        whereConditions.push('r.is_public = true');
      }

      if (query.gameId) {
        whereConditions.push('r.game_id = $' + paramIndex);
        queryParams.push(query.gameId);
        paramIndex++;
      }

      if (query.minRating !== undefined) {
        whereConditions.push('r.rating >= $' + paramIndex);
        queryParams.push(query.minRating);
        paramIndex++;
      }

      if (query.maxRating !== undefined) {
        whereConditions.push('r.rating <= $' + paramIndex);
        queryParams.push(query.maxRating);
        paramIndex++;
      }

      if (query.isRecommended !== undefined) {
        whereConditions.push('r.is_recommended = $' + paramIndex);
        queryParams.push(query.isRecommended);
        paramIndex++;
      }

      if (query.search) {
        whereConditions.push(`(
          LOWER(r.title) LIKE LOWER($${paramIndex}) OR 
          LOWER(r.content) LIKE LOWER($${paramIndex}) OR
          LOWER(g.title) LIKE LOWER($${paramIndex})
        )`);
        queryParams.push(`%${query.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM reviews r
        JOIN games g ON r.game_id = g.id
        ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get reviews with details
      const reviewsResult = await db.query(`
        SELECT 
          r.*,
          u.username, u.first_name, u.last_name, u.avatar,
          g.title, g.year_published, g.image_url, g.thumbnail_url
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN games g ON r.game_id = g.id
        ${whereClause}
        ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      const reviews = reviewsResult.rows.map((row: any) => this.formatReviewWithDetails(row));

      // Get stats for game-specific queries
      let stats: ReviewStats | undefined;
      if (query.gameId) {
        stats = await this.getGameReviewStats(query.gameId);
      }

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        stats,
      };
    } catch (error) {
      logError('Failed to search reviews', error instanceof Error ? error : new Error('Unknown error'), {
        query
      });
      throw new Error('Failed to search reviews');
    }
  }

  /**
   * Get review statistics for a game
   */
  static async getGameReviewStats(gameId: string): Promise<ReviewStats> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          AVG(difficulty) as average_difficulty,
          COUNT(CASE WHEN is_recommended = true THEN 1 END)::float / COUNT(*) as recommendation_rate
        FROM reviews 
        WHERE game_id = $1 AND is_public = true
      `, [gameId]);

      const distributionResult = await db.query(`
        SELECT rating, COUNT(*) as count
        FROM reviews 
        WHERE game_id = $1 AND is_public = true
        GROUP BY rating
        ORDER BY rating
      `, [gameId]);

      const row = result.rows[0];
      const distribution: Record<number, number> = {};
      
      distributionResult.rows.forEach((d: any) => {
        distribution[d.rating] = parseInt(d.count);
      });

      return {
        totalReviews: parseInt(row.total_reviews),
        averageRating: parseFloat(row.average_rating) || 0,
        ratingDistribution: distribution,
        recommendationRate: parseFloat(row.recommendation_rate) || 0,
        averageDifficulty: row.average_difficulty ? parseFloat(row.average_difficulty) : undefined,
      };
    } catch (error) {
      logError('Failed to get game review stats', error instanceof Error ? error : new Error('Unknown error'), {
        gameId
      });
      throw new Error('Failed to get review statistics');
    }
  }

  /**
   * Get user review statistics
   */
  static async getUserReviewStats(userId: string): Promise<UserReviewStats> {
    try {
      const [basicStats, categoryStats, monthlyStats, helpfulStats] = await Promise.all([
        // Basic stats
        db.query(`
          SELECT 
            COUNT(*) as total_reviews,
            AVG(rating) as average_rating
          FROM reviews 
          WHERE user_id = $1
        `, [userId]),
        
        // Favorite categories
        db.query(`
          SELECT c.name, COUNT(*) as count
          FROM reviews r
          JOIN games g ON r.game_id = g.id
          JOIN game_categories gc ON g.id = gc.game_id
          JOIN categories c ON gc.category_id = c.id
          WHERE r.user_id = $1
          GROUP BY c.id, c.name
          ORDER BY count DESC
          LIMIT 5
        `, [userId]),
        
        // Reviews this month
        db.query(`
          SELECT COUNT(*) as count
          FROM reviews 
          WHERE user_id = $1 
          AND created_at >= date_trunc('month', CURRENT_DATE)
        `, [userId]),
        
        // Helpful votes received
        db.query(`
          SELECT SUM(helpful_count) as total_helpful
          FROM reviews 
          WHERE user_id = $1
        `, [userId])
      ]);

      const basic = basicStats.rows[0];
      const categories = categoryStats.rows.map((row: any) => ({
        name: row.name,
        count: parseInt(row.count)
      }));

      return {
        totalReviews: parseInt(basic.total_reviews),
        averageRating: parseFloat(basic.average_rating) || 0,
        favoriteCategories: categories,
        reviewsThisMonth: parseInt(monthlyStats.rows[0].count),
        helpfulVotes: parseInt(helpfulStats.rows[0].total_helpful) || 0,
      };
    } catch (error) {
      logError('Failed to get user review stats', error instanceof Error ? error : new Error('Unknown error'), {
        userId
      });
      throw new Error('Failed to get user statistics');
    }
  }

  /**
   * Mark review as helpful
   */
  static async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    try {
      // Check if review exists and user hasn't already marked it helpful
      const reviewResult = await db.query(
        'SELECT user_id FROM reviews WHERE id = $1',
        [reviewId]
      );

      if (reviewResult.rows.length === 0) {
        throw new Error('Review not found');
      }

      if (reviewResult.rows[0].user_id === userId) {
        throw new Error('Cannot mark your own review as helpful');
      }

      // Update helpful count (simplified - in a full implementation you'd track who voted)
      await db.query(`
        UPDATE reviews 
        SET helpful_count = helpful_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reviewId]);

      logger.info('Review marked as helpful', { reviewId, userId });
    } catch (error) {
      if (error instanceof Error && (
        error.message === 'Review not found' ||
        error.message === 'Cannot mark your own review as helpful'
      )) {
        throw error;
      }
      
      logError('Failed to mark review as helpful', error instanceof Error ? error : new Error('Unknown error'), {
        reviewId,
        userId
      });
      throw new Error('Failed to mark review as helpful');
    }
  }

  /**
   * Update game's average rating based on reviews
   */
  private static async updateGameRating(client: any, gameId: string): Promise<void> {
    await client.query(`
      UPDATE games 
      SET 
        average_rating = COALESCE((
          SELECT AVG(rating) 
          FROM reviews 
          WHERE game_id = $1 AND is_public = true
        ), 0),
        rating_count = COALESCE((
          SELECT COUNT(*) 
          FROM reviews 
          WHERE game_id = $1 AND is_public = true
        ), 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [gameId]);
  }

  /**
   * Format database row to ReviewWithDetails
   */
  private static formatReviewWithDetails(row: any): ReviewWithDetails {
    return {
      id: row.id,
      userId: row.user_id,
      gameId: row.game_id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      isRecommended: row.is_recommended,
      playCount: row.play_count,
      difficulty: row.difficulty,
      isPublic: row.is_public,
      helpfulCount: row.helpful_count,
      user: {
        id: row.user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
      },
      game: {
        id: row.game_id,
        title: row.title,
        yearPublished: row.year_published,
        imageUrl: row.image_url,
        thumbnailUrl: row.thumbnail_url,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}