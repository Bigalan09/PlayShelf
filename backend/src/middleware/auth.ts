import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logAuth, logSecurity } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    username: string;
    role: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      logSecurity('Authentication attempt without token', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      res.status(401).json({ error: 'Access token is required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    req.user = {
      id: decoded.id,
      userId: decoded.id, // Add for backward compatibility
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    logAuth('User authenticated successfully', { 
      userId: decoded.id, 
      username: decoded.username 
    });
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logSecurity('Invalid JWT token provided', { 
        ip: req.ip, 
        error: error.message 
      });
      res.status(401).json({ error: 'Invalid access token' });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logSecurity('Expired JWT token provided', { 
        ip: req.ip 
      });
      res.status(401).json({ error: 'Access token has expired' });
      return;
    }

    logSecurity('Authentication error', { 
      ip: req.ip, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logSecurity('Insufficient permissions', { 
        userId: req.user.id, 
        requiredRoles: roles, 
        userRole: req.user.role 
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = {
        id: decoded.id,
        userId: decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};