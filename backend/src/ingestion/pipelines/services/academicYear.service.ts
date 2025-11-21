import { AcademicYear } from '@prisma/client';
import { prisma } from '../../services/db.service.js';
import * as logger from '../../services/logger.service.js';
import { PipelineResult, success, failure } from '../types/pipeline.types.js';

/**
 * Parse academic year string in format "YYYY-YYYY" into start and end years
 *
 * Examples:
 * - "2024-2025" -> { start: 2024, end: 2025 }
 * - "2023-2024" -> { start: 2023, end: 2024 }
 *
 * @param yearString Academic year string (e.g., "2024-2025")
 * @returns Object with start and end years
 * @throws Error if format is invalid or years are invalid
 */
export function parseAcademicYearString(yearString: string): {
  start: number;
  end: number;
} {
  logger.log(`Parsing academic year string: ${yearString}`);

  // Validate format: must be "YYYY-YYYY"
  const match = yearString.match(/^(\d{4})-(\d{4})$/);

  if (!match) {
    const error = new Error(
      `Invalid academic year format: "${yearString}". Expected format: "YYYY-YYYY" (e.g., "2024-2025")`
    );
    logger.error(error.message);
    throw error;
  }

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);

  // Validate that start comes before end
  if (start >= end) {
    const error = new Error(
      `Invalid academic year range: ${start} >= ${end}. Start year must be less than end year (e.g., "2024-2025" not "2025-2024")`
    );
    logger.error(error.message);
    throw error;
  }

  // Validate that years are reasonable (optional: can add bounds checking)
  if (start < 1900 || start > 2100 || end < 1900 || end > 2100) {
    logger.warn(
      `Academic year ${yearString} is outside typical range (1900-2100)`
    );
  }

  // Validate that end is exactly start + 1 (optional but recommended)
  if (end !== start + 1) {
    logger.warn(
      `Academic year ${yearString} does not span exactly 1 year (${
        end - start
      } years). This is unusual but allowed.`
    );
  }

  logger.log(`Parsed academic year: start=${start}, end=${end}`);

  return { start, end };
}

/**
 * Create a new academic year and set it as current
 * Automatically sets all other years to not current
 *
 * IMPORTANT: This should only be called for NEW academic years.
 * For existing years, use getOrCreateAcademicYear which preserves the isCurrent flag.
 *
 * @param year Year string (e.g., "2024-2025")
 * @returns The created academic year
 */
export async function createAcademicYear(
  year: string
): Promise<PipelineResult<AcademicYear>> {
  logger.log(`Creating academic year: ${year}`);

  try {
    // Parse year string to extract start and end
    const { start, end } = parseAcademicYearString(year);

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    });

    if (existing) {
      logger.warn(`Academic year ${year} already exists (ID: ${existing.id})`);
      return success(existing);
    }

    // Set all other years to not current
    await prisma.academicYear.updateMany({
      data: { isCurrent: false },
    });

    // Create new academic year as current
    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        start,
        end,
        isCurrent: true,
      },
    });

    logger.success(
      `Created academic year ${year} (ID: ${academicYear.id}) as current`
    );

    return success(academicYear);
  } catch (err: any) {
    // Handle unique constraint violation (P2002) - might happen in race conditions
    if (err?.code === 'P2002') {
      logger.warn(`Academic year ${year} was created by another process, fetching it`);
      const existing = await prisma.academicYear.findUnique({
        where: { year },
      });
      if (existing) {
        return success(existing);
      }
    }

    // Handle parsing errors
    if (err instanceof Error && err.message.includes('Invalid academic year')) {
      logger.error(`Failed to parse academic year ${year}`, err);
      return failure(err.message, 'ACADEMIC_YEAR_PARSE_FAILED', err);
    }

    logger.error(`Failed to create academic year ${year}`, err);
    return failure(
      'Failed to create academic year',
      'ACADEMIC_YEAR_CREATE_FAILED',
      err
    );
  }
}

/**
 * Get the current academic year
 * @returns The current academic year or null if none set
 */
export async function getCurrentAcademicYear(): Promise<PipelineResult<AcademicYear | null>> {
  try {
    const current = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!current) {
      logger.warn('No current academic year set');
      return success(null);
    }

    return success(current);
  } catch (err) {
    logger.error('Failed to get current academic year', err);
    return failure(
      'Failed to get current academic year',
      'ACADEMIC_YEAR_GET_FAILED',
      err
    );
  }
}

/**
 * Get an academic year by ID
 * @param id Academic year ID
 * @returns The academic year or null if not found
 */
export async function getAcademicYearById(
  id: number
): Promise<PipelineResult<AcademicYear | null>> {
  try {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      logger.warn(`Academic year with ID ${id} not found`);
      return success(null);
    }

    return success(academicYear);
  } catch (err) {
    logger.error(`Failed to get academic year with ID ${id}`, err);
    return failure(
      'Failed to get academic year',
      'ACADEMIC_YEAR_GET_FAILED',
      err
    );
  }
}

