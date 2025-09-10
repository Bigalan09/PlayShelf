import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { config } from '../config/index.js';
import { logger, logAuth, logSecurity, logError } from '../utils/logger.js';
import { TokenService } from './tokenService.js';
import {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthenticationError,
  ValidationError
} from './types.js';

export class PasswordResetService {
  /**
   * Initiate password reset process
   */
  static async initiatePasswordReset(
    request: ForgotPasswordRequest,
    ipAddress?: string
  ): Promise<{ message: string; resetToken?: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Find user by email
      const userResult = await client.query(
        'SELECT id, email, username, is_active FROM users WHERE LOWER(email) = LOWER($1)',
        [request.email]
      );

      // Always return success message for security (don't reveal if email exists)
      const successMessage = 'If an account with this email exists, you will receive password reset instructions.';

      if (userResult.rows.length === 0) {
        logSecurity('Password reset requested for non-existent email', {
          email: request.email,
          ip: ipAddress
        });
        
        // Still return success to prevent email enumeration
        return { message: successMessage };
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        logSecurity('Password reset requested for inactive account', {
          userId: user.id,
          email: request.email,
          ip: ipAddress
        });
        
        return { message: successMessage };
      }

      // Generate reset token
      const resetToken = TokenService.generatePasswordResetToken();
      const tokenHash = TokenService.hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing password reset tokens for this user
      await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1',
        [user.id]
      );

      // Create new password reset token
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [user.id, tokenHash, expiresAt, ipAddress]
      );

      await client.query('COMMIT');

      logAuth('Password reset initiated', {
        userId: user.id,
        email: request.email,
        ip: ipAddress,
        expiresAt
      });

      // In production, you would send an email here
      // For development, we return the token (REMOVE IN PRODUCTION)
      const developmentResponse = process.env.NODE_ENV === 'development' 
        ? { resetToken } 
        : {};

      return {
        message: successMessage,
        ...developmentResponse
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      logError('Password reset initiation failed', error instanceof Error ? error : new Error('Unknown error'), {
        email: request.email,
        ip: ipAddress
      });
      
      // Return generic success message even on error to prevent information disclosure
      return { 
        message: 'If an account with this email exists, you will receive password reset instructions.' 
      };
    } finally {
      client.release();
    }
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(
    request: ResetPasswordRequest,
    ipAddress?: string
  ): Promise<{ message: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const tokenHash = TokenService.hashToken(request.token);

      // Find and validate reset token
      const tokenResult = await client.query(
        `SELECT rt.*, u.id as user_id, u.email, u.username, u.is_active
         FROM password_reset_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 
           AND rt.is_used = false 
           AND rt.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = true`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        logSecurity('Invalid or expired password reset token used', {
          tokenProvided: !!request.token,
          ip: ipAddress
        });
        
        throw new AuthenticationError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
      }

      const tokenData = tokenResult.rows[0];

      // Hash new password
      const newPasswordHash = await bcrypt.hash(request.password, config.security.bcryptRounds);

      // Update user password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, tokenData.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET is_used = true, used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [tokenData.id]
      );

      // Revoke all existing refresh tokens for security
      await client.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'password_reset'
         WHERE user_id = $1 AND is_revoked = false`,
        [tokenData.user_id]
      );

      // Delete any other unused reset tokens for this user
      await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND is_used = false',
        [tokenData.user_id]
      );

      await client.query('COMMIT');

      logAuth('Password reset completed successfully', {
        userId: tokenData.user_id,
        email: tokenData.email,
        ip: ipAddress
      });

      return {
        message: 'Password has been reset successfully. Please login with your new password.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logError('Password reset failed', error instanceof Error ? error : new Error('Unknown error'), {
        ip: ipAddress
      });
      
      throw new AuthenticationError('Password reset failed', 'RESET_FAILED');
    } finally {
      client.release();
    }
  }

  /**
   * Validate reset token without using it
   */
  static async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const tokenHash = TokenService.hashToken(token);

      const tokenResult = await db.query(
        `SELECT u.email
         FROM password_reset_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 
           AND rt.is_used = false 
           AND rt.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = true`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        return { valid: false };
      }

      return {
        valid: true,
        email: this.maskEmail(tokenResult.rows[0].email)
      };

    } catch (error) {
      logError('Reset token validation failed', error instanceof Error ? error : new Error('Unknown error'));
      return { valid: false };
    }
  }

  /**
   * Clean up expired reset tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP'
      );

      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        logAuth('Expired password reset tokens cleaned up', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logError('Password reset token cleanup failed', error instanceof Error ? error : new Error('Unknown error'));
      return 0;
    }
  }

  /**
   * Revoke all password reset tokens for a user
   */
  static async revokeUserResetTokens(userId: string, reason: string = 'manual_revocation'): Promise<void> {
    try {
      await db.query(
        `UPDATE password_reset_tokens 
         SET is_used = true, used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_used = false`,
        [userId]
      );

      logAuth('User password reset tokens revoked', { userId, reason });
    } catch (error) {
      logError('Failed to revoke user reset tokens', error instanceof Error ? error : new Error('Unknown error'), { userId });
      throw new AuthenticationError('Failed to revoke reset tokens');
    }
  }

  /**
   * Get password reset attempt statistics for security monitoring
   */
  static async getResetAttemptStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalAttempts: number;
    successfulResets: number;
    failedAttempts: number;
    uniqueIPs: number;
  }> {
    try {
      let interval: string;
      switch (timeframe) {
        case 'hour':
          interval = '1 hour';
          break;
        case 'week':
          interval = '7 days';
          break;
        default:
          interval = '1 day';
      }

      const [attemptsResult, successResult, ipsResult] = await Promise.all([
        db.query(
          `SELECT COUNT(*) as count
           FROM password_reset_tokens
           WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${interval}'`
        ),
        db.query(
          `SELECT COUNT(*) as count
           FROM password_reset_tokens
           WHERE used_at > CURRENT_TIMESTAMP - INTERVAL '${interval}' AND is_used = true`
        ),
        db.query(
          `SELECT COUNT(DISTINCT ip_address) as count
           FROM password_reset_tokens
           WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${interval}' AND ip_address IS NOT NULL`
        )
      ]);

      const totalAttempts = parseInt(attemptsResult.rows[0]?.count || '0');
      const successfulResets = parseInt(successResult.rows[0]?.count || '0');
      const uniqueIPs = parseInt(ipsResult.rows[0]?.count || '0');

      return {
        totalAttempts,
        successfulResets,
        failedAttempts: totalAttempts - successfulResets,
        uniqueIPs
      };
    } catch (error) {
      logError('Failed to get reset attempt stats', error instanceof Error ? error : new Error('Unknown error'));
      return {
        totalAttempts: 0,
        successfulResets: 0,
        failedAttempts: 0,
        uniqueIPs: 0
      };
    }
  }

  /**
   * Helper method to mask email for security
   */
  private static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username[0]}*@${domain}`;
    }
    return `${username.substring(0, 2)}${'*'.repeat(username.length - 2)}@${domain}`;
  }

  /**
   * Check if user has pending reset tokens
   */
  static async hasPendingResetToken(userId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM password_reset_tokens
         WHERE user_id = $1 AND is_used = false AND expires_at > CURRENT_TIMESTAMP`,
        [userId]
      );

      return parseInt(result.rows[0]?.count || '0') > 0;
    } catch (error) {
      logError('Failed to check pending reset tokens', error instanceof Error ? error : new Error('Unknown error'), { userId });
      return false;
    }
  }
}