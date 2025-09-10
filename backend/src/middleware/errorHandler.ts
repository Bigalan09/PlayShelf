import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger, logError } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  isOperational = true;

  constructor(message: string = 'Database error occurred') {
    super(message);
    this.name = 'DatabaseError';
  }
}

const handleZodError = (error: ZodError): { message: string; details: any } => {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    message: 'Validation failed',
    details,
  };
};

const handleDatabaseError = (error: any): { message: string; code?: string } => {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return {
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
      };
    case '23503': // foreign_key_violation
      return {
        message: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
      };
    case '23502': // not_null_violation
      return {
        message: 'Required field is missing',
        code: 'MISSING_REQUIRED_FIELD',
      };
    case '23514': // check_violation
      return {
        message: 'Invalid data provided',
        code: 'INVALID_DATA',
      };
    default:
      return {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
      };
  }
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: any = undefined;
  let code: string | undefined = undefined;

  // Handle different error types
  if (error instanceof ZodError) {
    statusCode = 400;
    const zodError = handleZodError(error);
    message = zodError.message;
    details = zodError.details;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'ValidationError' && error instanceof ValidationError) {
    statusCode = 400;
    details = error.details;
    code = 'VALIDATION_ERROR';
  } else if (error.code && typeof error.code === 'string') {
    // Handle database errors
    const dbError = handleDatabaseError(error);
    statusCode = 400;
    message = dbError.message;
    code = dbError.code;
  }

  // Log error
  const errorMeta = {
    statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    requestId: req.headers['x-request-id'],
  };

  if (statusCode >= 500) {
    logError('Server Error', error, errorMeta);
  } else {
    logger.warn('Client Error', { message, code, ...errorMeta });
  }

  // Prepare response
  const errorResponse: any = {
    error: message,
    ...(code && { code }),
    ...(details && { details }),
  };

  // Add stack trace in development
  if (config.server.nodeEnv === 'development' && statusCode >= 500) {
    errorResponse.stack = error.stack;
  }

  // Add request ID if present
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};