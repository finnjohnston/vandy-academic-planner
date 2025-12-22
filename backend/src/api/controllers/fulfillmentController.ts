import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/plans/:planId/programs/:planProgramId/fulfillments
 * List all requirement fulfillments for a specific plan-program
 */
export async function getPlanProgramFulfillments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, planProgramId } = req.params;
    logger.http(
      `GET /api/plans/${planId}/programs/${planProgramId}/fulfillments`
    );

    // Verify planProgram exists and belongs to plan (security check)
    const planProgram = await prisma.planProgram.findUnique({
      where: { id: Number(planProgramId) },
    });

    if (!planProgram || planProgram.planId !== Number(planId)) {
      throw new NotFoundError('Program association not found');
    }

    // Fetch fulfillments with course details
    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: Number(planProgramId) },
      include: {
        plannedCourse: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        requirementId: 'asc',
      },
    });

    // Transform response
    const transformedFulfillments = fulfillments.map((f) => ({
      id: f.id,
      planProgramId: f.planProgramId,
      requirementId: f.requirementId,
      plannedCourseId: f.plannedCourseId,
      creditsApplied: f.creditsApplied,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      course: {
        id: f.plannedCourse.course.id,
        courseId: f.plannedCourse.course.courseId,
        title: f.plannedCourse.course.title,
        credits: f.plannedCourse.course.credits,
      },
    }));

    sendSuccess(res, transformedFulfillments);
  } catch (err) {
    next(err);
  }
}
