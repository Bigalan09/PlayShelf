#!/usr/bin/env node

import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { db } from './config/database.js';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const isDbHealthy = await db.healthCheck();
    
    if (!isDbHealthy) {
      throw new Error('Database health check failed');
    }
    
    logger.info('Database connection successful');

    // Create HTTP server
    const server = createServer(app);

    // Start server
    server.listen(config.server.port, () => {
      logger.info(`🚀 PlayShelf Backend Server started successfully!`);
      logger.info(`📊 Environment: ${config.server.nodeEnv}`);
      logger.info(`🌐 Server: http://localhost:${config.server.port}`);
      logger.info(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      logger.info(`🔄 CORS Origin: ${config.server.corsOrigin}`);
      logger.info(`📖 Health Check: http://localhost:${config.server.port}/health`);
      logger.info(`📋 API Info: http://localhost:${config.server.port}/`);
      
      if (config.server.nodeEnv === 'development') {
        logger.info('');
        logger.info('Development endpoints:');
        logger.info(`  • Health Check: http://localhost:${config.server.port}/health`);
        logger.info(`  • Detailed Health: http://localhost:${config.server.port}/health/detailed`);
        logger.info(`  • API v1: http://localhost:${config.server.port}/api/v1`);
        logger.info(`  • Quick Ping: http://localhost:${config.server.port}/ping`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await db.close();
          logger.info('Database connections closed');
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.server.port === 'string' 
        ? `Pipe ${config.server.port}` 
        : `Port ${config.server.port}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;