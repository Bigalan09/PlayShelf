import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { db } from '../config/database.js';
import { logger, logAuth, logSecurity, logError } from '../utils/logger.js';
import { TokenService } from './tokenService.js';
import {
  RegisterRequest,
  LoginRequest,
  RegisterResponse,
  LoginResponse,
  RefreshResponse,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AuthenticationError,
  ValidationError,
  UserSession,
  PasswordResetToken
} from './types.js';
import { User } from '../types/database.js';

export class UserService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterRequest, ipAddress?: string, userAgent?: string): Promise<RegisterResponse> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [userData.email]
      );

      if (emailCheck.rows.length > 0) {
        logSecurity('Registration attempt with existing email', { 
          email: userData.email, 
          ip: ipAddress 
        });
        throw new ValidationError('Email address is already registered', 'email');
      }

      // Check if username already exists
      const usernameCheck = await client.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
        [userData.username]
      );

      if (usernameCheck.rows.length > 0) {
        throw new ValidationError('Username is already taken', 'username');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, config.security.bcryptRounds);

      // Create user
      const userId = uuidv4();
      const userResult = await client.query(
        `INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, username, first_name, last_name, avatar, bio, is_active, role, email_verified, created_at, updated_at`,
        [
          userId,
          userData.email.toLowerCase(),
          userData.username,
          userData.firstName || null,
          userData.lastName || null,
          passwordHash,
          'user',
          true,
          false
        ]
      );

      const user = userResult.rows[0];

      // Generate tokens
      const tokens = TokenService.generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Store refresh token session
      await this.createRefreshTokenSession(
        client,
        user.id,
        tokens.refreshToken,
        ipAddress,
        userAgent
      );

      await client.query('COMMIT');

      logAuth('User registered successfully', { 
        userId: user.id, 
        username: user.username, 
        email: user.email 
      });

      // Convert database user to response format
      const responseUser: Omit<User, 'passwordHash'> = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        isActive: user.is_active,
        role: user.role,
        emailVerified: user.email_verified,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };

      return {
        user: responseUser,
        tokens
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      logError('Registration failed', error instanceof Error ? error : new Error('Unknown error'), {
        email: userData.email,
        username: userData.username
      });
      throw new AuthenticationError('Registration failed');
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate user login
   */
  static async login(credentials: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      // Record login attempt
      await this.recordLoginAttempt(credentials.email, ipAddress, userAgent, false);

      // Get user by email
      const userResult = await db.query(
        `SELECT id, email, username, first_name, last_name, password_hash, avatar, bio, 
                is_active, role, email_verified, last_login_at, created_at, updated_at
         FROM users 
         WHERE LOWER(email) = LOWER($1) AND is_active = true`,
        [credentials.email]
      );

      if (userResult.rows.length === 0) {
        logSecurity('Login attempt with non-existent email', { 
          email: credentials.email, 
          ip: ipAddress 
        });
        throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const user = userResult.rows[0];

      // Verify password
      const passwordValid = await bcrypt.compare(credentials.password, user.password_hash);
      if (!passwordValid) {
        logSecurity('Login attempt with invalid password', { 
          userId: user.id, 
          email: credentials.email, 
          ip: ipAddress 
        });
        throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Generate tokens
      const tokens = TokenService.generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Store refresh token session and update last login
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        await this.createRefreshTokenSession(
          client,
          user.id,
          tokens.refreshToken,
          ipAddress,
          userAgent
        );

        // Update last login timestamp
        await client.query(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Record successful login
      await this.recordLoginAttempt(credentials.email, ipAddress, userAgent, true);

      logAuth('User logged in successfully', { 
        userId: user.id, 
        username: user.username,
        ip: ipAddress
      });

      // Convert database user to response format
      const responseUser: Omit<User, 'passwordHash'> = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        isActive: user.is_active,
        role: user.role,
        emailVerified: user.email_verified,
        lastLoginAt: new Date(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };

      return {
        user: responseUser,
        tokens
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Login failed', error instanceof Error ? error : new Error('Unknown error'), {
        email: credentials.email
      });
      throw new AuthenticationError('Login failed');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const decoded = TokenService.verifyRefreshToken(refreshToken);
      
      // Hash token for database lookup
      const tokenHash = TokenService.hashToken(refreshToken);
      
      // Check if refresh token exists and is valid
      const sessionResult = await db.query(
        `SELECT us.*, u.email, u.username, u.role
         FROM user_sessions us
         JOIN users u ON us.user_id = u.id
         WHERE us.refresh_token_hash = $1 
           AND us.is_revoked = false 
           AND us.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = true`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        logSecurity('Invalid or expired refresh token used', { 
          userId: decoded.id, 
          ip: ipAddress 
        });
        throw new AuthenticationError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
      }

      const session = sessionResult.rows[0];
      
      // Generate new tokens
      const tokens = TokenService.generateTokens({
        id: session.user_id,
        email: session.email,
        username: session.username,
        role: session.role
      });

      // Update session with new refresh token and last used time
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Revoke old refresh token
        await client.query(
          `UPDATE user_sessions 
           SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'refreshed'
           WHERE id = $1`,
          [session.id]
        );

        // Create new session
        await this.createRefreshTokenSession(
          client,
          session.user_id,
          tokens.refreshToken,
          ipAddress,
          userAgent
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      logAuth('Token refreshed successfully', { 
        userId: session.user_id, 
        ip: ipAddress 
      });

      return { tokens };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Token refresh failed', error instanceof Error ? error : new Error('Unknown error'));
      throw new AuthenticationError('Token refresh failed');
    }
  }

  /**
   * Logout user by revoking refresh token
   */
  static async logout(refreshToken: string, ipAddress?: string): Promise<void> {
    try {
      const tokenHash = TokenService.hashToken(refreshToken);
      
      const result = await db.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'logout'
         WHERE refresh_token_hash = $1 AND is_revoked = false
         RETURNING user_id`,
        [tokenHash]
      );

      if (result.rows.length > 0) {
        logAuth('User logged out successfully', { 
          userId: result.rows[0].user_id, 
          ip: ipAddress 
        });
      }
    } catch (error) {
      logError('Logout failed', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Logout from all devices by revoking all refresh tokens
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'logout_all'
         WHERE user_id = $1 AND is_revoked = false`,
        [userId]
      );

      logAuth('User logged out from all devices', { userId });
    } catch (error) {
      logError('Logout all devices failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to logout from all devices');
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserProfile> {
    try {
      const result = await db.query(
        `SELECT id, email, username, first_name, last_name, avatar, bio, 
                is_active, role, email_verified, last_login_at, created_at, updated_at
         FROM users 
         WHERE id = $1 AND is_active = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        isActive: user.is_active,
        role: user.role,
        emailVerified: user.email_verified,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Get profile failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.firstName !== undefined) {
        fields.push(`first_name = $${paramIndex}`);
        values.push(updates.firstName);
        paramIndex++;
      }

      if (updates.lastName !== undefined) {
        fields.push(`last_name = $${paramIndex}`);
        values.push(updates.lastName);
        paramIndex++;
      }

      if (updates.bio !== undefined) {
        fields.push(`bio = $${paramIndex}`);
        values.push(updates.bio);
        paramIndex++;
      }

      if (updates.avatar !== undefined) {
        fields.push(`avatar = $${paramIndex}`);
        values.push(updates.avatar);
        paramIndex++;
      }

      if (fields.length === 0) {
        return this.getProfile(userId);
      }

      values.push(userId);
      
      const result = await db.query(
        `UPDATE users 
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex} AND is_active = true
         RETURNING id, email, username, first_name, last_name, avatar, bio, 
                   is_active, role, email_verified, last_login_at, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      const user = result.rows[0];
      
      logAuth('Profile updated successfully', { userId });

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        isActive: user.is_active,
        role: user.role,
        emailVerified: user.email_verified,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Update profile failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get current password hash
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      // Verify current password
      const passwordValid = await bcrypt.compare(passwordData.currentPassword, userResult.rows[0].password_hash);
      if (!passwordValid) {
        logSecurity('Invalid current password during password change', { userId });
        throw new AuthenticationError('Current password is incorrect', 'INVALID_PASSWORD');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(passwordData.newPassword, config.security.bcryptRounds);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Revoke all existing refresh tokens for security
      await client.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'password_changed'
         WHERE user_id = $1 AND is_revoked = false`,
        [userId]
      );

      await client.query('COMMIT');

      logAuth('Password changed successfully', { userId });
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Change password failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to change password');
    } finally {
      client.release();
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Soft delete - set is_active to false
      const result = await client.query(
        `UPDATE users 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = true
         RETURNING email, username`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      // Revoke all refresh tokens
      await client.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'account_deleted'
         WHERE user_id = $1 AND is_revoked = false`,
        [userId]
      );

      await client.query('COMMIT');

      logAuth('Account deleted successfully', { 
        userId, 
        email: result.rows[0].email,
        username: result.rows[0].username
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Delete account failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to delete account');
    } finally {
      client.release();
    }
  }

  /**
   * Get user sessions (active refresh tokens)
   */
  static async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const result = await db.query(
        `SELECT id, user_id, expires_at, created_at, last_used_at, ip_address, user_agent, is_revoked
         FROM user_sessions
         WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
         ORDER BY last_used_at DESC`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        refreshToken: '', // Don't return actual token
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        lastUsedAt: new Date(row.last_used_at),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        isRevoked: row.is_revoked
      }));
    } catch (error) {
      logError('Get user sessions failed', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to get user sessions');
    }
  }

  /**
   * Helper: Create refresh token session
   */
  private static async createRefreshTokenSession(
    client: any,
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const tokenHash = TokenService.hashToken(refreshToken);
    const expiresAt = TokenService.getTokenExpiration(refreshToken);

    await client.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, ipAddress, userAgent]
    );
  }

  /**
   * Helper: Record login attempt for security monitoring
   */
  private static async recordLoginAttempt(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = false,
    failureReason?: string
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, ipAddress, userAgent, success, failureReason]
      );
    } catch (error) {
      // Don't throw on logging failures
      logError('Failed to record login attempt', error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}