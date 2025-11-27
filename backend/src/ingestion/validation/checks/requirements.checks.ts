import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Extract all courseIds from a requirements courses object
 * Handles structures like: null, { $and: [...] }, { $or: [...] }
 */
function extractCourseIds(coursesObj: any): string[] {
  if (!coursesObj) return [];

  const ids: string[] = [];

  // Handle $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    ids.push(...coursesObj.$and);
  }

  // Handle $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    ids.push(...coursesObj.$or);
  }

  return ids;
}

/**
 * Filter out invalid courseIds from requirements courses object
 * Keeps the structure but removes non-existent course references
 */
function filterValidCourseIds(coursesObj: any, validCourseIds: Set<string>): any {
  if (!coursesObj) return null;

  const filtered: any = {};

  // Filter $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    const validIds = coursesObj.$and.filter((id: string) => validCourseIds.has(id));
    if (validIds.length > 0) {
      filtered.$and = validIds;
    }
  }

  // Filter $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    const validIds = coursesObj.$or.filter((id: string) => validCourseIds.has(id));
    if (validIds.length > 0) {
      filtered.$or = validIds;
    }
  }

  // Return null if no valid courses remain
  return Object.keys(filtered).length > 0 ? filtered : null;
}

/**
 * Check: Requirements JSON referential integrity
 *
 * Validates that all courseIds in requirements JSON exist in the database.
 * Removes invalid courseId references from requirements but keeps the structure.
 */
