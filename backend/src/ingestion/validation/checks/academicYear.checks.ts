import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Check #8: Only one current academic year at a time
 *
 * Ensures that only one academic year has isCurrent = true.
 * If multiple years are marked as current, keeps the most recent and unmarks the others.
 */
export async function checkSingleCurrentYear(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Single Current Academic Year');

  try {
    // Find all academic years marked as current
    const currentYears = await prisma.academicYear.findMany({
      where: { isCurrent: true },
      orderBy: [{ start: 'desc' }, { updatedAt: 'desc' }],
    });

    if (currentYears.length === 0) {
      logger.warn('No academic year is marked as current');
      result.warnings.push({
        id: 'no-current-year',
        message: 'No academic year is marked as current',
        action: 'reported',
      });
      return result;
    }

    if (currentYears.length === 1) {
      // Everything is fine
      result.passed = 1;
      logger.log('✓ Single current academic year validated');
      return result;
    }

    // Multiple current years found - need to fix
    result.failed = currentYears.length;
    const correctYear = currentYears[0]; // Most recent
    const yearsToUnmark = currentYears.slice(1);

    logger.warn(
      `Found ${currentYears.length} academic years marked as current: ${currentYears.map((y) => y.year).join(', ')}`
    );
    logger.log(`Keeping ${correctYear.year} as current`);

    if (!dryRun) {
      // Unmark all others
      for (const year of yearsToUnmark) {
        await prisma.academicYear.update({
          where: { id: year.id },
          data: { isCurrent: false },
        });

        logger.success(`Unmarked ${year.year} as current`);
        result.fixed++;
        result.warnings.push({
          id: `academic-year-${year.id}`,
          message: `Multiple current academic years found - set ${correctYear.year} as current, unmarked ${year.year}`,
          action: 'fixed',
          details: {
            keptYear: correctYear.year,
            unmarkedYear: year.year,
          },
        });
      }
    } else {
      logger.log(
        `[DRY RUN] Would unmark: ${yearsToUnmark.map((y) => y.year).join(', ')}`
      );
      result.fixed = yearsToUnmark.length;
      yearsToUnmark.forEach((year) => {
        result.warnings.push({
          id: `academic-year-${year.id}`,
          message: `Would unmark ${year.year} as current (keeping ${correctYear.year})`,
          action: 'fixed',
          details: {
            keptYear: correctYear.year,
            unmarkedYear: year.year,
          },
        });
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to check single current year', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
