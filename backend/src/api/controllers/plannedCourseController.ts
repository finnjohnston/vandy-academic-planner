import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';
import {
  getNextPosition,
  shiftPositionsDown,
  shiftPositionsUp,
  validatePosition,
  reorderWithinSemester,
} from '../utils/position.utils.js';

/**
 * GET /api/plans/:planId/courses
 * List courses in a plan (with optional semesterNumber filter)
 */
export async function getPlannedCourses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    const { semesterNumber } = req.query;
    const queryString = semesterNumber
      ? `?semesterNumber=${semesterNumber}`
      : '';
    logger.http(`GET /api/plans/${planId}/courses${queryString}`);

    // Build where clause with optional semesterNumber filter
    const where: { planId: number; semesterNumber?: number } = {
      planId: Number(planId),
    };
    if (semesterNumber !== undefined) {
      where.semesterNumber = Number(semesterNumber);
    }

    const plannedCourses = await prisma.plannedCourse.findMany({
      where,
      include: {
        course: true,
        class: true,
      },
      orderBy: [{ semesterNumber: 'asc' }, { position: 'asc' }],
    });

    // Transform data - return relevant fields
    const transformedPlannedCourses = plannedCourses.map((pc) => ({
      id: pc.id,
      planId: pc.planId,
      courseId: pc.courseId,
      classId: pc.classId,
      semesterNumber: pc.semesterNumber,
      position: pc.position,
      credits: pc.credits,
      createdAt: pc.createdAt,
      updatedAt: pc.updatedAt,
      course: pc.course,
      class: pc.class,
    }));

    sendSuccess(res, transformedPlannedCourses);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:planId/courses/:id
 * Get a specific planned course
 */
export async function getPlannedCourseById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, id } = req.params;
    logger.http(`GET /api/plans/${planId}/courses/${id}`);

    const plannedCourse = await prisma.plannedCourse.findUnique({
      where: { id: Number(id) },
      include: {
        course: true,
        class: true,
      },
    });

    if (!plannedCourse) {
      throw new NotFoundError('Planned course not found');
    }

    // Security: Verify the planned course belongs to the specified plan
    if (plannedCourse.planId !== Number(planId)) {
      throw new NotFoundError('Planned course not found');
    }

    // Transform data - return relevant fields
    const transformedPlannedCourse = {
      id: plannedCourse.id,
      planId: plannedCourse.planId,
      courseId: plannedCourse.courseId,
      classId: plannedCourse.classId,
      semesterNumber: plannedCourse.semesterNumber,
      position: plannedCourse.position,
      credits: plannedCourse.credits,
      createdAt: plannedCourse.createdAt,
      updatedAt: plannedCourse.updatedAt,
      course: plannedCourse.course,
      class: plannedCourse.class,
    };

    sendSuccess(res, transformedPlannedCourse);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/plans/:planId/courses
 * Add a course to a plan
 */
export async function addPlannedCourse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    const { courseId, classId, semesterNumber, credits, position } = req.body;
    logger.http(`POST /api/plans/${planId}/courses`);

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // Use transaction to ensure atomic position updates
    const plannedCourse = await prisma.$transaction(async (tx) => {
      let finalPosition: number;

      if (position !== undefined) {
        // Validate position is within range
        await validatePosition(
          tx,
          Number(planId),
          semesterNumber,
          position
        );

        // Shift existing courses down to make room
        await shiftPositionsDown(
          tx,
          Number(planId),
          semesterNumber,
          position
        );

        finalPosition = position;
      } else {
        // No position specified - append to end
        finalPosition = await getNextPosition(
          tx,
          Number(planId),
          semesterNumber
        );
      }

      // Create the planned course
      return await tx.plannedCourse.create({
        data: {
          planId: Number(planId),
          courseId,
          classId,
          semesterNumber,
          credits,
          position: finalPosition,
        },
      });
    });

    // Transform data - return relevant fields
    const transformedPlannedCourse = {
      id: plannedCourse.id,
      planId: plannedCourse.planId,
      courseId: plannedCourse.courseId,
      classId: plannedCourse.classId,
      semesterNumber: plannedCourse.semesterNumber,
      position: plannedCourse.position,
      credits: plannedCourse.credits,
      createdAt: plannedCourse.createdAt,
      updatedAt: plannedCourse.updatedAt,
    };

    res.status(201).json({ data: transformedPlannedCourse });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/plans/:planId/courses/:id
 * Update a planned course (semesterNumber, credits, courseId, classId)
 */
