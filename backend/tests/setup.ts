import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from '../src/config/index.js';
import { db } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test setup
beforeAll(async () => {
  logger.info('Setting up test environment...');
  
  try {
    // Ensure database connection
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed during test setup');
    }
    
    logger.info('Test database connection established');
  } catch (error) {
    logger.error('Test setup failed', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  logger.info('Tearing down test environment...');
  
  try {
    await db.close();
    logger.info('Test database connections closed');
  } catch (error) {
    logger.error('Test teardown failed', error);
  }
});

// Test case setup
beforeEach(async () => {
  // Begin transaction for test isolation (if needed)
  // This can be implemented later when we have more complex test scenarios
});

// Test case teardown
afterEach(async () => {
  // Rollback transaction for test isolation (if needed)
  // This can be implemented later when we have more complex test scenarios
});

// Test utilities
export const testUtils = {
  // Create test user
  createTestUser: async (overrides = {}) => {
    const defaultUser = {
      email: `test${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      passwordHash: '$2a$12$test.hash.for.testing.purposes',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    };

    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [defaultUser.email, defaultUser.username, defaultUser.passwordHash, defaultUser.firstName, defaultUser.lastName]
    );

    return result.rows[0];
  },

  // Create test game
  createTestGame: async (overrides = {}) => {
    const defaultGame = {
      title: `Test Game ${Date.now()}`,
      description: 'A test game for unit tests',
      yearPublished: 2023,
      minPlayers: 2,
      maxPlayers: 4,
      playingTime: 60,
      minAge: 10,
      complexity: 2.5,
      ...overrides,
    };

    const result = await db.query(
      `INSERT INTO games (title, description, year_published, min_players, max_players, playing_time, min_age, complexity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        defaultGame.title,
        defaultGame.description,
        defaultGame.yearPublished,
        defaultGame.minPlayers,
        defaultGame.maxPlayers,
        defaultGame.playingTime,
        defaultGame.minAge,
        defaultGame.complexity,
      ]
    );

    return result.rows[0];
  },

  // Clean up test data
  cleanupTestData: async () => {
    // Clean up in reverse dependency order
    await db.query("DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@example.com')");
    await db.query("DELETE FROM collection_entries WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@example.com')");
    await db.query("DELETE FROM game_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@example.com')");
    await db.query("DELETE FROM activities WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%@example.com')");
    await db.query("DELETE FROM users WHERE email LIKE 'test%@example.com'");
    await db.query("DELETE FROM games WHERE title LIKE 'Test Game %'");
  },

  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};