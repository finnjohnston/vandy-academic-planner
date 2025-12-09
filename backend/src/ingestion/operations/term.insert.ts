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

/**
 * Get all terms, optionally filtered by academic year
 *
 * @param academicYearId Optional academic year ID filter
 * @returns Array of terms ordered by name
 */
export async function getAllTerms(
  academicYearId?: number
): Promise<PipelineResult<Term[]>> {
  try {
    const terms = await prisma.term.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: { name: 'asc' },
    });

    logger.log(
      `Retrieved ${terms.length} terms${academicYearId ? ` for academic year ${academicYearId}` : ''}`
    );
    return success(terms);
  } catch (err) {
    logger.error('Failed to get terms', err);
    return failure('Failed to get terms', 'TERM_GET_FAILED', err);
  }
}

/**
 * Get specific term by ID
 *
 * @param id Term database ID
 * @returns Term or null if not found
 */
export async function getTermById(
  id: number
): Promise<PipelineResult<Term | null>> {
  try {
    const term = await prisma.term.findUnique({
      where: { id },
    });

    if (term) {
      logger.log(`Retrieved term ${id}: ${term.name}`);
    } else {
      logger.warn(`Term ${id} not found`);
    }

    return success(term);
  } catch (err) {
    logger.error(`Failed to get term ${id}`, err);
    return failure('Failed to get term', 'TERM_GET_FAILED', err);
  }
}

/**
 * Update term details
 *
 * @param id Term database ID
 * @param data Updated term data (name, academicYearId)
 * @returns Updated term
 */
export async function updateTerm(
  id: number,
  data: { name?: string; academicYearId?: number }
): Promise<PipelineResult<Term>> {
  try {
    const term = await prisma.term.update({
      where: { id },
      data,
    });

    logger.success(`Updated term ${id}`);
    return success(term);
  } catch (err: any) {
    // Handle P2025 (record not found)
    if (err?.code === 'P2025') {
      logger.warn(`Term ${id} not found`);
      return failure('Term not found', 'TERM_NOT_FOUND', err);
    }

    logger.error(`Failed to update term ${id}`, err);
    return failure('Failed to update term', 'TERM_UPDATE_FAILED', err);
  }
}
