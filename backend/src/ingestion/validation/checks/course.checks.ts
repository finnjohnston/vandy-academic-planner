import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Check #3: No duplicate courses
 *
 * Checks for courses with duplicate courseId OR duplicate (academicYearId, subjectCode, courseNumber).
 * Keeps the most recent and deletes older duplicates.
 */
export async function checkDuplicateCourses(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('No Duplicate Courses');

  try {
    // Find duplicates by courseId
    const duplicateIds = await prisma.course.groupBy({
      by: ['courseId'],
      having: {
        courseId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    // Find duplicates by (academicYearId, subjectCode, courseNumber)
    const duplicateComposite = await prisma.course.groupBy({
      by: ['academicYearId', 'subjectCode', 'courseNumber'],
      having: {
        academicYearId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicateIds.length === 0 && duplicateComposite.length === 0) {
      result.passed = 1;
      logger.log('✓ No duplicate courses found');
      return result;
    }

    // Handle courseId duplicates
    for (const dup of duplicateIds) {
      const courses = await prisma.course.findMany({
        where: { courseId: dup.courseId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      const toKeep = courses[0];
      const toDelete = courses.slice(1);

      result.failed += toDelete.length;

      logger.warn(
        `Found ${courses.length} courses with courseId ${dup.courseId}`
      );
      logger.log(`  Keeping: ${toKeep.courseId} (updated ${toKeep.updatedAt})`);

      for (const course of toDelete) {
        if (!dryRun) {
          await prisma.course.delete({ where: { id: course.id } });
          logger.success(
            `  Deleted duplicate: ${course.subjectCode} ${course.courseNumber} (updated ${course.updatedAt})`
          );
          result.deleted++;
        } else {
          logger.log(
            `  [DRY RUN] Would delete: ${course.subjectCode} ${course.courseNumber}`
          );
          result.deleted++;
        }

        result.errors.push({
          id: `course-${course.id}`,
          message: `Found duplicate courses for ${course.subjectCode} ${course.courseNumber} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            courseId: course.courseId,
            kept: toKeep.id,
            deleted: course.id,
          },
        });
      }
    }

    // Handle composite key duplicates (that aren't already caught by courseId)
    for (const dup of duplicateComposite) {
      const courses = await prisma.course.findMany({
        where: {
          academicYearId: dup.academicYearId,
          subjectCode: dup.subjectCode,
          courseNumber: dup.courseNumber,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      // Skip if we already handled these as courseId duplicates
      const uniqueCourseIds = new Set(courses.map((c) => c.courseId));
      if (uniqueCourseIds.size === 1) continue;

      const toKeep = courses[0];
      const toDelete = courses.slice(1);

      result.failed += toDelete.length;

      logger.warn(
        `Found ${courses.length} courses for ${dup.subjectCode} ${dup.courseNumber} in academic year ${dup.academicYearId}`
      );
      logger.log(`  Keeping: ${toKeep.courseId}`);

      for (const course of toDelete) {
        if (!dryRun) {
          await prisma.course.delete({ where: { id: course.id } });
          logger.success(`  Deleted duplicate: ${course.courseId}`);
          result.deleted++;
        } else {
          logger.log(`  [DRY RUN] Would delete: ${course.courseId}`);
          result.deleted++;
        }

        result.errors.push({
          id: `course-${course.id}`,
          message: `Found duplicate courses for ${course.subjectCode} ${course.courseNumber} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            courseId: course.courseId,
            kept: toKeep.courseId,
            deleted: course.courseId,
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check duplicate courses', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #6: Credit range validation for courses
 *
 * Ensures creditsMin <= creditsMax and both > 0.
 * Swaps if reversed, sets to 1.0 if invalid.
 */
export async function checkCourseCreditRanges(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Course Credit Ranges');

  try {
    // Find courses with invalid credit ranges
    const invalidCourses = await prisma.course.findMany({
      where: {
        OR: [
          { creditsMin: { lte: 0 } },
          { creditsMax: { lte: 0 } },
          { creditsMin: { gt: prisma.course.fields.creditsMax } },
        ],
      },
    });

    if (invalidCourses.length === 0) {
      result.passed = 1;
      logger.log('✓ All course credit ranges are valid');
      return result;
    }

    result.failed = invalidCourses.length;

    for (const course of invalidCourses) {
      let { creditsMin, creditsMax } = course;
      const original = { creditsMin, creditsMax };
      let fixed = false;

      // Fix negative or zero credits
      if (creditsMin <= 0) {
        creditsMin = 1.0;
        fixed = true;
      }
      if (creditsMax <= 0) {
        creditsMax = 1.0;
        fixed = true;
      }

      // Swap if reversed
      if (creditsMin > creditsMax) {
        [creditsMin, creditsMax] = [creditsMax, creditsMin];
        fixed = true;
      }

      if (fixed) {
        const courseDisplay = `${course.subjectCode} ${course.courseNumber} "${course.title}"`;

        if (!dryRun) {
          await prisma.course.update({
            where: { id: course.id },
            data: { creditsMin, creditsMax },
          });
          logger.success(
            `Fixed credit range for ${courseDisplay}: was (${original.creditsMin}, ${original.creditsMax}), now (${creditsMin}, ${creditsMax})`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would fix ${courseDisplay}: (${original.creditsMin}, ${original.creditsMax}) -> (${creditsMin}, ${creditsMax})`
          );
          result.fixed++;
        }

        result.errors.push({
          id: `course-${course.id}`,
          message: `Fixed invalid credit range for course ${courseDisplay}: was (${original.creditsMin}, ${original.creditsMax}), ${dryRun ? 'would be' : 'now'} (${creditsMin}, ${creditsMax})`,
          action: 'fixed',
          details: {
            courseId: course.courseId,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            title: course.title,
            before: original,
            after: { creditsMin, creditsMax },
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check course credit ranges', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
