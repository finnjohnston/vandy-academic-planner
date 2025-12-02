import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Check #1: Class references valid course (if courseId is not null)
 *
 * Sets courseId = null for classes referencing non-existent courses.
 */
export async function checkClassCourseReferences(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Class Course References');

  try {
    // Find classes with courseId that don't reference existing courses
    const classesWithCourse = await prisma.class.findMany({
      where: {
        courseId: { not: null },
      },
      include: {
        course: true,
      },
    });

    const invalidClasses = classesWithCourse.filter((cls) => !cls.course);

    if (invalidClasses.length === 0) {
      result.passed = 1;
      logger.log('✓ All classes reference valid courses');
      return result;
    }

    result.failed = invalidClasses.length;

    for (const cls of invalidClasses) {
      if (!dryRun) {
        await prisma.class.update({
          where: { id: cls.id },
          data: { courseId: null },
        });
        logger.warn(
          `Class ${cls.classId} (${cls.subjectCode} ${cls.courseNumber}) references non-existent course ${cls.courseId} - unlinking`
        );
        result.fixed++;
      } else {
        logger.log(
          `[DRY RUN] Would unlink class ${cls.classId} from non-existent course ${cls.courseId}`
        );
        result.fixed++;
      }

      result.warnings.push({
        id: `class-${cls.id}`,
        message: `Class ${cls.classId} (${cls.subjectCode} ${cls.courseNumber}) references non-existent course ${cls.courseId} - ${dryRun ? 'would unlink' : 'unlinking'}`,
        action: 'unlinked',
        details: {
          classId: cls.classId,
          invalidCourseId: cls.courseId,
        },
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to check class course references', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #11: Class-Course consistency (subjectCode+courseNumber should match)
 *
 * Unlinks classes where subjectCode/courseNumber don't match the referenced course.
 */
export async function checkClassCourseConsistency(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Class-Course Field Consistency');

  try {
    // Find classes with courseId where fields don't match
    const classesWithCourses = await prisma.class.findMany({
      where: { courseId: { not: null } },
      include: { course: true },
    });

    const inconsistentClasses = classesWithCourses.filter(
      (cls) =>
        cls.course &&
        (cls.subjectCode !== cls.course.subjectCode ||
          cls.courseNumber !== cls.course.courseNumber)
    );

    if (inconsistentClasses.length === 0) {
      result.passed = 1;
      logger.log('✓ All class-course field mappings are consistent');
      return result;
    }

    result.failed = inconsistentClasses.length;

    for (const cls of inconsistentClasses) {
      if (!dryRun) {
        await prisma.class.update({
          where: { id: cls.id },
          data: { courseId: null },
        });
        logger.warn(
          `Class ${cls.classId} (${cls.subjectCode} ${cls.courseNumber}) incorrectly linked to course ${cls.courseId} (${cls.course!.subjectCode} ${cls.course!.courseNumber}) - unlinking`
        );
        result.fixed++;
      } else {
        logger.log(
          `[DRY RUN] Would unlink class ${cls.classId} (${cls.subjectCode} ${cls.courseNumber}) from mismatched course ${cls.courseId}`
        );
        result.fixed++;
      }

      result.errors.push({
        id: `class-${cls.id}`,
        message: `Class ${cls.classId} (${cls.subjectCode} ${cls.courseNumber}) incorrectly linked to course ${cls.courseId} (${cls.course!.subjectCode} ${cls.course!.courseNumber}) - ${dryRun ? 'would unlink' : 'unlinking'}`,
        action: 'unlinked',
        details: {
          classId: cls.classId,
          classFields: { subjectCode: cls.subjectCode, courseNumber: cls.courseNumber },
          courseFields: { subjectCode: cls.course!.subjectCode, courseNumber: cls.course!.courseNumber },
        },
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to check class-course consistency', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check: No duplicate classes
 *
 * Checks for classes with duplicate classId OR duplicate (termId, subjectCode, courseNumber, title).
 * Keeps the most recent and deletes older duplicates.
 */
export async function checkDuplicateClasses(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('No Duplicate Classes');

  try {
    // Find duplicates by classId
    const duplicateIds = await prisma.class.groupBy({
      by: ['classId'],
      having: {
        classId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    // Find duplicates by (termId, subjectCode, courseNumber, title)
    const duplicateComposite = await prisma.class.groupBy({
      by: ['termId', 'subjectCode', 'courseNumber', 'title'],
      having: {
        termId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicateIds.length === 0 && duplicateComposite.length === 0) {
      result.passed = 1;
      logger.log('✓ No duplicate classes found');
      return result;
    }

    // Handle classId duplicates
    for (const dup of duplicateIds) {
      const classes = await prisma.class.findMany({
        where: { classId: dup.classId },
        include: { term: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      const toKeep = classes[0];
      const toDelete = classes.slice(1);

      result.failed += toDelete.length;

      logger.warn(
        `Found ${classes.length} classes with classId ${dup.classId}`
      );
      logger.log(`  Keeping: ${toKeep.classId} (updated ${toKeep.updatedAt})`);

      for (const cls of toDelete) {
        const classDisplay = `${cls.subjectCode} ${cls.courseNumber} "${cls.title}" in ${cls.term.name} (${cls.classId})`;

        if (!dryRun) {
          await prisma.class.delete({ where: { id: cls.id } });
          logger.success(`  Deleted duplicate: ${classDisplay}`);
          result.deleted++;
        } else {
          logger.log(`  [DRY RUN] Would delete: ${classDisplay}`);
          result.deleted++;
        }

        result.errors.push({
          id: `class-${cls.id}`,
          message: `Found duplicate classes ${classDisplay} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            classId: cls.classId,
            subjectCode: cls.subjectCode,
            courseNumber: cls.courseNumber,
            title: cls.title,
            termId: cls.termId,
            kept: toKeep.id,
            deleted: cls.id,
          },
        });
      }
    }

    // Handle composite key duplicates (that aren't already caught by classId)
    for (const dup of duplicateComposite) {
      const classes = await prisma.class.findMany({
        where: {
          termId: dup.termId,
          subjectCode: dup.subjectCode,
          courseNumber: dup.courseNumber,
          title: dup.title,
        },
        include: { term: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      // Skip if we already handled these as classId duplicates
      const uniqueClassIds = new Set(classes.map((c) => c.classId));
      if (uniqueClassIds.size === 1) continue;

      const toKeep = classes[0];
      const toDelete = classes.slice(1);

      result.failed += toDelete.length;

      logger.warn(
        `Found ${classes.length} classes for ${dup.subjectCode} ${dup.courseNumber} "${dup.title}" in ${toKeep.term.name}`
      );
      logger.log(`  Keeping: ${toKeep.classId}`);

      for (const cls of toDelete) {
        const classDisplay = `${cls.subjectCode} ${cls.courseNumber} "${cls.title}" in ${cls.term.name} (${cls.classId})`;

        if (!dryRun) {
          await prisma.class.delete({ where: { id: cls.id } });
          logger.success(`  Deleted duplicate: ${classDisplay}`);
          result.deleted++;
        } else {
          logger.log(`  [DRY RUN] Would delete: ${classDisplay}`);
          result.deleted++;
        }

        result.errors.push({
          id: `class-${cls.id}`,
          message: `Found duplicate classes ${classDisplay} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            classId: cls.classId,
            subjectCode: cls.subjectCode,
            courseNumber: cls.courseNumber,
            title: cls.title,
            termId: cls.termId,
            kept: toKeep.classId,
            deleted: cls.classId,
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check duplicate classes', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #6: Credit range validation for classes
 */
export async function checkClassCreditRanges(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Class Credit Ranges');

  try {
    const invalidClasses = await prisma.class.findMany({
      where: {
        OR: [
          { creditsMin: { lte: 0 } },
          { creditsMax: { lte: 0 } },
          { creditsMin: { gt: prisma.class.fields.creditsMax } },
        ],
      },
      include: { course: true },
    });

    if (invalidClasses.length === 0) {
      result.passed = 1;
      logger.log('✓ All class credit ranges are valid');
      return result;
    }

    result.failed = invalidClasses.length;

    for (const cls of invalidClasses) {
      let { creditsMin, creditsMax } = cls;
      const original = { creditsMin, creditsMax };
      let fixed = false;

      // Try to inherit from course if available
      if (cls.course) {
        creditsMin = cls.course.creditsMin;
        creditsMax = cls.course.creditsMax;
        fixed = true;
      } else {
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
      }

      if (fixed) {
        const classDisplay = `${cls.subjectCode} ${cls.courseNumber} "${cls.title}" (${cls.classId})`;

        if (!dryRun) {
          await prisma.class.update({
            where: { id: cls.id },
            data: { creditsMin, creditsMax },
          });
          logger.success(
            `Fixed credit range for ${classDisplay}: was (${original.creditsMin}, ${original.creditsMax}), now (${creditsMin}, ${creditsMax})${cls.course ? ' (inherited from course)' : ''}`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would fix ${classDisplay}: (${original.creditsMin}, ${original.creditsMax}) -> (${creditsMin}, ${creditsMax})`
          );
          result.fixed++;
        }

        result.errors.push({
          id: `class-${cls.id}`,
          message: `Fixed invalid credit range for class ${classDisplay}`,
          action: 'fixed',
          details: {
            classId: cls.classId,
            subjectCode: cls.subjectCode,
            courseNumber: cls.courseNumber,
            title: cls.title,
            before: original,
            after: { creditsMin, creditsMax },
            inheritedFromCourse: !!cls.course,
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check class credit ranges', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
