import * as academicYearChecks from './checks/academicYear.checks.js';
import * as classChecks from './checks/class.checks.js';
import * as courseChecks from './checks/course.checks.js';
import * as orphanChecks from './checks/orphan.checks.js';
import * as requirementsChecks from './checks/requirements.checks.js';
import * as sectionChecks from './checks/section.checks.js';
import * as logger from '../services/logger.service.js';
import {
  ValidationReport,
  ValidationResult,
  ValidationSummary,
} from './types/validation.types.js';

/**
 * Runs all database integrity checks in sequence.
 *
 * Order of execution matters:
 * 1. Fix references (course/class/section relationships)
 * 2. Remove duplicates
 * 3. Fix data quality (credit ranges, term consistency)
 * 4. Enforce constraints (single current year)
 * 5. Fix requirements referential integrity
 * 6. Detect orphans (reporting only)
 *
 * @param dryRun If true, previews changes without applying them
 * @param environment Environment name for reporting
 * @returns Complete validation report
 */
export async function runValidation(
  dryRun: boolean = false,
  environment: string = 'unknown'
): Promise<ValidationReport> {
  const startTime = Date.now();
  const results: ValidationResult[] = [];

  logger.log('\n' + '='.repeat(60));
  logger.log(
    `DATABASE INTEGRITY VALIDATION${dryRun ? ' (DRY RUN)' : ''}`
  );
  logger.log(`Environment: ${environment}`);
  logger.log('='.repeat(60) + '\n');

  try {
    // Check #1: Class references valid course (if courseId not null)
    logger.log('Running Check #1: Class Course References...');
    results.push(await classChecks.checkClassCourseReferences(dryRun));
    logger.log('');

    // Check #2: Class-Course field consistency (subjectCode/courseNumber match)
    logger.log('Running Check #2: Class-Course Field Consistency...');
    results.push(await classChecks.checkClassCourseConsistency(dryRun));
    logger.log('');

    // Check #3: Section references valid class
    logger.log('Running Check #3: Section Class References...');
    results.push(await sectionChecks.checkSectionClassReferences(dryRun));
    logger.log('');

    // Check #4: Section-Class term consistency
    logger.log('Running Check #4: Section-Class Term Consistency...');
    results.push(await sectionChecks.checkSectionTermConsistency(dryRun));
    logger.log('');

    // Check #5: No duplicate courses
    logger.log('Running Check #5: No Duplicate Courses...');
    results.push(await courseChecks.checkDuplicateCourses(dryRun));
    logger.log('');

    // Check #6: No duplicate classes
    logger.log('Running Check #6: No Duplicate Classes...');
    results.push(await classChecks.checkDuplicateClasses(dryRun));
    logger.log('');

    // Check #7: No duplicate sections
    logger.log('Running Check #7: No Duplicate Sections...');
    results.push(await sectionChecks.checkDuplicateSections(dryRun));
    logger.log('');

    // Check #8: Section credit range validation
    logger.log('Running Check #8: Section Credit Ranges...');
    results.push(await sectionChecks.checkSectionCreditRanges(dryRun));
    logger.log('');

    // Check #9: Only one current academic year
    logger.log('Running Check #9: Single Current Academic Year...');
    results.push(await academicYearChecks.checkSingleCurrentYear(dryRun));
    logger.log('');

    // Check #10: Requirements referential integrity
    logger.log('Running Check #10: Requirements Referential Integrity...');
    results.push(await requirementsChecks.checkRequirementsReferentialIntegrity(dryRun));
    logger.log('');

    // Check #11: Orphaned data detection (classes without courses)
    logger.log('Running Check #11: Orphaned Data Detection...');
    results.push(await orphanChecks.detectOrphanedData(dryRun));
    logger.log('');
  } catch (error) {
    logger.error('Validation failed with unexpected error', error);
    throw error;
  }

  // Generate summary
  const summary = generateSummary(results);
  const duration = Date.now() - startTime;

  // Print summary
  logger.log('\n' + '='.repeat(60));
  logger.log('VALIDATION SUMMARY');
  logger.log('='.repeat(60));
  logger.log(`Total Checks: ${summary.totalChecks}`);
  logger.log(`Passed: ${summary.totalPassed}`);
  logger.log(`Failed: ${summary.totalFailed}`);
  logger.log(`Fixed: ${summary.totalFixed}`);
  logger.log(`Deleted: ${summary.totalDeleted}`);
  logger.log(`Warnings: ${summary.totalWarnings}`);
  logger.log(`Errors: ${summary.totalErrors}`);
  logger.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  logger.log('='.repeat(60) + '\n');

  if (summary.totalFailed > 0 || summary.totalErrors > 0) {
    if (dryRun) {
      logger.warn(
        `Found ${summary.totalFailed} issues that would be fixed. Run without --dry-run to apply changes.`
      );
    } else {
      logger.success(
        `Fixed ${summary.totalFixed} issues, deleted ${summary.totalDeleted} invalid records.`
      );
    }
  } else {
    logger.success('All validation checks passed! Database integrity verified.');
  }

  return {
    timestamp: new Date(),
    environment,
    dryRun,
    results,
    summary,
  };
}

/**
 * Generates summary statistics from validation results
 */
function generateSummary(results: ValidationResult[]): ValidationSummary {
  return {
    totalChecks: results.length,
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalFixed: results.reduce((sum, r) => sum + r.fixed, 0),
    totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
  };
}
