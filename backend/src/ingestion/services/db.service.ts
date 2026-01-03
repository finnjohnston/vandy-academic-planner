import { PrismaClient } from '@prisma/client';
import * as logger from './logger.service.js';

/**
 * Singleton database service for the ingestion pipeline
 * Provides centralized Prisma client management and utilities
 */
class DatabaseService {
  private static instance: PrismaClient | null = null;

  /**
   * Get the Prisma client instance (creates if doesn't exist)
   * @returns Singleton Prisma client
   */
  static getClient(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: [
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      // Log Prisma errors
      this.instance.$on('error' as never, (e: any) => {
        logger.error('Prisma error', e);
      });

      // Log Prisma warnings
      this.instance.$on('warn' as never, (e: any) => {
        logger.warn(`Prisma warning: ${e.message}`);
      });

      logger.log('Database client initialized');
    }
    return this.instance;
  }

  /**
   * Disconnect from database and cleanup
   * Call this when shutting down the application
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      logger.log('Database client disconnected');
    }
  }

  /**
   * Check database connection health
   * @returns true if database is reachable, false otherwise
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      logger.error('Database health check failed', err);
      return false;
    }
  }

  /**
   * Execute multiple operations in a transaction
   * All operations succeed or all fail together
   * @param operations Function that performs database operations
   * @returns Result of the operations
   */
  static async transaction<T>(
    operations: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.getClient();
    return await client.$transaction(async (tx) => {
      return await operations(tx as PrismaClient);
    });
  }

  /**
   * Reset the database (WARNING: Deletes all data)
   * Only use in development/testing
   */
  static async reset(): Promise<void> {
    const client = this.getClient();

    logger.warn('Resetting database - all data will be deleted!');

    // Delete in reverse order of foreign keys
    await client.section.deleteMany();
    await client.class.deleteMany();
    await client.course.deleteMany();
    await client.term.deleteMany();
    await client.academicYear.deleteMany();

    logger.warn('Database reset complete');
  }
}

/**
 * Singleton Prisma client instance
 * Use this for all database operations in the ingestion pipeline
 *
 * @example
 * import { prisma } from './services/db.service.js';
 *
 * const courses = await prisma.course.findMany();
 */
export const prisma = DatabaseService.getClient();

/**
 * Database utility functions
 */
export const db = {
  /**
   * Disconnect from database
   */
  disconnect: () => DatabaseService.disconnect(),

  /**
   * Check if database connection is healthy
   */
  healthCheck: () => DatabaseService.healthCheck(),

  /**
   * Execute operations in a transaction
   */
  transaction: DatabaseService.transaction,

  /**
   * Reset database (development only)
   */
  reset: () => DatabaseService.reset(),
};

/**
 * Handle graceful shutdown
 * Disconnect from database when process exits
 *
 * NOTE: These event handlers are commented out because they interfere with
 * the long-running Express server. They should only be used in CLI scripts.
 * The main server has its own shutdown handlers in config/prisma.ts
 */
// process.on('beforeExit', async () => {
//   await db.disconnect();
// });

// process.on('SIGINT', async () => {
//   await db.disconnect();
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   await db.disconnect();
//   process.exit(0);
// });
