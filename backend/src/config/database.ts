import { Pool, PoolConfig } from 'pg';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    const poolConfig: PoolConfig = {
      connectionString: config.database.url,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connection
    this.pool.on('connect', () => {
      logger.info('Database connected successfully');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as now');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

export const db = Database.getInstance();
export default Database;