/**
 * Get an academic year by year string
 * @param year Year string (e.g., "2024-2025")
 * @returns The academic year or null if not found
 */
export async function getAcademicYearByYear(
  year: string
): Promise<PipelineResult<AcademicYear | null>> {
  try {
    const academicYear = await prisma.academicYear.findUnique({
      where: { year },
    });

    if (!academicYear) {
      logger.warn(`Academic year ${year} not found`);
      return success(null);
    }

    return success(academicYear);
  } catch (err) {
    logger.error(`Failed to get academic year ${year}`, err);
    return failure(
      'Failed to get academic year',
      'ACADEMIC_YEAR_GET_FAILED',
      err
    );
  }
}

/**
 * Set a specific academic year as current
 * Automatically sets all other years to not current
 *
 * @param id Academic year ID to set as current
 * @returns The updated academic year
 */
export async function setCurrentAcademicYear(
  id: number
): Promise<PipelineResult<AcademicYear>> {
  try {
    // Verify the year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      logger.error(`Academic year with ID ${id} not found`);
      return failure(
        `Academic year with ID ${id} not found`,
        'ACADEMIC_YEAR_NOT_FOUND'
      );
    }

    // Set all years to not current
    await prisma.academicYear.updateMany({
      data: { isCurrent: false },
    });

    // Set the specified year as current
    const updated = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    logger.success(`Set academic year ${updated.year} as current`);

    return success(updated);
  } catch (err) {
    logger.error(`Failed to set academic year ${id} as current`, err);
    return failure(
      'Failed to set current academic year',
      'ACADEMIC_YEAR_UPDATE_FAILED',
      err
    );
  }
}

/**
 * Get all academic years, ordered by start year descending
 * @returns Array of all academic years
 */
export async function getAllAcademicYears(): Promise<
  PipelineResult<AcademicYear[]>
> {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { start: 'desc' },
    });

    return success(years);
  } catch (err) {
    logger.error('Failed to get all academic years', err);
    return failure(
      'Failed to get academic years',
      'ACADEMIC_YEAR_GET_FAILED',
      err
    );
  }
}

/**
 * Get or create an academic year
 *
 * IMPORTANT: isCurrent flag behavior:
 * - If year EXISTS: isCurrent flag is NOT modified (preserves historical state)
 * - If year is NEW: isCurrent is set to true, all other years set to false (one current per system)
 *
 * @param year Year string (e.g., "2024-2025")
 * @returns The academic year
 */
export async function getOrCreateAcademicYear(
  year: string
): Promise<PipelineResult<AcademicYear>> {
  logger.log(`Getting or creating academic year: ${year}`);

  try {
    // Try to find existing
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    });

    if (existing) {
      logger.log(`Academic year ${year} already exists (ID: ${existing.id})`);
      logger.log(`Current isCurrent status: ${existing.isCurrent} - NOT modifying on re-scrape`);

      // IMPORTANT: Do NOT modify isCurrent flag for existing years
      // The flag was set when the year was created and should be preserved
      return success(existing);
    }

    // Create new academic year (this will set isCurrent=true and toggle others)
    return await createAcademicYear(year);
  } catch (err) {
    // Handle parsing errors
    if (err instanceof Error && err.message.includes('Invalid academic year')) {
      logger.error(`Failed to parse academic year ${year}`, err);
      return failure(err.message, 'ACADEMIC_YEAR_PARSE_FAILED', err);
    }

    logger.error(`Failed to get or create academic year ${year}`, err);
    return failure(
      'Failed to get or create academic year',
      'ACADEMIC_YEAR_OPERATION_FAILED',
      err
    );
  }
}

/**
 * Delete an academic year
 * WARNING: This will cascade delete all related courses!
 *
 * @param id Academic year ID to delete
 * @returns Success result or error
 */
export async function deleteAcademicYear(
  id: number
): Promise<PipelineResult<void>> {
  logger.warn(`Deleting academic year with ID ${id} (will delete all courses!)`);

  try {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });

    if (!academicYear) {
      logger.error(`Academic year with ID ${id} not found`);
      return failure(
        `Academic year with ID ${id} not found`,
        'ACADEMIC_YEAR_NOT_FOUND'
      );
    }

    logger.warn(
      `Deleting academic year ${academicYear.year} with ${academicYear._count.courses} courses`
    );

    await prisma.academicYear.delete({
      where: { id },
    });

    logger.success(`Deleted academic year ${academicYear.year}`);

    return success(undefined);
  } catch (err) {
    logger.error(`Failed to delete academic year with ID ${id}`, err);
    return failure(
      'Failed to delete academic year',
      'ACADEMIC_YEAR_DELETE_FAILED',
      err
    );
  }
}
