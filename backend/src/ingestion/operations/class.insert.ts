import { Class } from '@prisma/client';
import { prisma } from '../services/db.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from '../pipelines/types/pipeline.types.js';
import { DbClassInput } from '../transformers/types/db.class.input.js';

/**
 * Insert or update multiple classes
 * Uses upsert to handle both new and existing classes
 * Unique constraint: termId + subjectCode + courseNumber
 *
 * @param classes Array of class data to insert
 * @returns Array of inserted/updated classes
 */
export async function insertClasses(
  classes: DbClassInput[]
): Promise<PipelineResult<Class[]>> {
  logger.log(`Inserting ${classes.length} classes...`);

  try {
    const results: Class[] = [];

    // Process classes in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < classes.length; i += batchSize) {
      const batch = classes.slice(i, i + batchSize);

      logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(classes.length / batchSize)} (${batch.length} classes)`
      );

      // Use Promise.all for parallel upserts within batch
      const batchResults = await Promise.all(
        batch.map(async (classData) => {
          try {
            return await prisma.class.upsert({
              where: {
                termId_subjectCode_courseNumber: {
                  termId: classData.termId,
                  subjectCode: classData.subjectCode,
                  courseNumber: classData.courseNumber,
                },
              },
              update: {
                classId: classData.classId,
                title: classData.title,
                school: classData.school,
                creditsMin: classData.creditsMin,
                creditsMax: classData.creditsMax,
                description: classData.description,
                attributes: classData.attributes,
                requirements: classData.requirements,
              },
              create: {
                classId: classData.classId,
                termId: classData.termId,
                subjectCode: classData.subjectCode,
                courseNumber: classData.courseNumber,
                title: classData.title,
                school: classData.school,
                creditsMin: classData.creditsMin,
                creditsMax: classData.creditsMax,
                description: classData.description,
                attributes: classData.attributes,
                requirements: classData.requirements,
              },
            });
          } catch (err) {
            logger.error(
              `Failed to upsert class ${classData.subjectCode} ${classData.courseNumber} (${classData.termId})`,
              err
            );
            throw err;
          }
        })
      );

      results.push(...batchResults);
    }

    logger.success(`Successfully inserted ${results.length} classes`);
    return success(results);
  } catch (err) {
    logger.error(`Failed to insert classes`, err);
    return failure('Failed to insert classes', 'CLASS_INSERT_FAILED', err);
  }
}

/**
 * Insert or update a single class
 * Convenience wrapper around insertClasses
 *
 * @param classData Class data to insert
 * @returns The inserted/updated class
 */
export async function insertClass(
  classData: DbClassInput
): Promise<PipelineResult<Class>> {
  logger.log(
    `Inserting class ${classData.subjectCode} ${classData.courseNumber}...`
  );

  const result = await insertClasses([classData]);

  if (!result.success) {
    return result;
  }

  return success(result.data[0]);
}

/**
 * Get all classes for a specific term
 *
 * @param termId Term ID
 * @returns Array of classes
 */
export async function getClassesForTerm(
  termId: string
): Promise<PipelineResult<Class[]>> {
  try {
    const classes = await prisma.class.findMany({
      where: { termId },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });

    return success(classes);
  } catch (err) {
    logger.error(`Failed to get classes for term ${termId}`, err);
    return failure('Failed to get classes', 'CLASS_GET_FAILED', err);
  }
}

/**
 * Delete stale classes for a term that are no longer in the scraped data
 * This removes classes that existed before but weren't present in the latest scrape
 *
 * @param termId Term ID
 * @param currentClassIds Array of class IDs that exist in current scrape
 * @returns Number of deleted classes
 */
export async function deleteStaleClasses(
  termId: string,
  currentClassIds: string[]
): Promise<PipelineResult<number>> {
  logger.log(
    `Deleting stale classes for term ${termId} (keeping ${currentClassIds.length} current classes)...`
  );

  try {
    const result = await prisma.class.deleteMany({
      where: {
        termId,
        classId: {
          notIn: currentClassIds,
        },
      },
    });

    if (result.count > 0) {
      logger.warn(`Deleted ${result.count} stale classes for term ${termId}`);
    } else {
      logger.log(`No stale classes to delete for term ${termId}`);
    }

    return success(result.count);
  } catch (err) {
    logger.error(`Failed to delete stale classes for term ${termId}`, err);
    return failure(
      'Failed to delete stale classes',
      'CLASS_DELETE_FAILED',
      err
    );
  }
}
