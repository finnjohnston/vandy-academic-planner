import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import {
  ValidationResult,
  createValidationResult,
} from '../types/validation.types.js';

/**
 * Check #2: Every section references a valid class
 *
 * Deletes sections that reference non-existent classes.
 */
export async function checkSectionClassReferences(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Section Class References');

  try {
    // Find sections with classId that don't reference existing classes
    // We need to find sections where the class relation doesn't exist
    const allSections = await prisma.section.findMany({
      include: {
        class: true,
      },
    });

    const invalidSections = allSections.filter((section) => !section.class);

    if (invalidSections.length === 0) {
      result.passed = 1;
      logger.log('✓ All sections reference valid classes');
      return result;
    }

    result.failed = invalidSections.length;

    for (const section of invalidSections) {
      if (!dryRun) {
        await prisma.section.delete({ where: { id: section.id } });
        logger.warn(
          `Deleting orphaned section ${section.sectionId} in term ${section.termId} - class ${section.classId} not found`
        );
        result.deleted++;
      } else {
        logger.log(
          `[DRY RUN] Would delete orphaned section ${section.sectionId} (class ${section.classId} not found)`
        );
        result.deleted++;
      }

      result.warnings.push({
        id: `section-${section.id}`,
        message: `Deleting orphaned section ${section.sectionId} in term ${section.termId} - class ${section.classId} not found`,
        action: 'deleted',
        details: {
          sectionId: section.sectionId,
          termId: section.termId,
          invalidClassId: section.classId,
        },
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to check section class references', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #4: No duplicate sections
 *
 * Deletes duplicate sections with same (termId, sectionId), keeping most recent.
 */
export async function checkDuplicateSections(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('No Duplicate Sections');

  try {
    // Find duplicates by (termId, sectionId)
    const duplicates = await prisma.section.groupBy({
      by: ['termId', 'sectionId'],
      having: {
        termId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicates.length === 0) {
      result.passed = 1;
      logger.log('✓ No duplicate sections found');
      return result;
    }

    for (const dup of duplicates) {
      const sections = await prisma.section.findMany({
        where: {
          termId: dup.termId,
          sectionId: dup.sectionId,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      const toKeep = sections[0];
      const toDelete = sections.slice(1);

      result.failed += toDelete.length;

      logger.warn(
        `Found ${sections.length} sections with sectionId ${dup.sectionId} in term ${dup.termId}`
      );
      logger.log(`  Keeping: ${toKeep.id} (updated ${toKeep.updatedAt})`);

      for (const section of toDelete) {
        if (!dryRun) {
          await prisma.section.delete({ where: { id: section.id } });
          logger.success(`  Deleted duplicate section ${section.id}`);
          result.deleted++;
        } else {
          logger.log(`  [DRY RUN] Would delete duplicate section ${section.id}`);
          result.deleted++;
        }

        result.errors.push({
          id: `section-${section.id}`,
          message: `Found duplicate sections ${dup.sectionId} in term ${dup.termId} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            sectionId: dup.sectionId,
            termId: dup.termId,
            kept: toKeep.id,
            deleted: section.id,
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check duplicate sections', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #7: Term-Class-Section consistency
 *
 * Updates section's termId to match its class's termId.
 */
export async function checkSectionTermConsistency(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Section-Class Term Consistency');

  try {
    // Find sections where termId doesn't match class's termId
    const inconsistentSections = await prisma.section.findMany({
      include: { class: true },
    });

    const mismatched = inconsistentSections.filter(
      (section) => section.termId !== section.class.termId
    );

    if (mismatched.length === 0) {
      result.passed = 1;
      logger.log('✓ All sections have consistent termId with their class');
      return result;
    }

    result.failed = mismatched.length;

    for (const section of mismatched) {
      const oldTermId = section.termId;
      const newTermId = section.class.termId;

      if (!dryRun) {
        await prisma.section.update({
          where: { id: section.id },
          data: { termId: newTermId },
        });
        logger.warn(
          `Fixed section ${section.sectionId} termId mismatch: changed from ${oldTermId} to ${newTermId}`
        );
        result.fixed++;
      } else {
        logger.log(
          `[DRY RUN] Would fix section ${section.sectionId} termId: ${oldTermId} -> ${newTermId}`
        );
        result.fixed++;
      }

      result.warnings.push({
        id: `section-${section.id}`,
        message: `Fixed section ${section.sectionId} termId mismatch: changed from ${oldTermId} to ${newTermId}`,
        action: 'fixed',
        details: {
          sectionId: section.sectionId,
          oldTermId,
          newTermId,
        },
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to check section term consistency', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #10: Section number uniqueness within a class
 *
 * Deletes duplicate section numbers within same class, keeping most recent.
 */
export async function checkSectionNumberUniqueness(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Section Number Uniqueness');

  try {
    // Find duplicates by (classId, sectionNumber)
    const duplicates = await prisma.section.groupBy({
      by: ['classId', 'sectionNumber'],
      having: {
        classId: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    if (duplicates.length === 0) {
      result.passed = 1;
      logger.log('✓ All section numbers are unique within classes');
      return result;
    }

    for (const dup of duplicates) {
      const sections = await prisma.section.findMany({
        where: {
          classId: dup.classId,
          sectionNumber: dup.sectionNumber,
        },
        include: {
          class: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      const toKeep = sections[0];
      const toDelete = sections.slice(1);

      result.failed += toDelete.length;

      const classDisplay = toKeep.class
        ? `${toKeep.class.subjectCode} ${toKeep.class.courseNumber} "${toKeep.class.title}"`
        : `class ${dup.classId}`;

      logger.warn(
        `Found ${sections.length} sections with number ${dup.sectionNumber} for ${classDisplay}`
      );

      for (const section of toDelete) {
        const sectionDisplay = `${classDisplay} section ${section.sectionNumber} (${section.sectionId})`;

        if (!dryRun) {
          await prisma.section.delete({ where: { id: section.id } });
          logger.success(
            `Deleted duplicate ${sectionDisplay}`
          );
          result.deleted++;
        } else {
          logger.log(
            `[DRY RUN] Would delete duplicate ${sectionDisplay}`
          );
          result.deleted++;
        }

        result.errors.push({
          id: `section-${section.id}`,
          message: `Found duplicate section number ${dup.sectionNumber} for ${classDisplay} - ${dryRun ? 'would keep' : 'kept'} most recent`,
          action: 'deleted',
          details: {
            classId: dup.classId,
            sectionNumber: dup.sectionNumber,
            sectionId: section.sectionId,
            subjectCode: section.class?.subjectCode,
            courseNumber: section.class?.courseNumber,
            title: section.class?.title,
            kept: toKeep.id,
            deleted: section.id,
          },
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to check section number uniqueness', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}

/**
 * Check #6: Credit range validation for sections
 */
export async function checkSectionCreditRanges(
  dryRun: boolean = false
): Promise<ValidationResult> {
  const result = createValidationResult('Section Credit Ranges');

  try {
    const invalidSections = await prisma.section.findMany({
      where: {
        OR: [
          { creditsMin: { lte: 0 } },
          { creditsMax: { lte: 0 } },
          { creditsMin: { gt: prisma.section.fields.creditsMax } },
        ],
      },
      include: { class: true },
    });

    if (invalidSections.length === 0) {
      result.passed = 1;
      logger.log('✓ All section credit ranges are valid');
      return result;
    }

    for (const section of invalidSections) {
      let { creditsMin, creditsMax } = section;
      const original = { creditsMin, creditsMax };
      let fixed = false;

      // Try to inherit from class
      if (section.class) {
        const newCreditsMin = section.class.creditsMin;
        const newCreditsMax = section.class.creditsMax;

        // Only mark as fixed if the values would actually change
        if (creditsMin !== newCreditsMin || creditsMax !== newCreditsMax) {
          creditsMin = newCreditsMin;
          creditsMax = newCreditsMax;
          fixed = true;
        }
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
        result.failed++;

        const sectionDisplay = section.class
          ? `${section.class.subjectCode} ${section.class.courseNumber} "${section.class.title}" section ${section.sectionNumber} (${section.sectionId})`
          : `Section ${section.sectionNumber} (${section.sectionId})`;

        if (!dryRun) {
          await prisma.section.update({
            where: { id: section.id },
            data: { creditsMin, creditsMax },
          });
          logger.success(
            `Fixed credit range for ${sectionDisplay}: was (${original.creditsMin}, ${original.creditsMax}), now (${creditsMin}, ${creditsMax})${section.class ? ' (inherited from class)' : ''}`
          );
          result.fixed++;
        } else {
          logger.log(
            `[DRY RUN] Would fix ${sectionDisplay}: (${original.creditsMin}, ${original.creditsMax}) -> (${creditsMin}, ${creditsMax})`
          );
          result.fixed++;
        }

        result.errors.push({
          id: `section-${section.id}`,
          message: `Fixed invalid credit range for section ${sectionDisplay}`,
          action: 'fixed',
          details: {
            sectionId: section.sectionId,
            sectionNumber: section.sectionNumber,
            classId: section.classId,
            subjectCode: section.class?.subjectCode,
            courseNumber: section.class?.courseNumber,
            title: section.class?.title,
            before: original,
            after: { creditsMin, creditsMax },
            inheritedFromClass: !!section.class,
          },
        });
      }
    }

    // If no sections needed fixing, mark as passed
    if (result.failed === 0) {
      result.passed = 1;
      logger.log('✓ All section credit ranges are valid');
    }

    return result;
  } catch (error) {
    logger.error('Failed to check section credit ranges', error);
    result.errors.push({
      id: 'check-failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
      action: 'none',
    });
    return result;
  }
}
