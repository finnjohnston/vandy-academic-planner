import { ingestCatalog } from './ingestion/pipelines/catalog.pipeline.js';
import * as logger from './ingestion/services/logger.service.js';

/**
 * Run the full catalog ingestion pipeline
 * Scrapes ALL undergraduate courses from ALL subjects
 */
async function runCatalogPipeline() {
  try {
    logger.log('Starting full catalog ingestion...');
    logger.log('This will scrape ALL undergraduate courses from ALL subjects');
    logger.log('');

    const result = await ingestCatalog('2024-2025', 2024, 2025);

    if (!result.success) {
      logger.error('Catalog pipeline failed:', result.error);
      process.exit(1);
    }

    logger.log('');
    logger.success('Catalog pipeline completed successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the pipeline
runCatalogPipeline();
