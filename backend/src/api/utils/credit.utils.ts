import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../types/error.types.js';

const MAX_SEMESTER_CREDITS = 18;

/**
 * Validates that adding credits to a semester won't exceed the limit
 * @param tx - Prisma transaction client
 * @param planId - The plan ID
 * @param semesterNumber - The semester to check
 * @param additionalCredits - Credits being added
 * @param excludePlannedCourseId - Optional ID to exclude from calculation (for moves)
 * @throws ValidationError if limit would be exceeded
 */
export async function validateCreditLimit(
  tx: PrismaClient | any,
  planId: number,
  semesterNumber: number,
  additionalCredits: number,
  excludePlannedCourseId?: number
): Promise<void> {
  // Get current semester credits
  const where: any = {
    planId,
    semesterNumber,
  };

  // When moving a course, exclude it from the current total
  if (excludePlannedCourseId !== undefined) {
    where.id = { not: excludePlannedCourseId };
  }

  const semesterCourses = await tx.plannedCourse.findMany({
    where,
    select: { credits: true },
  });

  const currentCredits = semesterCourses.reduce(
    (sum: number, course: { credits: number }) => sum + course.credits,
    0
  );

  const newTotal = currentCredits + additionalCredits;

  if (newTotal > MAX_SEMESTER_CREDITS) {
    throw new ValidationError(
      `Semester credit limit exceeded. Maximum is ${MAX_SEMESTER_CREDITS} credits per semester. ` +
      `Current: ${currentCredits}, Adding: ${additionalCredits}, Would be: ${newTotal}`
    );
  }
}

/**
 * Calculates total credits for a semester
 * @param tx - Prisma transaction client
 * @param planId - The plan ID
 * @param semesterNumber - The semester to calculate
 * @returns Total credits in the semester
 */
export async function calculateSemesterCredits(
  tx: PrismaClient | any,
  planId: number,
  semesterNumber: number
): Promise<number> {
  const semesterCourses = await tx.plannedCourse.findMany({
    where: { planId, semesterNumber },
    select: { credits: true },
  });

  return semesterCourses.reduce(
    (sum: number, course: { credits: number }) => sum + course.credits,
    0
  );
}
