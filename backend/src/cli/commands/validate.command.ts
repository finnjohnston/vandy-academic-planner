import { Command } from 'commander';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { runValidation } from '../../ingestion/validation/validator.js';
import * as logger from '../../ingestion/services/logger.service.js';
import { prisma } from '../../ingestion/services/db.service.js';

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
 * Create the validate command for database integrity checks
 */
export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Run database integrity validation checks')
    .option('-d, --dry-run', 'Preview changes without applying them', false)
    .option('-e, --env <environment>', 'Environment to use (prod or test)', 'prod')
    .action(async (options) => {
      try {
        // Load environment
        const dbName = loadEnvironment(options.env);

        // Confirm with user if not in dry-run mode and using prod
        if (!options.dryRun && options.env === 'prod') {
          logger.warn('WARNING: You are about to modify the PRODUCTION database');
          logger.warn(`Database: ${dbName}`);
          logger.log('');
          logger.log('This will:');
          logger.log('  - Delete invalid/duplicate records');
          logger.log('  - Fix data inconsistencies');
          logger.log('  - Update credit ranges');
          logger.log('');
          logger.log('Run with --dry-run first to preview changes.');
          logger.log('');
          logger.error('Aborting. Use --dry-run to preview changes safely.');
          process.exit(1);
        }

        // Run validation
        const report = await runValidation(options.dryRun, options.env);

        // Disconnect from database
        await prisma.$disconnect();

        // Exit with appropriate code
        if (report.summary.totalErrors > 0) {
          process.exit(1);
        } else if (report.summary.totalFailed > 0 && options.dryRun) {
          // Issues found in dry-run mode - exit with warning code
          process.exit(0);
        } else {
          process.exit(0);
        }
      } catch (error) {
        logger.log('');
        logger.log('='.repeat(60));
        logger.error('VALIDATION FAILED');

        if (error instanceof Error) {
          logger.error(`Error: ${error.message}`);

          if (error.stack) {
            logger.log('');
            logger.log('Stack trace:');
            logger.log(error.stack);
          }
        } else {
          logger.error(`Unknown error: ${String(error)}`);
        }

        logger.log('='.repeat(60));

        await prisma.$disconnect();
        process.exit(1);
      }
    });

  return command;
}
