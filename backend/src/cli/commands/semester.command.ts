import { Command } from 'commander';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ingestSemester } from '../../ingestion/pipelines/semester.pipeline.js';
import { getTerms } from '../../ingestion/scrapers/functions.js';
import { getLatestTerm } from '../../ingestion/pipelines/services/term.service.js';
import { Term } from '../../ingestion/scrapers/types/term.type.js';
import * as logger from '../../ingestion/services/logger.service.js';

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
 * Display available terms in a formatted list
 */
function displayAvailableTerms(terms: Term[], latestTerm?: Term): void {
  logger.log('');
  logger.log('Available terms from Vanderbilt YES:');
  logger.log('');

  for (const term of terms) {
    const isLatest = latestTerm && term.id === latestTerm.id;
    const marker = isLatest ? ' [LATEST]' : '';
    logger.log(`  - ${term.title} (ID: ${term.id})${marker}`);
  }

  logger.log('');
}

/**
 * Find a term by name or ID from the available terms
 */
function findTermMatch(terms: Term[], input: string): Term | null {
  // Try exact match by title first
  let match = terms.find((t) => t.title === input);

  // Try case-insensitive match by title
  if (!match) {
    match = terms.find((t) => t.title.toLowerCase() === input.toLowerCase());
  }

  // Try match by ID
  if (!match) {
    match = terms.find((t) => t.id === input);
  }

  return match || null;
}

/**
 * Semester command: Scrape and ingest semester data (classes and sections) for a specific term
 */
export function createSemesterCommand(): Command {
  const command = new Command('semester');

  command
    .description('Scrape and ingest semester data (classes and sections) for a specific term')
    .argument('[term]', 'Term name (e.g., "Fall 2024") or term ID (e.g., "1248"). If omitted, uses latest term.')
    .option('-l, --list', 'List available terms without processing')
    .option(
      '-e, --env <environment>',
      'Environment to use (prod or test)',
      'prod'
    )
    .action(async (termArg: string | undefined, options: { list?: boolean; env: string }) => {
      try {
        // Load the specified environment
        const dbName = loadEnvironment(options.env);

        logger.log('='.repeat(60));
        logger.log('Starting semester ingestion');
        logger.log(`Environment: ${options.env}`);
        logger.log(`Database: ${dbName}`);
        logger.log('='.repeat(60));
        logger.log('');

        // Get available terms from YES system
        logger.log('Getting available terms from YES...');
        const availableTerms = await getTerms();
        logger.success(`Found ${availableTerms.length} available terms`);

        if (availableTerms.length === 0) {
          logger.error('No terms available from YES system');
          process.exit(1);
        }

        const latestTerm = getLatestTerm(availableTerms);

        // If --list flag, display terms and exit
        if (options.list) {
          displayAvailableTerms(availableTerms, latestTerm || undefined);
          process.exit(0);
        }

        // Select which term to process
        let selectedTerm: Term | null = null;

        if (termArg) {
          // User provided a term - find it
          selectedTerm = findTermMatch(availableTerms, termArg);

          if (!selectedTerm) {
            logger.log('');
            logger.error(`Term "${termArg}" not found`);
            displayAvailableTerms(availableTerms, latestTerm || undefined);
            logger.log('Please choose from the available terms above.');
            logger.log('='.repeat(60));
            process.exit(1);
          }

          logger.log(`Using specified term: ${selectedTerm.title} (ID: ${selectedTerm.id})`);
        } else {
          // No term provided - use latest
          if (!latestTerm) {
            logger.error('Could not determine latest term');
            displayAvailableTerms(availableTerms);
            process.exit(1);
          }

          selectedTerm = latestTerm;
          logger.log(`Using latest term: ${selectedTerm.title} (ID: ${selectedTerm.id})`);
        }

        logger.log('='.repeat(60));
        logger.log('');

        const startTime = Date.now();

        // Run the semester ingestion pipeline
        const result = await ingestSemester(selectedTerm.id);

        const duration = Date.now() - startTime;

        if (!result.success) {
          logger.log('');
          logger.log('='.repeat(60));
          logger.error('SEMESTER INGESTION FAILED');
          logger.log('='.repeat(60));
          logger.error(`Error: ${result.error.message}`);
          logger.error(`Code: ${result.error.code}`);
          if (result.error.details) {
            logger.error(`Details: ${JSON.stringify(result.error.details, null, 2)}`);
          }
          logger.log(`Duration: ${formatDuration(duration)}`);
          logger.log('='.repeat(60));
          process.exit(1);
        }

        // Display success summary
        const summary = result.data;
        logger.log('');
        logger.log('='.repeat(60));
        logger.success('SEMESTER INGESTION COMPLETED SUCCESSFULLY');
        logger.log('='.repeat(60));
        logger.log(`Term: ${summary.termName} (ID: ${summary.termId})`);
        logger.log(`Academic Year ID: ${summary.academicYearId}`);
        logger.log('');
        logger.log('Classes:');
        logger.log(`  Scraped: ${summary.classesScraped}`);
        logger.log(`  Parsed: ${summary.classesParsed}`);
        logger.log(`  Upserted: ${summary.classesUpserted}`);
        logger.log(`  Deleted: ${summary.classesDeleted}`);
        logger.log('');
        logger.log('Sections:');
        logger.log(`  Scraped: ${summary.sectionsScraped}`);
        logger.log(`  Parsed: ${summary.sectionsParsed}`);
        logger.log(`  Upserted: ${summary.sectionsUpserted}`);
        logger.log(`  Deleted: ${summary.sectionsDeleted}`);
        logger.log('');
        logger.log(`Total Errors: ${summary.errors}`);
        logger.log(`Total Duration: ${formatDuration(duration)}`);
        logger.log(`Pipeline Duration: ${formatDuration(summary.duration)}`);
        logger.log('='.repeat(60));

        process.exit(0);
      } catch (err) {
        logger.log('');
        logger.log('='.repeat(60));
        logger.error('UNEXPECTED ERROR');
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
