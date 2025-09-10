#!/usr/bin/env tsx

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Migration, MigrationRecord } from '../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(__dirname, '../migrations');
  }

  async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();
    } catch (error) {
      logger.error('Failed to read migrations directory', error);
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      // Create migrations table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(10) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const result = await db.query('SELECT * FROM migrations ORDER BY id');
      return result.rows;
    } catch (error) {
      logger.error('Failed to get executed migrations', error);
      throw error;
    }
  }

  async loadMigration(filePath: string): Promise<Migration> {
    try {
      const migrationPath = join(this.migrationsPath, filePath);
      const migrationModule = await import(migrationPath);
      return migrationModule.default;
    } catch (error) {
      logger.error(`Failed to load migration ${filePath}`, error);
      throw error;
    }
  }

  async executeMigration(migration: Migration): Promise<void> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      logger.info(`Executing migration: ${migration.name}`);
      await migration.up(client);
      
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${migration.name} completed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration ${migration.name} failed`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      logger.info(`Rolling back migration: ${migration.name}`);
      await migration.down(client);
      
      await client.query(
        'DELETE FROM migrations WHERE id = $1',
        [migration.id]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${migration.name} rolled back successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Rollback of migration ${migration.name} failed`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    try {
      logger.info('Starting migration process...');
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));

      const pendingMigrations = migrationFiles.filter(file => {
        const id = file.split('_')[0];
        return !executedIds.has(id);
      });

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to execute');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const file of pendingMigrations) {
        const migration = await this.loadMigration(file);
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed', error);
      throw error;
    }
  }

  async rollbackLastMigration(): Promise<void> {
    try {
      logger.info('Starting rollback process...');
      
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = executedMigrations[executedMigrations.length - 1];
      const migrationFiles = await this.getMigrationFiles();
      const migrationFile = migrationFiles.find(file => file.startsWith(lastMigration.id));

      if (!migrationFile) {
        throw new Error(`Migration file not found for ${lastMigration.name}`);
      }

      const migration = await this.loadMigration(migrationFile);
      await this.rollbackMigration(migration);

      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error('Rollback process failed', error);
      throw error;
    }
  }

  async getStatus(): Promise<void> {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(m => m.id));

      logger.info('Migration Status:');
      logger.info('================');

      for (const file of migrationFiles) {
        const id = file.split('_')[0];
        const status = executedIds.has(id) ? '✓ EXECUTED' : '✗ PENDING';
        const migration = await this.loadMigration(file);
        logger.info(`${status} - ${migration.name} (${id})`);
      }

      const pendingCount = migrationFiles.filter(file => {
        const id = file.split('_')[0];
        return !executedIds.has(id);
      }).length;

      logger.info('================');
      logger.info(`Total migrations: ${migrationFiles.length}`);
      logger.info(`Executed: ${executedMigrations.length}`);
      logger.info(`Pending: ${pendingCount}`);
    } catch (error) {
      logger.error('Failed to get migration status', error);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runner = new MigrationRunner();

  try {
    if (args.includes('--rollback')) {
      await runner.rollbackLastMigration();
    } else if (args.includes('--status')) {
      await runner.getStatus();
    } else {
      await runner.runMigrations();
    }
  } catch (error) {
    logger.error('Migration script failed', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationRunner;