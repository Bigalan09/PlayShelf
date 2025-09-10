import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health Endpoints', () => {
  describe('GET /ping', () => {
    it('should return ok status', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        uptime: expect.any(Number),
        services: {
          database: {
            status: expect.stringMatching(/^(connected|disconnected|error)$/),
          },
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          },
        },
      });

      // Response should include timing header
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
    });

    it('should return 200 when healthy', async () => {
      const response = await request(app)
        .get('/health');

      if (response.body.status === 'healthy') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        uptime: expect.any(Number),
        node: {
          version: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
        },
        services: {
          database: {
            status: expect.stringMatching(/^(connected|disconnected|error)$/),
          },
        },
        system: {
          memory: {
            rss: expect.any(Number),
            heapTotal: expect.any(Number),
            heapUsed: expect.any(Number),
            external: expect.any(Number),
            arrayBuffers: expect.any(Number),
          },
          cpu: {
            user: expect.any(Number),
            system: expect.any(Number),
          },
        },
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ready|not ready)$/),
        timestamp: expect.any(String),
      });

      if (response.body.status === 'ready') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('GET /api/v1/health', () => {
    it('should work with versioned API path', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.any(String),
      });
    });
  });
});