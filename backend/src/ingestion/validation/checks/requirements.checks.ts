import { prisma } from '../../services/db.service.js';
import { Prisma } from '@prisma/client';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Extract all courseIds from a requirements courses object
 * Handles recursive structures: null, strings, { $and: [...] }, { $or: [...] }
 * Supports nested operators like: { $and: [{ $or: [...] }, { $or: [...] }] }
 */
function extractCourseIds(coursesObj: any): string[] {
  if (!coursesObj) return [];

  // Base case: if it's a string, return it
  if (typeof coursesObj === 'string') {
    return [coursesObj];
  }

  // Base case: if it's not an object, return empty
  if (typeof coursesObj !== 'object') {
    return [];
  }

  const ids: string[] = [];

  // Recursive case: process $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    for (const item of coursesObj.$and) {
      ids.push(...extractCourseIds(item)); // Recursive call
    }
  }

  // Recursive case: process $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    for (const item of coursesObj.$or) {
      ids.push(...extractCourseIds(item)); // Recursive call
    }
  }

  return ids;
}

/**
 * Normalize a group after filtering - simplify structure when possible
 * - Empty array -> null
 * - Single item -> unwrap (return item directly)
 * - Multiple items -> keep structure
 */
export function normalizeGroup(operator: '$and' | '$or', items: any[]): any {
  // Empty array -> null
  if (items.length === 0) {
    return null;
  }

  // Single item -> unwrap (return the item directly)
  if (items.length === 1) {
    return items[0];
  }

  // Multiple items -> keep the structure
  return { [operator]: items };
}

/**
 * Filter out invalid courseIds from requirements courses object
 * Recursively removes non-existent course references while preserving structure
 * Automatically simplifies groups (unwraps single items, returns null for empty)
 * Supports nested operators like: { $and: [{ $or: [...] }, { $or: [...] }] }
 */
