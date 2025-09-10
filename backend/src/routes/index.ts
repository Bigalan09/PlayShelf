import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import gameRoutes from './games.js';
import collectionRoutes from './collections.js';
import listRoutes from './lists.js';
import metadataRoutes from './metadata.js';
import reviewRoutes from './reviews.js';
import activityRoutes from './activities.js';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Health routes (no version prefix for infrastructure)
router.use('/health', healthRoutes);

// Versioned API routes
router.use(`${API_VERSION}/health`, healthRoutes);
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/games`, gameRoutes);
router.use(`${API_VERSION}/collections`, collectionRoutes);
router.use(`${API_VERSION}/lists`, listRoutes);
router.use(`${API_VERSION}/metadata`, metadataRoutes);
router.use(`${API_VERSION}/reviews`, reviewRoutes);
router.use(`${API_VERSION}/activities`, activityRoutes);

// Root API info
router.get('/', (req, res) => {
  res.json({
    name: 'PlayShelf API',
    version: '1.0.0',
    description: 'Board game collection tracking API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: API_VERSION,
    },
    documentation: {
      swagger: `${API_VERSION}/docs`,
      postman: `${API_VERSION}/docs/postman`,
    },
  });
});

router.get(API_VERSION, (req, res) => {
  res.json({
    name: 'PlayShelf API',
    version: '1.0.0',
    description: 'Board game collection tracking API - Version 1',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${API_VERSION}/health`,
      auth: `${API_VERSION}/auth`,
      users: `${API_VERSION}/users`,
      games: `${API_VERSION}/games`,
      collections: `${API_VERSION}/collections`,
      lists: `${API_VERSION}/lists`,
      metadata: `${API_VERSION}/metadata`,
      reviews: `${API_VERSION}/reviews`,
      activities: `${API_VERSION}/activities`,
      // TODO: Add other endpoint categories as they're implemented
      // sessions: `${API_VERSION}/sessions`,
    },
  });
});

export default router;