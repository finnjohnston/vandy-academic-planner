import { Command } from 'commander';
import { ingestCatalog } from '../../ingestion/pipelines/catalog.pipeline.js';
import * as logger from '../../ingestion/services/logger.service.js';

/**
 * Validate academic year format (XXXX-YYYY)
 */
function validateYearFormat(year: string): boolean {
  const yearPattern = /^\d{4}-\d{4}$/;
  return yearPattern.test(year);
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
 * Catalog command: Scrape and ingest course catalog for a specific academic year
 */
export function createCatalogCommand(): Command {
  const command = new Command('catalog');

  command
    .description('Scrape and ingest the course catalog for a specific academic year')
    .argument('<year>', 'Academic year in format XXXX-YYYY (e.g., 2024-2025)')
    .action(async (year: string) => {
      try {
        // Validate year format
        if (!validateYearFormat(year)) {
          logger.error(
            `Invalid year format: "${year}". Expected format: XXXX-YYYY (e.g., 2024-2025)`
          );
          process.exit(1);
        }

        logger.log('='.repeat(60));
        logger.log(`Starting catalog ingestion for academic year: ${year}`);
        logger.log('='.repeat(60));
        logger.log('');

        const startTime = Date.now();

        // Run the catalog ingestion pipeline
        const result = await ingestCatalog(year);

        const duration = Date.now() - startTime;

        if (!result.success) {
          logger.log('');
          logger.log('='.repeat(60));
          logger.error('CATALOG INGESTION FAILED');
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
        logger.success('CATALOG INGESTION COMPLETED SUCCESSFULLY');
        logger.log('='.repeat(60));
        logger.log(`Academic Year: ${year}`);
        logger.log(`Academic Year ID: ${summary.academicYearId}`);
        logger.log('');
        logger.log('Statistics:');
        logger.log(`  Courses Scraped: ${summary.scraped}`);
        logger.log(`  Courses Parsed: ${summary.parsed}`);
        logger.log(`  Courses Upserted: ${summary.upserted}`);
        logger.log(`  Courses Deleted: ${summary.deleted}`);
        logger.log(`  Errors: ${summary.errors}`);
        logger.log('');
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
