import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Basic health check
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check database connection
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbLatency: number | undefined;
  
  try {
    const dbStartTime = Date.now();
    const isHealthy = await db.healthCheck();
    dbLatency = Date.now() - dbStartTime;
    dbStatus = isHealthy ? 'connected' : 'error';
  } catch (error) {
    logger.error('Health check database error', error);
    dbStatus = 'error';
  }

  // Get memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  const healthStatus: HealthStatus = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.nodeEnv,
    uptime: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        ...(dbLatency !== undefined && { latency: dbLatency }),
      },
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: memoryPercentage,
      },
    },
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  const responseTime = Date.now() - startTime;

  res.set('X-Response-Time', `${responseTime}ms`);
  res.status(statusCode).json(healthStatus);
}));

// Detailed health check (for monitoring systems)
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Database health check with query test
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbLatency: number | undefined;
  let dbDetails: any = {};
  
  try {
    const dbStartTime = Date.now();
    
    // Test basic connection
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      dbStatus = 'error';
    } else {
      // Test actual query
      const result = await db.query('SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = $1', ['active']);
      dbLatency = Date.now() - dbStartTime;
      dbStatus = 'connected';
      
      // Get database stats
      const statsResult = await db.query(`
        SELECT 
          pg_database_size(current_database()) as db_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          current_setting('max_connections')::int as max_connections
      `);
      
      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        dbDetails = {
          size: Math.round(parseInt(stats.db_size) / 1024 / 1024), // MB
          activeConnections: parseInt(stats.active_connections),
          maxConnections: parseInt(stats.max_connections),
        };
      }
    }
  } catch (error) {
    logger.error('Detailed health check database error', error);
    dbStatus = 'error';
    dbDetails = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // System information
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const detailedHealth = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.nodeEnv,
    uptime: Math.floor(process.uptime()),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    services: {
      database: {
        status: dbStatus,
        ...(dbLatency !== undefined && { latency: dbLatency }),
        ...dbDetails,
      },
    },
    system: {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    },
  };

  const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
  const responseTime = Date.now() - startTime;

  res.set('X-Response-Time', `${responseTime}ms`);
  res.status(statusCode).json(detailedHealth);
}));

// Readiness check (for Kubernetes/orchestration)
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    const isDbReady = await db.healthCheck();
    
    if (!isDbReady) {
      res.status(503).json({
        status: 'not ready',
        message: 'Database is not ready',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      message: 'Service is not ready',
      timestamp: new Date().toISOString(),
    });
  }
}));

// Liveness check (for Kubernetes/orchestration)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;