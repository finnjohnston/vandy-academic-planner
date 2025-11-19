import { Term } from '@prisma/client';
import { prisma } from '../services/db.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from '../pipelines/types/pipeline.types.js';
import { DbTermInput } from '../transformers/types/db.term.input.js';

/**
 * Insert or update multiple terms
 * Uses upsert to handle both new and existing terms
 * Unique constraint: termId
 *
 * @param terms Array of term data to insert
 * @returns Array of inserted/updated terms
 */
export async function insertTerms(
  terms: DbTermInput[]
): Promise<PipelineResult<Term[]>> {
  logger.log(`Inserting ${terms.length} terms...`);

  try {
    const results: Term[] = [];

    // Process terms in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < terms.length; i += batchSize) {
      const batch = terms.slice(i, i + batchSize);

      logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(terms.length / batchSize)} (${batch.length} terms)`
      );

      // Use Promise.all for parallel upserts within batch
      const batchResults = await Promise.all(
        batch.map(async (term) => {
          try {
            return await prisma.term.upsert({
              where: {
                termId: term.termId,
              },
              update: {
                academicYearId: term.academicYearId,
                name: term.name,
              },
              create: {
                termId: term.termId,
                academicYearId: term.academicYearId,
                name: term.name,
              },
            });
          } catch (err) {
            logger.error(`Failed to upsert term ${term.termId}`, err);
            throw err;
          }
        })
      );

      results.push(...batchResults);
    }

    logger.success(`Successfully inserted ${results.length} terms`);
    return success(results);
  } catch (err) {
    logger.error(`Failed to insert terms`, err);
    return failure('Failed to insert terms', 'TERM_INSERT_FAILED', err);
  }
}

/**
 * Insert or update a single term
 * Convenience wrapper around insertTerms
 *
 * @param term Term data to insert
 * @returns The inserted/updated term
 */
export async function insertTerm(
  term: DbTermInput
): Promise<PipelineResult<Term>> {
  logger.log(`Inserting term ${term.termId}...`);

  const result = await insertTerms([term]);

  if (!result.success) {
    return result;
  }

  return success(result.data[0]);
}

/**
 * Get all terms for a specific academic year
 *
 * @param academicYearId Academic year ID
 * @returns Array of terms
 */
export async function getTermsForYear(
  academicYearId: number
): Promise<PipelineResult<Term[]>> {
  try {
    const terms = await prisma.term.findMany({
      where: { academicYearId },
      orderBy: { name: 'asc' },
    });

    return success(terms);
  } catch (err) {
    logger.error(
      `Failed to get terms for academic year ${academicYearId}`,
      err
    );
    return failure('Failed to get terms', 'TERM_GET_FAILED', err);
  }
}

/**
 * Delete all terms for a specific academic year
 * WARNING: This will cascade delete related classes and sections!
 *
 * @param academicYearId Academic year ID
 * @returns Number of deleted terms
 */
export async function deleteTermsForYear(
  academicYearId: number
): Promise<PipelineResult<number>> {
  logger.warn(`Deleting all terms for academic year ${academicYearId}...`);

  try {
    const result = await prisma.term.deleteMany({
      where: { academicYearId },
    });

    logger.success(
      `Deleted ${result.count} terms for academic year ${academicYearId}`
    );
    return success(result.count);
  } catch (err) {
    logger.error(
      `Failed to delete terms for academic year ${academicYearId}`,
      err
    );
    return failure('Failed to delete terms', 'TERM_DELETE_FAILED', err);
  }
}
