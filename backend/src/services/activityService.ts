import { z } from 'zod';
import { db } from '../config/database.js';
import { logError, logger } from '../utils/logger.js';
import { Activity, ActivitySchema } from '../types/database.js';

// Activity query schema
export const ActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  type: z.enum([
    'game_added',
    'game_removed', 
    'game_played',
    'review_created',
    'review_updated',
    'friend_added',
    'wishlist_added',
    'collection_updated'
  ]).optional(),
  isPublic: z.coerce.boolean().optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
});

export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;

export interface ActivityWithDetails extends Omit<Activity, 'createdAt' | 'updatedAt'> {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  entityDetails?: {
    id: string;
    title?: string;
    name?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityQueryResult {
  activities: ActivityWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserActivityStats {
  totalActivities: number;
  activitiesThisWeek: number;
  activitiesThisMonth: number;
  mostActiveDay: string;
  activityBreakdown: Record<string, number>;
}

export class ActivityService {
  /**
   * Get activity feed with filters and pagination
   */
  static async getActivityFeed(query: ActivityQuery, requestUserId?: string): Promise<ActivityQueryResult> {
    try {
      const { page, limit, userId, type, isPublic, since, until } = query;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Privacy filter
      if (userId && requestUserId && userId === requestUserId) {
        // User viewing their own activities - show all
        whereConditions.push('a.user_id = $' + paramIndex);
        queryParams.push(userId);
        paramIndex++;
      } else if (userId) {
        // Viewing another user's activities - only public
        whereConditions.push('a.user_id = $' + paramIndex);
        whereConditions.push('a.is_public = true');
        queryParams.push(userId);
        paramIndex++;
      } else {
        // General feed - only public activities
        whereConditions.push('a.is_public = true');
      }

      if (type) {
        whereConditions.push('a.type = $' + paramIndex);
        queryParams.push(type);
        paramIndex++;
      }

      if (isPublic !== undefined) {
        whereConditions.push('a.is_public = $' + paramIndex);
        queryParams.push(isPublic);
        paramIndex++;
      }

      if (since) {
        whereConditions.push('a.created_at >= $' + paramIndex);
        queryParams.push(since);
        paramIndex++;
      }

      if (until) {
        whereConditions.push('a.created_at <= $' + paramIndex);
        queryParams.push(until);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM activities a
        ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get activities with user details
      const activitiesResult = await db.query(`
        SELECT 
          a.*,
          u.username, u.first_name, u.last_name, u.avatar
        FROM activities a
        JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Format activities with additional details
      const activities: ActivityWithDetails[] = await Promise.all(
        activitiesResult.rows.map(async (row: any) => {
          const activity: ActivityWithDetails = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            entityType: row.entity_type,
            entityId: row.entity_id,
            metadata: row.metadata,
            isPublic: row.is_public,
            user: {
              id: row.user_id,
              username: row.username,
              firstName: row.first_name,
              lastName: row.last_name,
              avatar: row.avatar,
            },
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          };

          // Add entity details based on type
          if (row.entity_type && row.entity_id) {
            activity.entityDetails = await this.getEntityDetails(row.entity_type, row.entity_id);
          }

          return activity;
        })
      );

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logError('Failed to get activity feed', error instanceof Error ? error : new Error('Unknown error'), {
        query
      });
      throw new Error('Failed to get activity feed');
    }
  }

  /**
   * Get activity statistics for a user
   */
  static async getUserActivityStats(userId: string): Promise<UserActivityStats> {
    try {
      const [basicStats, weeklyStats, monthlyStats, dailyStats, typeStats] = await Promise.all([
        // Basic stats
        db.query(`
          SELECT COUNT(*) as total_activities
          FROM activities 
          WHERE user_id = $1
        `, [userId]),
        
        // This week stats
        db.query(`
          SELECT COUNT(*) as count
          FROM activities 
          WHERE user_id = $1 
          AND created_at >= date_trunc('week', CURRENT_DATE)
        `, [userId]),
        
        // This month stats
        db.query(`
          SELECT COUNT(*) as count
          FROM activities 
          WHERE user_id = $1 
          AND created_at >= date_trunc('month', CURRENT_DATE)
        `, [userId]),
        
        // Most active day
        db.query(`
          SELECT 
            EXTRACT(DOW FROM created_at) as day_of_week,
            COUNT(*) as count
          FROM activities 
          WHERE user_id = $1
          GROUP BY EXTRACT(DOW FROM created_at)
          ORDER BY count DESC
          LIMIT 1
        `, [userId]),
        
        // Activity type breakdown
        db.query(`
          SELECT type, COUNT(*) as count
          FROM activities 
          WHERE user_id = $1
          GROUP BY type
          ORDER BY count DESC
        `, [userId])
      ]);

      const basic = basicStats.rows[0];
      const weekly = weeklyStats.rows[0];
      const monthly = monthlyStats.rows[0];
      const daily = dailyStats.rows[0];
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mostActiveDay = daily ? dayNames[parseInt(daily.day_of_week)] : 'N/A';
      
      const breakdown: Record<string, number> = {};
      typeStats.rows.forEach((row: any) => {
        breakdown[row.type] = parseInt(row.count);
      });

      return {
        totalActivities: parseInt(basic.total_activities),
        activitiesThisWeek: parseInt(weekly.count),
        activitiesThisMonth: parseInt(monthly.count),
        mostActiveDay,
        activityBreakdown: breakdown,
      };
    } catch (error) {
      logError('Failed to get user activity stats', error instanceof Error ? error : new Error('Unknown error'), {
        userId
      });
      throw new Error('Failed to get user activity statistics');
    }
  }

  /**
   * Get friend activity feed (activities from friends)
   */
  static async getFriendActivityFeed(userId: string, query: Omit<ActivityQuery, 'userId'>): Promise<ActivityQueryResult> {
    try {
      const { page, limit, type, since, until } = query;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [
        'a.is_public = true',
        `a.user_id IN (
          SELECT CASE 
            WHEN f.requester_id = $1 THEN f.receiver_id
            WHEN f.receiver_id = $1 THEN f.requester_id
          END
          FROM friendships f
          WHERE (f.requester_id = $1 OR f.receiver_id = $1)
          AND f.status = 'accepted'
        )`
      ];
      
      const queryParams: any[] = [userId];
      let paramIndex = 2;

      if (type) {
        whereConditions.push('a.type = $' + paramIndex);
        queryParams.push(type);
        paramIndex++;
      }

      if (since) {
        whereConditions.push('a.created_at >= $' + paramIndex);
        queryParams.push(since);
        paramIndex++;
      }

      if (until) {
        whereConditions.push('a.created_at <= $' + paramIndex);
        queryParams.push(until);
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM activities a
        ${whereClause}
      `, queryParams);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get activities with user details
      const activitiesResult = await db.query(`
        SELECT 
          a.*,
          u.username, u.first_name, u.last_name, u.avatar
        FROM activities a
        JOIN users u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Format activities with additional details
      const activities: ActivityWithDetails[] = await Promise.all(
        activitiesResult.rows.map(async (row: any) => {
          const activity: ActivityWithDetails = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            entityType: row.entity_type,
            entityId: row.entity_id,
            metadata: row.metadata,
            isPublic: row.is_public,
            user: {
              id: row.user_id,
              username: row.username,
              firstName: row.first_name,
              lastName: row.last_name,
              avatar: row.avatar,
            },
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          };

          // Add entity details based on type
          if (row.entity_type && row.entity_id) {
            activity.entityDetails = await this.getEntityDetails(row.entity_type, row.entity_id);
          }

          return activity;
        })
      );

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logError('Failed to get friend activity feed', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        query
      });
      throw new Error('Failed to get friend activity feed');
    }
  }

  /**
   * Create activity entry (used internally by other services)
   */
  static async createActivity(
    userId: string,
    type: Activity['type'],
    entityType?: Activity['entityType'],
    entityId?: string,
    metadata?: Record<string, any>,
    isPublic = true
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO activities (user_id, type, entity_type, entity_id, metadata, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, type, entityType, entityId, metadata ? JSON.stringify(metadata) : null, isPublic]);

      logger.info('Activity created', { userId, type, entityType, entityId });
    } catch (error) {
      logError('Failed to create activity', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        type,
        entityType,
        entityId
      });
      // Don't throw - activity logging should not break main operations
    }
  }

  /**
   * Delete activities for a user (privacy/cleanup)
   */
  static async deleteUserActivities(userId: string, olderThanDays?: number): Promise<number> {
    try {
      let query = 'DELETE FROM activities WHERE user_id = $1';
      const params: any[] = [userId];

      if (olderThanDays && olderThanDays > 0) {
        query += ' AND created_at < $2';
        params.push(new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000));
      }

      const result = await db.query(query, params);
      
      const deletedCount = result.rowCount || 0;
      logger.info('User activities deleted', { userId, deletedCount, olderThanDays });
      
      return deletedCount;
    } catch (error) {
      logError('Failed to delete user activities', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        olderThanDays
      });
      throw new Error('Failed to delete user activities');
    }
  }

  /**
   * Get entity details for activity display
   */
  private static async getEntityDetails(entityType: string, entityId: string): Promise<any> {
    try {
      switch (entityType) {
        case 'game':
          const gameResult = await db.query(`
            SELECT id, title, image_url, thumbnail_url
            FROM games
            WHERE id = $1 AND is_active = true
          `, [entityId]);
          
          if (gameResult.rows.length > 0) {
            const game = gameResult.rows[0];
            return {
              id: game.id,
              title: game.title,
              imageUrl: game.image_url,
              thumbnailUrl: game.thumbnail_url,
            };
          }
          break;

        case 'review':
          const reviewResult = await db.query(`
            SELECT r.id, g.title, g.image_url, g.thumbnail_url
            FROM reviews r
            JOIN games g ON r.game_id = g.id
            WHERE r.id = $1
          `, [entityId]);
          
          if (reviewResult.rows.length > 0) {
            const review = reviewResult.rows[0];
            return {
              id: review.id,
              title: review.title,
              imageUrl: review.image_url,
              thumbnailUrl: review.thumbnail_url,
            };
          }
          break;

        case 'user':
          const userResult = await db.query(`
            SELECT id, username, first_name, last_name, avatar
            FROM users
            WHERE id = $1 AND is_active = true
          `, [entityId]);
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            return {
              id: user.id,
              name: user.username,
              title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
              imageUrl: user.avatar,
            };
          }
          break;

        case 'session':
          const sessionResult = await db.query(`
            SELECT s.id, g.title, g.image_url, g.thumbnail_url
            FROM game_sessions s
            JOIN games g ON s.game_id = g.id
            WHERE s.id = $1
          `, [entityId]);
          
          if (sessionResult.rows.length > 0) {
            const session = sessionResult.rows[0];
            return {
              id: session.id,
              title: session.title,
              imageUrl: session.image_url,
              thumbnailUrl: session.thumbnail_url,
            };
          }
          break;

        default:
          return null;
      }
      
      return null;
    } catch (error) {
      logError('Failed to get entity details', error instanceof Error ? error : new Error('Unknown error'), {
        entityType,
        entityId
      });
      return null;
    }
  }
}