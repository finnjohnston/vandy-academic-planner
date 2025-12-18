import { PrismaClient } from '@prisma/client';

/**
 * Get the next available position for a semester
 * @param prisma Prisma client or transaction
 * @param planId Plan ID
 * @param semesterNumber Semester number
 * @returns Next available position (max + 1, or 0 if no courses)
 */
export async function getNextPosition(
  prisma: PrismaClient | any,
  planId: number,
  semesterNumber: number
): Promise<number> {
  const maxPosition = await prisma.plannedCourse.aggregate({
    where: { planId, semesterNumber },
    _max: { position: true },
  });

  return (maxPosition._max.position ?? -1) + 1;
}

/**
 * Shift positions down (increment) for courses at or after a position
 * Used when inserting a course at a specific position
 * @param prisma Prisma client or transaction
 * @param planId Plan ID
 * @param semesterNumber Semester number
 * @param fromPosition Starting position to shift (inclusive)
 */
export async function shiftPositionsDown(
  prisma: PrismaClient | any,
  planId: number,
  semesterNumber: number,
  fromPosition: number
): Promise<void> {
  await prisma.plannedCourse.updateMany({
    where: {
      planId,
      semesterNumber,
      position: { gte: fromPosition },
    },
    data: {
      position: { increment: 1 },
    },
  });
}

/**
 * Shift positions up (decrement) for courses after a position
 * Used when deleting a course to close the gap
 * @param prisma Prisma client or transaction
 * @param planId Plan ID
 * @param semesterNumber Semester number
 * @param fromPosition Starting position to shift (exclusive - courses AFTER this position)
 */
export async function shiftPositionsUp(
  prisma: PrismaClient | any,
  planId: number,
  semesterNumber: number,
  fromPosition: number
): Promise<void> {
  await prisma.plannedCourse.updateMany({
    where: {
      planId,
      semesterNumber,
      position: { gt: fromPosition },
    },
    data: {
      position: { decrement: 1 },
    },
  });
}

/**
 * Validate that a position is within valid range for a semester
 * @param prisma Prisma client or transaction
 * @param planId Plan ID
 * @param semesterNumber Semester number
 * @param position Position to validate
 * @throws Error if position is invalid
 */
export async function validatePosition(
  prisma: PrismaClient | any,
  planId: number,
  semesterNumber: number,
  position: number
): Promise<void> {
  if (position < 0) {
    throw new Error('Position must be non-negative');
  }

  // Get count of courses in semester
  const count = await prisma.plannedCourse.count({
    where: { planId, semesterNumber },
  });

  // Position can be 0 to count (inclusive, count allows appending)
  if (position > count) {
    throw new Error(
      `Position ${position} is out of range. Valid range: 0-${count}`
    );
  }
}

/**
 * Reorder a course within the same semester
 * Handles shifting positions to make room for the course at new position
 * @param prisma Prisma client or transaction
 * @param courseId Course ID to reorder
 * @param planId Plan ID
 * @param semesterNumber Semester number
 * @param oldPosition Current position
 * @param newPosition Target position
 */
export async function reorderWithinSemester(
  prisma: PrismaClient | any,
  courseId: number,
  planId: number,
  semesterNumber: number,
  oldPosition: number,
  newPosition: number
): Promise<void> {
  if (oldPosition === newPosition) {
    return; // No change needed
  }

  if (oldPosition < newPosition) {
    // Moving down: shift courses between old and new positions up
    await prisma.plannedCourse.updateMany({
      where: {
        planId,
        semesterNumber,
        position: { gt: oldPosition, lte: newPosition },
      },
      data: {
        position: { decrement: 1 },
      },
    });
  } else {
    // Moving up: shift courses between new and old positions down
    await prisma.plannedCourse.updateMany({
      where: {
        planId,
        semesterNumber,
        position: { gte: newPosition, lt: oldPosition },
      },
      data: {
        position: { increment: 1 },
      },
    });
  }

  // Update the course to new position
  await prisma.plannedCourse.update({
    where: { id: courseId },
    data: { position: newPosition },
  });
}
