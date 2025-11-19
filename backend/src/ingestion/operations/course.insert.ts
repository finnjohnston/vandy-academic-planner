import { Course } from '@prisma/client';
import { prisma } from '../services/db.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from '../pipelines/types/pipeline.types.js';
import { DbCourseInput } from '../transformers/types/db.course.input.js';

/**
 * Insert or update multiple courses
 * Uses upsert to handle both new and existing courses
 * Unique constraint: academicYearId + subjectCode + courseNumber
 *
 * @param courses Array of course data to insert
 * @returns Array of inserted/updated courses
 */
export async function insertCourses(
  courses: DbCourseInput[]
): Promise<PipelineResult<Course[]>> {
  logger.log(`Inserting ${courses.length} courses...`);

  try {
    const results: Course[] = [];

    // Process courses in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);

      logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(courses.length / batchSize)} (${batch.length} courses)`
      );

      // Use Promise.all for parallel upserts within batch
      const batchResults = await Promise.all(
        batch.map(async (course) => {
          try {
            return await prisma.course.upsert({
              where: {
                academicYearId_subjectCode_courseNumber: {
                  academicYearId: course.academicYearId,
                  subjectCode: course.subjectCode,
                  courseNumber: course.courseNumber,
                },
              },
              update: {
                courseId: course.courseId,
                title: course.title,
                school: course.school,
                creditsMin: course.creditsMin,
                creditsMax: course.creditsMax,
                typicallyOffered: course.typicallyOffered,
                description: course.description,
                attributes: course.attributes,
                requirements: course.requirements,
              },
              create: {
                courseId: course.courseId,
                academicYearId: course.academicYearId,
                subjectCode: course.subjectCode,
                courseNumber: course.courseNumber,
                title: course.title,
                school: course.school,
                creditsMin: course.creditsMin,
                creditsMax: course.creditsMax,
                typicallyOffered: course.typicallyOffered,
                description: course.description,
                attributes: course.attributes,
                requirements: course.requirements,
                isCatalogCourse: true,
              },
            });
          } catch (err) {
            logger.error(
              `Failed to upsert course ${course.subjectCode} ${course.courseNumber}`,
              err
            );
            throw err;
          }
        })
      );

      results.push(...batchResults);
    }

    logger.success(`Successfully inserted ${results.length} courses`);
    return success(results);
  } catch (err) {
    logger.error(`Failed to insert courses`, err);
    return failure('Failed to insert courses', 'COURSE_INSERT_FAILED', err);
  }
}

/**
 * Insert or update a single course
 * Convenience wrapper around insertCourses
 *
 * @param course Course data to insert
 * @returns The inserted/updated course
 */
export async function insertCourse(
  course: DbCourseInput
): Promise<PipelineResult<Course>> {
  logger.log(
    `Inserting course ${course.subjectCode} ${course.courseNumber}...`
  );

  const result = await insertCourses([course]);

  if (!result.success) {
    return result;
  }

  return success(result.data[0]);
}

/**
 * Get count of courses for a specific academic year
 *
 * @param academicYearId Academic year ID
 * @returns Count of courses
 */
export async function getCourseCount(
  academicYearId: number
): Promise<PipelineResult<number>> {
  try {
    const count = await prisma.course.count({
      where: { academicYearId },
    });

    return success(count);
  } catch (err) {
    logger.error(
      `Failed to get course count for academic year ${academicYearId}`,
      err
    );
    return failure(
      'Failed to get course count',
      'COURSE_COUNT_FAILED',
      err
    );
  }
}

/**
 * Delete all courses for a specific academic year
 * WARNING: This will cascade delete related data!
 *
 * @param academicYearId Academic year ID
 * @returns Number of deleted courses
 */
export async function deleteCoursesForYear(
  academicYearId: number
): Promise<PipelineResult<number>> {
  logger.warn(
    `Deleting all courses for academic year ${academicYearId}...`
  );

  try {
    const result = await prisma.course.deleteMany({
      where: { academicYearId },
    });

    logger.success(
      `Deleted ${result.count} courses for academic year ${academicYearId}`
    );
    return success(result.count);
  } catch (err) {
    logger.error(
      `Failed to delete courses for academic year ${academicYearId}`,
      err
    );
    return failure(
      'Failed to delete courses',
      'COURSE_DELETE_FAILED',
      err
    );
  }
}

/**
 * Get all courses for a specific academic year
 *
 * @param academicYearId Academic year ID
 * @returns Array of courses
 */
export async function getCoursesForYear(
  academicYearId: number
): Promise<PipelineResult<Course[]>> {
  try {
    const courses = await prisma.course.findMany({
      where: { academicYearId },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });

    return success(courses);
  } catch (err) {
    logger.error(
      `Failed to get courses for academic year ${academicYearId}`,
      err
    );
    return failure('Failed to get courses', 'COURSE_GET_FAILED', err);
  }
}
