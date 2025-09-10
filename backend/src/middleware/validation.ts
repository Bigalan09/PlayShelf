import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler.js';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  target: ValidationTarget;
  schema: ZodSchema;
  optional?: boolean;
}

export const validate = (options: ValidationOptions | ValidationOptions[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationConfigs = Array.isArray(options) ? options : [options];

      for (const config of validationConfigs) {
        const { target, schema, optional = false } = config;
        const data = req[target];

        if (!data && optional) {
          continue;
        }

        const result = schema.safeParse(data);
        
        if (!result.success) {
          throw result.error;
        }

        // Replace the original data with the parsed/validated data
        req[target] = result.data;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new ValidationError('Validation failed', error));
      }
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // UUID parameter
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Pagination
  pagination: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
  }),

  // Sorting
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  // Search
  search: z.object({
    q: z.string().min(1).max(255).optional(),
    query: z.string().min(1).max(255).optional(),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),

  // Common filters
  filters: z.object({
    status: z.string().optional(),
    category: z.string().optional(),
    isActive: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
    isPublic: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  }),
};

// Validation helpers
export const validateUuid = validate({
  target: 'params',
  schema: z.object({
    id: commonSchemas.uuid,
  }),
});

export const validatePagination = validate({
  target: 'query',
  schema: commonSchemas.pagination,
  optional: true,
});

export const validateSorting = validate({
  target: 'query',
  schema: commonSchemas.sorting,
  optional: true,
});

export const validateSearch = validate({
  target: 'query',
  schema: commonSchemas.search,
  optional: true,
});

export const validateDateRange = validate({
  target: 'query',
  schema: commonSchemas.dateRange,
  optional: true,
});

// User validation schemas
export const userSchemas = {
  create: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username cannot exceed 50 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  update: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
};

// Game validation schemas
export const gameSchemas = {
  create: z.object({
    title: z.string().min(1, 'Title is required').max(255),
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
  }).refine(
    (data) => !data.maxPlayers || !data.minPlayers || data.maxPlayers >= data.minPlayers,
    {
      message: 'Maximum players must be greater than or equal to minimum players',
      path: ['maxPlayers'],
    }
  ),

  update: z.object({
    title: z.string().min(1).max(255).optional(),
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
  }),

  search: z.object({
    q: z.string().min(1).max(255).optional(),
    minPlayers: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    maxPlayers: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    yearPublished: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int()).optional(),
    complexity: z.string().transform(val => parseFloat(val)).pipe(z.number().min(1).max(5)).optional(),
    category: z.string().optional(),
    mechanism: z.string().optional(),
  }),
};

// Review validation schemas
export const reviewSchemas = {
  create: z.object({
    gameId: commonSchemas.uuid,
    rating: z.number().min(1).max(10),
    title: z.string().max(255).optional(),
    content: z.string().max(5000).optional(),
    isRecommended: z.boolean().optional(),
    playCount: z.number().int().min(1).default(1),
    difficulty: z.number().min(1).max(5).optional(),
    isPublic: z.boolean().default(true),
  }),

  update: z.object({
    rating: z.number().min(1).max(10).optional(),
    title: z.string().max(255).optional(),
    content: z.string().max(5000).optional(),
    isRecommended: z.boolean().optional(),
    playCount: z.number().int().min(1).optional(),
    difficulty: z.number().min(1).max(5).optional(),
    isPublic: z.boolean().optional(),
  }),
};

// Multi-target validation helper
interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validations = [];
      
      if (schemas.body) {
        validations.push({ target: 'body' as const, schema: schemas.body });
      }
      
      if (schemas.query) {
        validations.push({ target: 'query' as const, schema: schemas.query });
      }
      
      if (schemas.params) {
        validations.push({ target: 'params' as const, schema: schemas.params });
      }

      validate(validations)(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};