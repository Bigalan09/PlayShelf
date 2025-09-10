import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger, logAuth, logSecurity } from '../utils/logger.js';
import { 
  AuthTokens, 
  JwtAccessPayload, 
  JwtRefreshPayload,
  TokenExpiredError,
  InvalidTokenError
} from './types.js';

export class TokenService {
  /**
   * Generate both access and refresh tokens for a user
   */
  static generateTokens(user: {
    id: string;
    email: string;
    username: string;
    role: string;
  }): AuthTokens {
    const accessPayload: JwtAccessPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      type: 'access'
    };

    const refreshPayload: JwtRefreshPayload = {
      id: user.id,
      type: 'refresh'
    };

    const signOptions: SignOptions = {
      expiresIn: config.jwt.expiresIn,
      issuer: 'playshelf-api',
      audience: 'playshelf-client'
    } as SignOptions;

    const refreshSignOptions: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'playshelf-api',
      audience: 'playshelf-client'
    } as SignOptions;

    const accessToken = jwt.sign(accessPayload, config.jwt.secret, signOptions);
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, refreshSignOptions);

    // Calculate expiration time in seconds
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;

    logAuth('Tokens generated successfully', { 
      userId: user.id, 
      username: user.username,
      expiresIn: config.jwt.expiresIn
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode an access token
   */
  static verifyAccessToken(token: string): JwtAccessPayload {
    try {
      const verifyOptions = {
        issuer: 'playshelf-api',
        audience: 'playshelf-client'
      };
      const decoded = jwt.verify(token, config.jwt.secret, verifyOptions) as JwtAccessPayload;

      if (decoded.type !== 'access') {
        logSecurity('Invalid token type provided for access verification', { tokenType: decoded.type });
        throw new InvalidTokenError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Access token has expired');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logSecurity('Invalid access token provided', { error: error.message });
        throw new InvalidTokenError('Invalid access token');
      }

      throw error;
    }
  }

  /**
   * Verify and decode a refresh token
   */
  static verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      const verifyOptions = {
        issuer: 'playshelf-api',
        audience: 'playshelf-client'
      };
      const decoded = jwt.verify(token, config.jwt.secret, verifyOptions) as JwtRefreshPayload;

      if (decoded.type !== 'refresh') {
        logSecurity('Invalid token type provided for refresh verification', { tokenType: decoded.type });
        throw new InvalidTokenError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Refresh token has expired');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logSecurity('Invalid refresh token provided', { error: error.message });
        throw new InvalidTokenError('Invalid refresh token');
      }

      throw error;
    }
  }

  /**
   * Generate a secure random token for password resets
   */
  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a secure random string for session IDs
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash a token for secure storage (used for refresh tokens)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random verification token for email verification
   */
  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Extract token from Authorization header
   */
  static extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7);
  }

  /**
   * Check if a token is close to expiration (within 5 minutes)
   */
  static isTokenNearExpiry(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (!decoded.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      const expiryBuffer = 5 * 60; // 5 minutes in seconds
      
      return decoded.exp - now <= expiryBuffer;
    } catch {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (!decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Validate token format without verifying signature (for logging purposes)
   */
  static validateTokenFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }
}