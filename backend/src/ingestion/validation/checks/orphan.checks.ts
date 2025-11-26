import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Check #12: Orphaned data detection
 *
 * Detects children without parents (classes without courses).
 * Sections without classes are handled by Check #2 (deleted, not just reported).
 * Generates report for manual review.
 */
export async function detectOrphanedData(
  _dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Orphaned Data Detection');

  try {
    // Find classes without a course link (courseId = null)
    const orphanedClasses = await prisma.class.findMany({
      where: {
        courseId: null,
      },
      include: {
        term: true,
      },
    });

    // Report findings
    if (orphanedClasses.length === 0) {
      result.passed = 1;
      logger.log('✓ No orphaned classes found (all classes linked to courses)');
      return result;
    }

    // Orphaned classes (classes without a course link)
    logger.log(
      `Found ${orphanedClasses.length} orphaned classes (not linked to a course):`
    );

    // Log all orphaned classes
    for (const cls of orphanedClasses) {
      logger.log(`  - ${cls.subjectCode} ${cls.courseNumber} "${cls.title}" in ${cls.term.name} (${cls.classId})`);
    }

    result.warnings.push({
      id: 'orphaned-classes',
      message: `Found ${orphanedClasses.length} orphaned classes (not linked to a course - may be special topics or courses not in catalog)`,
      action: 'reported',
      details: {
        count: orphanedClasses.length,
        classes: orphanedClasses.map((c) => ({
          classId: c.classId,
          subjectCode: c.subjectCode,
          courseNumber: c.courseNumber,
          title: c.title,
          termId: c.termId,
          termName: c.term.name,
        })),
      },
    });

    return result;
  } catch (error) {
    logger.error('Failed to detect orphaned data', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
