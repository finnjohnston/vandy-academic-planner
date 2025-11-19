import { Section } from '@prisma/client';
import { prisma } from '../services/db.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from '../pipelines/types/pipeline.types.js';
import { DbSectionInput } from '../transformers/types/db.section.input.js';

/**
 * Section data with classId for database insertion
 */
export interface DbSectionWithClass extends DbSectionInput {
  classId: string;
}

/**
 * Insert or update multiple sections
 * Uses upsert to handle both new and existing sections
 * Unique constraint: sectionId
 *
 * @param sections Array of section data with classId to insert
 * @returns Array of inserted/updated sections
 */
export async function insertSections(
  sections: DbSectionWithClass[]
): Promise<PipelineResult<Section[]>> {
  logger.log(`Inserting ${sections.length} sections...`);

  try {
    const results: Section[] = [];

    // Process sections in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);

      logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sections.length / batchSize)} (${batch.length} sections)`
      );

      // Use Promise.all for parallel upserts within batch
      const batchResults = await Promise.all(
        batch.map(async (section) => {
          try {
            return await prisma.section.upsert({
              where: {
                sectionId: section.sectionId,
              },
              update: {
                termId: section.termId,
                classId: section.classId,
                sectionNumber: section.sectionNumber,
                sectionType: section.sectionType,
                instructors: section.instructors,
                schedule: section.schedule,
                creditsMin: section.creditsMin,
                creditsMax: section.creditsMax,
              },
              create: {
                sectionId: section.sectionId,
                termId: section.termId,
                classId: section.classId,
                sectionNumber: section.sectionNumber,
                sectionType: section.sectionType,
                instructors: section.instructors,
                schedule: section.schedule,
                creditsMin: section.creditsMin,
                creditsMax: section.creditsMax,
              },
            });
          } catch (err) {
            logger.error(`Failed to upsert section ${section.sectionId}`, err);
            throw err;
          }
        })
      );

      results.push(...batchResults);
    }

    logger.success(`Successfully inserted ${results.length} sections`);
    return success(results);
  } catch (err) {
    logger.error(`Failed to insert sections`, err);
    return failure('Failed to insert sections', 'SECTION_INSERT_FAILED', err);
  }
}

/**
 * Insert or update a single section
 * Convenience wrapper around insertSections
 *
 * @param section Section data with classId to insert
 * @returns The inserted/updated section
 */
export async function insertSection(
  section: DbSectionWithClass
): Promise<PipelineResult<Section>> {
  logger.log(`Inserting section ${section.sectionId}...`);

  const result = await insertSections([section]);

  if (!result.success) {
    return result;
  }

  return success(result.data[0]);
}

/**
 * Get all sections for a specific term
 *
 * @param termId Term ID
 * @returns Array of sections
 */
export async function getSectionsForTerm(
  termId: string
): Promise<PipelineResult<Section[]>> {
  try {
    const sections = await prisma.section.findMany({
      where: { termId },
      orderBy: { sectionNumber: 'asc' },
    });

    return success(sections);
  } catch (err) {
    logger.error(`Failed to get sections for term ${termId}`, err);
    return failure('Failed to get sections', 'SECTION_GET_FAILED', err);
  }
}

/**
 * Get all sections for a specific class
 *
 * @param classId Class ID
 * @returns Array of sections
 */
export async function getSectionsForClass(
  classId: string
): Promise<PipelineResult<Section[]>> {
  try {
    const sections = await prisma.section.findMany({
      where: { classId },
      orderBy: { sectionNumber: 'asc' },
    });

    return success(sections);
  } catch (err) {
    logger.error(`Failed to get sections for class ${classId}`, err);
    return failure('Failed to get sections', 'SECTION_GET_FAILED', err);
  }
}

/**
 * Delete stale sections for a term that are no longer in the scraped data
 * This removes sections that existed before but weren't present in the latest scrape
 *
 * @param termId Term ID
 * @param currentSectionIds Array of section IDs that exist in current scrape
 * @returns Number of deleted sections
 */
export async function deleteStaleSections(
  termId: string,
  currentSectionIds: string[]
): Promise<PipelineResult<number>> {
  logger.log(
    `Deleting stale sections for term ${termId} (keeping ${currentSectionIds.length} current sections)...`
  );

  try {
    const result = await prisma.section.deleteMany({
      where: {
        termId,
        sectionId: {
          notIn: currentSectionIds,
        },
      },
    });

    if (result.count > 0) {
      logger.warn(`Deleted ${result.count} stale sections for term ${termId}`);
    } else {
      logger.log(`No stale sections to delete for term ${termId}`);
    }

    return success(result.count);
  } catch (err) {
    logger.error(`Failed to delete stale sections for term ${termId}`, err);
    return failure(
      'Failed to delete stale sections',
      'SECTION_DELETE_FAILED',
      err
    );
  }
}
