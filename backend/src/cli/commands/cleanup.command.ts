import { Command } from 'commander';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { db } from '../../ingestion/services/db.service.js';
import * as logger from '../../ingestion/services/logger.service.js';
import * as readline from 'readline';

/**
 * Load environment variables from the specified environment file
 */
function loadEnvironment(env: string): string {
  const envFile = env === 'prod' ? '.env' : `.env.${env}`;
  const envPath = resolve(process.cwd(), envFile);

  if (!existsSync(envPath)) {
    logger.error(`Environment file not found: ${envFile}`);
    logger.error(`Expected path: ${envPath}`);
    logger.log('');
    logger.log('Available environments:');
    logger.log('  - prod (uses .env)');
    logger.log('  - test (uses .env.test)');
    process.exit(1);
  }

  // Load the environment file
  config({ path: envPath, override: true });

  // Get the database URL to display to user
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const dbName = dbUrl.split('/').pop() || 'unknown';

  return dbName;
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Cleanup command: Database maintenance and reset operations
 */
export function createCleanupCommand(): Command {
  const command = new Command('cleanup');

  command
    .description('Database cleanup and maintenance operations');

  // Subcommand: reset
  command
    .command('reset')
    .description('Clear all data from the database (sections, classes, courses, terms, academic years)')
    .option(
      '-e, --env <environment>',
      'Environment to use (prod or test)',
      'prod'
    )
    .option(
      '-f, --force',
      'Skip confirmation prompt (use with caution)',
      false
    )
    .action(async (options: { env: string; force: boolean }) => {
      try {
        // Load the specified environment
        const dbName = loadEnvironment(options.env);

        logger.log('='.repeat(60));
        logger.log('DATABASE RESET COMMAND');
        logger.log('='.repeat(60));
        logger.log(`Environment: ${options.env}`);
        logger.log(`Database: ${dbName}`);
        logger.log('='.repeat(60));
        logger.log('');

        // Warning message
        logger.warn('This will delete ALL data from the database!');
        logger.log('');
        logger.log('The following tables will be cleared:');
        logger.log('  - Sections');
        logger.log('  - Classes');
        logger.log('  - Courses');
        logger.log('  - Terms');
        logger.log('  - Academic Years');
        logger.log('');

        // Confirmation prompt (unless --force is used)
        if (!options.force) {
          const confirmed = await promptConfirmation(
            `Are you sure you want to reset the ${options.env} database (${dbName})?`
          );

          if (!confirmed) {
            logger.log('');
            logger.log('Reset cancelled.');
            logger.log('='.repeat(60));
            process.exit(0);
          }
        } else {
          logger.warn('Skipping confirmation (--force flag used)');
        }

        logger.log('');
        logger.log('Starting database reset...');
        logger.log('');

        const startTime = Date.now();

        // Call the database reset function
        await db.reset();

        const duration = Date.now() - startTime;

        logger.log('');
        logger.log('='.repeat(60));
        logger.success('DATABASE RESET COMPLETE');
        logger.log('='.repeat(60));
        logger.log(`Duration: ${duration}ms`);
        logger.log('All data has been successfully deleted.');
        logger.log('='.repeat(60));

        process.exit(0);
      } catch (err) {
        logger.log('');
        logger.log('='.repeat(60));
        logger.error('DATABASE RESET FAILED');
        logger.log('='.repeat(60));
        logger.error(err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.stack) {
          logger.error('');
          logger.error('Stack trace:');
          logger.error(err.stack);
        }
        logger.log('='.repeat(60));
        process.exit(1);
      }
    });

  return command;
}