export function filterInvalidCourses(
  coursesObj: any,
  validCourseIds: Set<string>
): any {
  // Base case: null
  if (coursesObj === null) {
    return null;
  }

  // Base case: string (course code)
  if (typeof coursesObj === 'string') {
    return validCourseIds.has(coursesObj) ? coursesObj : null;
  }

  // Base case: not an object
  if (typeof coursesObj !== 'object') {
    return null;
  }

  // Recursive case: $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    const filtered = coursesObj.$and
      .map((item: any) => filterInvalidCourses(item, validCourseIds))
      .filter((item: any) => item !== null);

    return normalizeGroup('$and', filtered);
  }

  // Recursive case: $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    const filtered = coursesObj.$or
      .map((item: any) => filterInvalidCourses(item, validCourseIds))
      .filter((item: any) => item !== null);

    return normalizeGroup('$or', filtered);
  }

  return null;
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
        requirements: { not: Prisma.JsonNull },
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

        // Filter out invalid course references
        const updatedReqs = { ...reqs };

        if (reqs.prerequisites?.courses) {
          updatedReqs.prerequisites = {
            ...reqs.prerequisites,
            courses: filterInvalidCourses(
              reqs.prerequisites.courses,
              validCourseIds
            ),
          };
        }

        if (reqs.corequisites?.courses) {
          updatedReqs.corequisites = {
            ...reqs.corequisites,
            courses: filterInvalidCourses(
              reqs.corequisites.courses,
              validCourseIds
            ),
          };
        }

        // Follow established auto-fix pattern
        if (!dryRun) {
          await prisma.course.update({
            where: { id: course.id },
            data: { requirements: updatedReqs },
          });
          logger.success(
            `Fixed ${invalidCourseIds.length} invalid course reference(s) in ${courseDisplay}`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would fix ${invalidCourseIds.length} invalid course reference(s) in ${courseDisplay}: ${invalidCourseIds.join(', ')}`
          );
          result.fixed++;
        }

        result.warnings.push({
          id: `course-${course.id}`,
          message: `${dryRun ? 'Would fix' : 'Fixed'} ${invalidCourseIds.length} invalid course reference(s) in ${courseDisplay}`,
          action: dryRun ? 'reported' : 'fixed',
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
        requirements: { not: Prisma.JsonNull },
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

        // Filter out invalid course references
        const updatedReqs = { ...reqs };

        if (reqs.prerequisites?.courses) {
          updatedReqs.prerequisites = {
            ...reqs.prerequisites,
            courses: filterInvalidCourses(
              reqs.prerequisites.courses,
              validCourseIds
            ),
          };
        }

        if (reqs.corequisites?.courses) {
          updatedReqs.corequisites = {
            ...reqs.corequisites,
            courses: filterInvalidCourses(
              reqs.corequisites.courses,
              validCourseIds
            ),
          };
        }

        // Follow established auto-fix pattern
        if (!dryRun) {
          await prisma.class.update({
            where: { id: cls.id },
            data: { requirements: updatedReqs },
          });
          logger.success(
            `Fixed ${invalidCourseIds.length} invalid course reference(s) in ${classDisplay}`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would fix ${invalidCourseIds.length} invalid course reference(s) in ${classDisplay}: ${invalidCourseIds.join(', ')}`
          );
          result.fixed++;
        }

        result.warnings.push({
          id: `class-${cls.id}`,
          message: `${dryRun ? 'Would fix' : 'Fixed'} ${invalidCourseIds.length} invalid course reference(s) in ${classDisplay}`,
          action: dryRun ? 'reported' : 'fixed',
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

/**
 * Check: Sync Requirements Between Courses and Classes
 *
 * Bidirectionally syncs requirements data:
 * - Course has requirements but class doesn't → Copy to class
 * - Class has requirements but course doesn't → Copy to course
 *
 * This fixes missing requirements data caused by scraper failures.
 */
export async function checkRequirementsSync(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Requirements Sync (Courses ↔ Classes)');

  try {
    let coursesUpdated = 0;
    let classesUpdated = 0;

    // Get current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });

    if (!currentYear) {
      logger.warn('No current academic year set, skipping requirements sync');
      result.passed = 1;
      return result;
    }

    logger.log(`Syncing requirements for academic year: ${currentYear.year}`);

    // Fetch all courses with their related classes
    const courses = await prisma.course.findMany({
      where: {
        academicYearId: currentYear.id
      },
      include: {
        classes: {
          include: {
            term: true  // Need term to check academic year
          }
        }
      }
    });

    logger.log(`Analyzing ${courses.length} courses in ${currentYear.year} and their classes...`);

    // PHASE 1: Course → Class sync (course has requirements, classes don't)
    for (const course of courses) {
      // Skip if course has no requirements
      if (!course.requirements || course.requirements === Prisma.JsonNull) {
        continue;
      }

      // Find classes without requirements (only in same academic year)
      const classesNeedingSync = course.classes.filter(
        cls =>
          cls.term.academicYearId === currentYear.id &&
          (!cls.requirements || cls.requirements === Prisma.JsonNull)
      );

      if (classesNeedingSync.length > 0) {
        result.failed += classesNeedingSync.length;

        const courseDisplay = `${course.subjectCode} ${course.courseNumber}`;

        if (!dryRun) {
          // Update all classes that need requirements
          await prisma.class.updateMany({
            where: { id: { in: classesNeedingSync.map(c => c.id) } },
            data: { requirements: course.requirements }
          });

          logger.success(
            `Synced requirements from course ${courseDisplay} → ${classesNeedingSync.length} class(es)`
          );
          result.fixed += classesNeedingSync.length;
        } else {
          logger.log(
            `[DRY RUN] Would sync requirements from course ${courseDisplay} → ${classesNeedingSync.length} class(es)`
          );
          result.fixed += classesNeedingSync.length;
        }

        classesUpdated += classesNeedingSync.length;

        result.warnings.push({
          id: `course-to-class-${course.id}`,
          message: `${dryRun ? 'Would sync' : 'Synced'} requirements from course ${courseDisplay} to ${classesNeedingSync.length} class(es)`,
          action: dryRun ? 'reported' : 'fixed',
          details: {
            courseId: course.courseId,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            classCount: classesNeedingSync.length,
            direction: 'course-to-class'
          }
        });
      }
    }

    // PHASE 2: Class → Course sync (course lacks requirements, but class has them)
    for (const course of courses) {
      // Skip if course already has requirements
      if (course.requirements && course.requirements !== Prisma.JsonNull) {
        continue;
      }

      // Find first class with requirements (only in same academic year)
      const classWithReqs = course.classes.find(
        cls =>
          cls.term.academicYearId === currentYear.id &&
          cls.requirements &&
          cls.requirements !== Prisma.JsonNull
      );

      if (classWithReqs) {
        result.failed++;

        const courseDisplay = `${course.subjectCode} ${course.courseNumber}`;

        if (!dryRun) {
          await prisma.course.update({
            where: { id: course.id },
            data: { requirements: classWithReqs.requirements }
          });

          logger.success(
            `Synced requirements from class ${classWithReqs.classId} → course ${courseDisplay}`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would sync requirements from class ${classWithReqs.classId} → course ${courseDisplay}`
          );
          result.fixed++;
        }

        coursesUpdated++;

        result.warnings.push({
          id: `class-to-course-${course.id}`,
          message: `${dryRun ? 'Would sync' : 'Synced'} requirements from class to course ${courseDisplay}`,
          action: dryRun ? 'reported' : 'fixed',
          details: {
            courseId: course.courseId,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            sourceClassId: classWithReqs.classId,
            direction: 'class-to-course'
          }
        });
      }
    }

    // Summary logging
    logger.log('\nRequirements Sync Summary:');
    logger.log(`  Courses updated: ${coursesUpdated}`);
    logger.log(`  Classes updated: ${classesUpdated}`);
    logger.log(`  Total synced: ${coursesUpdated + classesUpdated}`);

    if (result.failed === 0) {
      result.passed = 1;
      logger.log('✓ No requirements sync needed');
    }

    return result;
  } catch (error) {
    logger.error('Failed to sync requirements', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
