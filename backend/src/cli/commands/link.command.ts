import { Command } from 'commander';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { linkCoursesToClasses } from '../../ingestion/pipelines/link.pipeline.js';
import * as logger from '../../ingestion/services/logger.service.js';
import { prisma } from '../../ingestion/services/db.service.js';

/**
 * Validate academic year format (XXXX-YYYY)
 */
function validateYearFormat(year: string): boolean {
  const yearPattern = /^\d{4}-\d{4}$/;
  return yearPattern.test(year);
}

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
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Find a term by name or ID
 */
async function findTerm(identifier: string) {
  // Try to find by termId first
  let term = await prisma.term.findUnique({
    where: { termId: identifier },
  });

  // If not found, try to find by name
  if (!term) {
    term = await prisma.term.findFirst({
      where: {
        name: {
          contains: identifier,
          mode: 'insensitive',
        },
      },
    });
  }

  return term;
}

/**
 * Create the link command for linking classes to courses
 */
export function createLinkCommand(): Command {
  const command = new Command('link');

  command
    .description('Link classes to their corresponding catalog courses')
    .argument('[term]', 'Term name or ID to link (e.g., "Fall 2024" or "1248")')
    .option('-y, --year <year>', 'Academic year to link (e.g., "2024-2025")')
    .option('-e, --env <environment>', 'Environment to use (prod or test)', 'prod')
    .action(async (termArg, options) => {
      const startTime = Date.now();

      try {
        // Load environment
        const dbName = loadEnvironment(options.env);

        logger.log('='.repeat(80));
        logger.log('CLASS-COURSE LINKING');
        logger.log('='.repeat(80));
        logger.log(`Environment: ${options.env}`);
        logger.log(`Database: ${dbName}`);
        logger.log('');

        // Validate arguments
        if (termArg && options.year) {
          logger.error('Cannot specify both term and year. Please use one or the other.');
          process.exit(1);
        }

        if (options.year && !validateYearFormat(options.year)) {
          logger.error(`Invalid academic year format: ${options.year}`);
          logger.error('Expected format: XXXX-YYYY (e.g., 2024-2025)');
          process.exit(1);
        }

        let termId: string | undefined;
        let year: string | undefined;

        // Resolve term argument if provided
        if (termArg) {
          const term = await findTerm(termArg);

          if (!term) {
            logger.error(`Term not found: ${termArg}`);
            logger.log('');
            logger.log('Available terms:');

            const terms = await prisma.term.findMany({
              orderBy: { termId: 'desc' },
            });

            for (const t of terms) {
              logger.log(`  - ${t.name} (${t.termId})`);
            }

            await prisma.$disconnect();
            process.exit(1);
          }

          termId = term.termId;
          logger.log(`Linking classes in term: ${term.name} (${term.termId})`);
        } else if (options.year) {
          year = options.year;
          logger.log(`Linking classes in academic year: ${year}`);
        } else {
          logger.log('Linking all classes in database');
        }

        logger.log('');

        // Validate that there are classes to link
        let classCount = 0;
        if (termId) {
          classCount = await prisma.class.count({ where: { termId } });
        } else if (year) {
          const academicYear = await prisma.academicYear.findUnique({
            where: { year },
            include: { terms: true },
          });
          if (academicYear) {
            const termIds = academicYear.terms.map((t) => t.termId);
            classCount = await prisma.class.count({
              where: { termId: { in: termIds } },
            });
          }
        } else {
          classCount = await prisma.class.count();
        }

        if (classCount === 0) {
          logger.warn('No classes found to link');
          logger.log('');
          logger.log('Make sure you have scraped and ingested classes before running the link command.');
          await prisma.$disconnect();
          process.exit(0);
        }

        logger.log(`Found ${classCount} classes to process`);
        logger.log('');

        // Run linking pipeline
        const result = await linkCoursesToClasses(termId, year);

        // Disconnect from database
        await prisma.$disconnect();

        const duration = Date.now() - startTime;

        logger.log('');
        logger.log('='.repeat(80));

        if (result.success) {
          logger.success('LINKING COMPLETE');
          logger.log('');
          logger.log('Summary:');
          logger.log(`  Terms processed: ${result.data.termsProcessed}`);
          logger.log(`  Total classes: ${result.data.totalClasses}`);
          logger.log(`  Linked to courses: ${result.data.matched}`);
          logger.log(`  Orphans (no course): ${result.data.unmatched}`);
          logger.log(`  Records updated: ${result.data.updated}`);
          logger.log('');
          logger.log(`Duration: ${formatDuration(duration)}`);
          logger.log('='.repeat(80));
          process.exit(0);
        } else {
          logger.error('LINKING FAILED');
          logger.error(`Error: ${result.error}`);
          logger.log('');
          logger.log(`Duration: ${formatDuration(duration)}`);
          logger.log('='.repeat(80));
          process.exit(1);
        }
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.log('');
        logger.log('='.repeat(80));
        logger.error('LINKING FAILED');

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

        logger.log('');
        logger.log(`Duration: ${formatDuration(duration)}`);
        logger.log('='.repeat(80));

        await prisma.$disconnect();
        process.exit(1);
      }
    });

  return command;
}