export async function checkRequirementsReferentialIntegrity(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Requirements Referential Integrity');

  try {
    // Get all valid course identifiers in "SUBJECT NUMBER" format (e.g., "CS 1101")
    // This matches the format used in requirements JSON by the AI parser
    const courses = await prisma.course.findMany({
      select: { subjectCode: true, courseNumber: true },
    });

    const validCourseIds = new Set(
      courses.map((c) => `${c.subjectCode} ${c.courseNumber}`)
    );

    logger.log(`Found ${validCourseIds.size} valid courses in database`);

    // Track commonly missing courses for reporting
    const missingCourseRefs = new Map<string, number>();

    // Check courses with requirements
    const coursesWithReqs = await prisma.course.findMany({
      where: {
        requirements: { not: null },
      },
    });

    logger.log(
      `Checking ${coursesWithReqs.length} courses with requirements...`
    );

    for (const course of coursesWithReqs) {
      const reqs = course.requirements as any;
      if (!reqs) continue;

      const invalidCourseIds: string[] = [];
      let needsUpdate = false;

      // Extract all courseIds from prerequisites
      const prereqCourseIds = extractCourseIds(reqs.prerequisites?.courses);
      const invalidPrereqs = prereqCourseIds.filter(
        (id) => !validCourseIds.has(id)
      );

      if (invalidPrereqs.length > 0) {
        needsUpdate = true;
        invalidCourseIds.push(...invalidPrereqs);

        // Track missing references
        for (const id of invalidPrereqs) {
          missingCourseRefs.set(id, (missingCourseRefs.get(id) || 0) + 1);
        }
      }

      // Extract all courseIds from corequisites
      const coreqCourseIds = extractCourseIds(reqs.corequisites?.courses);
      const invalidCoreqs = coreqCourseIds.filter(
        (id) => !validCourseIds.has(id)
      );

      if (invalidCoreqs.length > 0) {
        needsUpdate = true;
        invalidCourseIds.push(...invalidCoreqs);

        // Track missing references
        for (const id of invalidCoreqs) {
          missingCourseRefs.set(id, (missingCourseRefs.get(id) || 0) + 1);
        }
      }

      if (needsUpdate) {
        result.failed++;

        const courseDisplay = `${course.subjectCode} ${course.courseNumber} "${course.title}" (${course.courseId})`;

        // Requirements check: Always report, never auto-fix (even without --dry-run)
        // This allows previewing issues before manually fixing them
        logger.warn(
          `Found ${invalidCourseIds.length} non-existent course reference(s) in ${courseDisplay} requirements: ${invalidCourseIds.join(', ')}`
        );

        result.warnings.push({
          id: `course-${course.id}`,
          message: `Found ${invalidCourseIds.length} non-existent course reference(s) in ${courseDisplay} requirements`,
          action: 'reported',
          details: {
            courseId: course.courseId,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            title: course.title,
            invalidCourseIds,
          },
        });
      }
    }

    // Check classes with requirements
    const classesWithReqs = await prisma.class.findMany({
      where: {
        requirements: { not: null },
      },
      include: {
        term: true,
      },
    });

    logger.log(`Checking ${classesWithReqs.length} classes with requirements...`);

    for (const cls of classesWithReqs) {
      const reqs = cls.requirements as any;
      if (!reqs) continue;

      const invalidCourseIds: string[] = [];
      let needsUpdate = false;

      // Extract all courseIds from prerequisites
      const prereqCourseIds = extractCourseIds(reqs.prerequisites?.courses);
      const invalidPrereqs = prereqCourseIds.filter(
        (id) => !validCourseIds.has(id)
      );

      if (invalidPrereqs.length > 0) {
        needsUpdate = true;
        invalidCourseIds.push(...invalidPrereqs);

        // Track missing references
        for (const id of invalidPrereqs) {
          missingCourseRefs.set(id, (missingCourseRefs.get(id) || 0) + 1);
        }
      }

      // Extract all courseIds from corequisites
      const coreqCourseIds = extractCourseIds(reqs.corequisites?.courses);
      const invalidCoreqs = coreqCourseIds.filter(
        (id) => !validCourseIds.has(id)
      );

      if (invalidCoreqs.length > 0) {
        needsUpdate = true;
        invalidCourseIds.push(...invalidCoreqs);

        // Track missing references
        for (const id of invalidCoreqs) {
          missingCourseRefs.set(id, (missingCourseRefs.get(id) || 0) + 1);
        }
      }

      if (needsUpdate) {
        result.failed++;

        const classDisplay = `${cls.subjectCode} ${cls.courseNumber} "${cls.title}" in ${cls.term.name} (${cls.classId})`;

        // Requirements check: Always report, never auto-fix (even without --dry-run)
        // This allows previewing issues before manually fixing them
        logger.warn(
          `Found ${invalidCourseIds.length} non-existent course reference(s) in ${classDisplay} requirements: ${invalidCourseIds.join(', ')}`
        );

        result.warnings.push({
          id: `class-${cls.id}`,
          message: `Found ${invalidCourseIds.length} non-existent course reference(s) in ${classDisplay} requirements`,
          action: 'reported',
          details: {
            classId: cls.classId,
            subjectCode: cls.subjectCode,
            courseNumber: cls.courseNumber,
            title: cls.title,
            termId: cls.termId,
            invalidCourseIds,
          },
        });
      }
    }

    // Report commonly missing course references
    if (missingCourseRefs.size > 0) {
      const sortedMissing = Array.from(missingCourseRefs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20

      logger.log('\nCommonly referenced but missing courses:');
      for (const [courseId, count] of sortedMissing) {
        logger.log(`  ${courseId}: referenced ${count} time(s)`);
      }

      result.warnings.push({
        id: 'missing-course-summary',
        message: `Found ${missingCourseRefs.size} unique missing course references`,
        action: 'reported',
        details: {
          totalMissingCourses: missingCourseRefs.size,
          topMissingCourses: sortedMissing.map(([id, count]) => ({
            courseId: id,
            referenceCount: count,
          })),
        },
      });
    }

    if (result.failed === 0) {
      result.passed = 1;
      logger.log('✓ All requirements reference valid courses');
    }

    return result;
  } catch (error) {
    logger.error('Failed to check requirements referential integrity', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
