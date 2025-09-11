import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  server: z.object({
    port: z.number().min(1).max(65535),
    nodeEnv: z.enum(['development', 'production', 'test']),
    corsOrigin: z.string().url(),
  }),
  database: z.object({
    url: z.string().min(1),
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    name: z.string().min(1),
    user: z.string().min(1),
    password: z.string().min(1),
    maxConnections: z.number().min(1).max(100),
    ssl: z.boolean(),
  }),
  redis: z.object({
    url: z.string().min(1),
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    password: z.string().optional(),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().min(1),
    refreshExpiresIn: z.string().min(1),
  }),
  rateLimit: z.object({
    windowMs: z.number().min(1),
    maxRequests: z.number().min(1),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    file: z.string().optional(),
  }),
  upload: z.object({
    maxFileSize: z.number().min(1),
    uploadPath: z.string().min(1),
    allowedTypes: z.array(z.string()),
  }),
  security: z.object({
    bcryptRounds: z.number().min(4).max(15),
    sessionSecret: z.string().min(32),
  }),
});

const rawConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://playshelf_user:playshelf_password@localhost:5432/playshelf_dev',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'playshelf_dev',
    user: process.env.DATABASE_USER || 'playshelf_user',
    password: process.env.DATABASE_PASSWORD || 'playshelf_password',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
    ssl: process.env.DATABASE_SSL === 'true',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-minimum-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    file: process.env.LOG_FILE,
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp').split(','),
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || (process.env.NODE_ENV === 'production' ? '12' : '4'), 10),
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production-minimum-32-chars',
  },
};

// Validate configuration
const validationResult = configSchema.safeParse(rawConfig);

if (!validationResult.success) {
  console.error('Configuration validation failed:');
  console.error(validationResult.error.format());
  process.exit(1);
}

export const config = validationResult.data;

// Helper functions for environment checks
export const isDevelopment = () => config.server.nodeEnv === 'development';
export const isProduction = () => config.server.nodeEnv === 'production';
export const isTest = () => config.server.nodeEnv === 'test';