export async function updatePlannedCourse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, id } = req.params;
    const updateData = req.body;
    logger.http(`PUT /api/plans/${planId}/courses/${id}`);

    // Fetch existing planned course
    const existingPlannedCourse = await prisma.plannedCourse.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPlannedCourse) {
      throw new NotFoundError('Planned course not found');
    }

    // Security: Verify the planned course belongs to the specified plan
    if (existingPlannedCourse.planId !== Number(planId)) {
      throw new NotFoundError('Planned course not found');
    }

    // Use transaction for position updates
    const plannedCourse = await prisma.$transaction(async (tx) => {
      const isSemesterChange =
        updateData.semesterNumber !== undefined &&
        updateData.semesterNumber !== existingPlannedCourse.semesterNumber;

      const isPositionChange =
        updateData.position !== undefined &&
        updateData.position !== existingPlannedCourse.position;

      // CASE 1: Moving to a different semester
      if (isSemesterChange) {
        // Remove from old semester - shift positions up to close gap
        await shiftPositionsUp(
          tx,
          Number(planId),
          existingPlannedCourse.semesterNumber,
          existingPlannedCourse.position
        );

        let newPosition: number;

        if (updateData.position !== undefined) {
          // Position specified for new semester
          await validatePosition(
            tx,
            Number(planId),
            updateData.semesterNumber,
            updateData.position
          );

          // Make room in new semester
          await shiftPositionsDown(
            tx,
            Number(planId),
            updateData.semesterNumber,
            updateData.position
          );

          newPosition = updateData.position;
        } else {
          // No position specified - append to end of new semester
          newPosition = await getNextPosition(
            tx,
            Number(planId),
            updateData.semesterNumber
          );
        }

        // Update with new semester and position
        return await tx.plannedCourse.update({
          where: { id: Number(id) },
          data: {
            ...updateData,
            position: newPosition,
          },
        });
      }

      // CASE 2: Reordering within same semester
      else if (isPositionChange) {
        await validatePosition(
          tx,
          Number(planId),
          existingPlannedCourse.semesterNumber,
          updateData.position
        );

        await reorderWithinSemester(
          tx,
          Number(id),
          Number(planId),
          existingPlannedCourse.semesterNumber,
          existingPlannedCourse.position,
          updateData.position
        );

        // Fetch updated course
        return await tx.plannedCourse.findUnique({
          where: { id: Number(id) },
        });
      }

      // CASE 3: Other updates (credits, courseId, classId) - no position changes
      else {
        return await tx.plannedCourse.update({
          where: { id: Number(id) },
          data: updateData,
        });
      }
    });

    // Transform data - return relevant fields
    const transformedPlannedCourse = {
      id: plannedCourse!.id,
      planId: plannedCourse!.planId,
      courseId: plannedCourse!.courseId,
      classId: plannedCourse!.classId,
      semesterNumber: plannedCourse!.semesterNumber,
      position: plannedCourse!.position,
      credits: plannedCourse!.credits,
      createdAt: plannedCourse!.createdAt,
      updatedAt: plannedCourse!.updatedAt,
    };

    sendSuccess(res, transformedPlannedCourse);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/plans/:planId/courses/:id
 * Remove a course from a plan
 */
export async function deletePlannedCourse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, id } = req.params;
    logger.http(`DELETE /api/plans/${planId}/courses/${id}`);

    // Fetch existing planned course
    const existingPlannedCourse = await prisma.plannedCourse.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPlannedCourse) {
      throw new NotFoundError('Planned course not found');
    }

    // Security: Verify the planned course belongs to the specified plan
    if (existingPlannedCourse.planId !== Number(planId)) {
      throw new NotFoundError('Planned course not found');
    }

    // Use transaction to delete and shift positions
    await prisma.$transaction(async (tx) => {
      // Delete the course
      await tx.plannedCourse.delete({
        where: { id: Number(id) },
      });

      // Shift positions up to close the gap
      await shiftPositionsUp(
        tx,
        Number(planId),
        existingPlannedCourse.semesterNumber,
        existingPlannedCourse.position
      );
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
