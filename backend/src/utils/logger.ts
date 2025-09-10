import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Define log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always present)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  })
);

// File transport (if specified)
if (config.logging.file) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

// Add stream interface for integration with Express morgan middleware
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logDatabase = (message: string, meta?: any) => {
  logger.debug(`[DATABASE] ${message}`, meta);
};

export const logAuth = (message: string, meta?: any) => {
  logger.info(`[AUTH] ${message}`, meta);
};

export const logAPI = (message: string, meta?: any) => {
  logger.info(`[API] ${message}`, meta);
};

export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
};

export const logSecurity = (message: string, meta?: any) => {
  logger.warn(`[SECURITY] ${message}`, meta);
};

export default logger;