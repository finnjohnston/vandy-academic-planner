import { Class, Course } from '@prisma/client';
import { prisma } from '../services/db.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from '../pipelines/types/pipeline.types.js';
import { mapTermToAcademicYear } from '../pipelines/services/term.service.js';

/**
 * Match result for linking a class to a course
 */
export interface CourseClassMatch {
  classId: string;
  courseId: string | null;
}

/**
 * Statistics for linking operations
 */
export interface LinkStatistics {
  totalClasses: number;
  matched: number;
  unmatched: number;
  updated: number;
}

/**
 * Find a matching course for a class based on subject code and course number
 * within the same academic year as the class's term
 *
 * @param classData Class data with subjectCode and courseNumber
 * @param termId Term ID for the class
 * @returns Course ID if match found, null otherwise
 */
export async function findCourseForClass(
  classData: { subjectCode: string; courseNumber: string },
  termId: string
): Promise<string | null> {
  try {
    // Get the term to find its academic year
    const term = await prisma.term.findUnique({
      where: { termId },
      include: { academicYear: true },
    });

    if (!term) {
      logger.warn(`Term not found: ${termId}`);
      return null;
    }

    const academicYearId = term.academicYearId;

    // Find course by subject code + course number in the same academic year
    const course = await prisma.course.findFirst({
      where: {
        academicYearId,
        subjectCode: classData.subjectCode,
        courseNumber: classData.courseNumber,
      },
    });

    return course?.courseId || null;
  } catch (err) {
    logger.error(
      `Error finding course for ${classData.subjectCode} ${classData.courseNumber}`,
      err
    );
    return null;
  }
}

/**
 * Match all classes to their corresponding courses
 * Can be filtered by term or academic year
 *
 * @param termId Optional term ID to filter classes
 * @param academicYearId Optional academic year ID to filter classes
 * @returns Array of matches with class IDs and their corresponding course IDs (or null)
 */
export async function matchClassesToCourses(
  termId?: string,
  academicYearId?: number
): Promise<PipelineResult<CourseClassMatch[]>> {
  logger.log('Matching classes to courses...');

  try {
    // Build filter for classes
    const classFilter: any = {};

    if (termId) {
      classFilter.termId = termId;
    } else if (academicYearId) {
      classFilter.term = {
        academicYearId,
      };
    }

    // Get all classes to match
    const classes = await prisma.class.findMany({
      where: classFilter,
      include: {
        term: {
          include: {
            academicYear: true,
          },
        },
      },
    });

    logger.log(`Found ${classes.length} classes to match`);

    if (classes.length === 0) {
      return success([]);
    }

    // Get unique academic years from the classes
    const academicYearIds = [...new Set(classes.map((c) => c.term.academicYearId))];

    // Fetch all courses for these academic years
    const courses = await prisma.course.findMany({
      where: {
        academicYearId: {
          in: academicYearIds,
        },
      },
    });

    logger.log(`Found ${courses.length} courses in relevant academic years`);

    // Create a map of courses by academic year, subject, and number for fast lookup
    const courseMap = new Map<string, Course>();
    for (const course of courses) {
      const key = `${course.academicYearId}-${course.subjectCode}-${course.courseNumber}`;
      courseMap.set(key, course);
    }

    // Match each class to a course
    const matches: CourseClassMatch[] = [];
    let matched = 0;
    let unmatched = 0;

    for (const cls of classes) {
      const key = `${cls.term.academicYearId}-${cls.subjectCode}-${cls.courseNumber}`;
      const course = courseMap.get(key);

      if (course) {
        matches.push({
          classId: cls.classId,
          courseId: course.courseId,
        });
        matched++;
      } else {
        matches.push({
          classId: cls.classId,
          courseId: null,
        });
        unmatched++;
      }
    }

    logger.log(`Matching complete: ${matched} matched, ${unmatched} unmatched`);

    return success(matches);
  } catch (err) {
    logger.error('Failed to match classes to courses', err);
    return failure('Failed to match classes to courses', 'MATCH_FAILED', err);
  }
}

/**
 * Update class records with their course ID links
 *
 * @param matches Array of matches to apply
 * @returns Number of classes updated
 */
export async function updateClassCourseLinks(
  matches: CourseClassMatch[]
): Promise<PipelineResult<number>> {
  logger.log(`Updating ${matches.length} class-course links...`);

  try {
    let updated = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)} (${batch.length} classes)`
      );

      // Use Promise.all for parallel updates within batch
      const batchResults = await Promise.all(
        batch.map(async (match) => {
          try {
            await prisma.class.update({
              where: { classId: match.classId },
              data: { courseId: match.courseId },
            });
            return true;
          } catch (err) {
            logger.error(`Failed to update class ${match.classId}`, err);
            return false;
          }
        })
      );

      updated += batchResults.filter((r) => r).length;
    }

    logger.success(`Successfully updated ${updated} class-course links`);
    return success(updated);
  } catch (err) {
    logger.error('Failed to update class-course links', err);
    return failure('Failed to update class-course links', 'UPDATE_FAILED', err);
  }
}

/**
 * Get linking statistics for a term or academic year
 *
 * @param termId Optional term ID to filter
 * @param academicYearId Optional academic year ID to filter
 * @returns Statistics about linked and unlinked classes
 */
export async function getLinkStatistics(
  termId?: string,
  academicYearId?: number
): Promise<PipelineResult<LinkStatistics>> {
  try {
    const classFilter: any = {};

    if (termId) {
      classFilter.termId = termId;
    } else if (academicYearId) {
      classFilter.term = { academicYearId };
    }

    const totalClasses = await prisma.class.count({ where: classFilter });

    const matched = await prisma.class.count({
      where: {
        ...classFilter,
        courseId: { not: null },
      },
    });

    const unmatched = totalClasses - matched;

    return success({
      totalClasses,
      matched,
      unmatched,
      updated: 0, // Will be populated during linking
    });
  } catch (err) {
    logger.error('Failed to get link statistics', err);
    return failure('Failed to get link statistics', 'STATS_FAILED', err);
  }
}
