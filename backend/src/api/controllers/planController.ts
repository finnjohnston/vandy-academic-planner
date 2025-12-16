import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/plans
 * List all plans
 */
export async function getPlans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.http('GET /api/plans');

    const plans = await prisma.plan.findMany({
      include: {
        academicYear: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Transform data - return relevant fields
    const transformedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      schoolId: plan.schoolId,
      academicYearId: plan.academicYearId,
      academicYear: plan.academicYear ? {
        id: plan.academicYear.id,
        year: plan.academicYear.year,
        start: plan.academicYear.start,
        end: plan.academicYear.end,
      } : null,
      currentSemester: plan.currentSemester,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));

    sendSuccess(res, transformedPlans);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:id
 * Get a specific plan with its planned courses
 */
export async function getPlanById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/plans/${id}`);

    const plan = await prisma.plan.findUnique({
      where: { id: Number(id) },
      include: {
        academicYear: true,
        plannedCourses: {
          include: {
            course: true,
            class: true,
          },
          orderBy: [{ semesterNumber: 'asc' }, { courseId: 'asc' }],
        },
      },
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // Transform data - return plan with nested planned courses
    const transformedPlan = {
      id: plan.id,
      name: plan.name,
      schoolId: plan.schoolId,
      academicYearId: plan.academicYearId,
      academicYear: plan.academicYear,
      currentSemester: plan.currentSemester,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      plannedCourses: plan.plannedCourses.map((pc) => ({
        id: pc.id,
        planId: pc.planId,
        courseId: pc.courseId,
        classId: pc.classId,
        semesterNumber: pc.semesterNumber,
        credits: pc.credits,
        createdAt: pc.createdAt,
        updatedAt: pc.updatedAt,
        course: pc.course,
        class: pc.class,
      })),
    };

    sendSuccess(res, transformedPlan);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/plans
 * Create a new plan
 */
export async function createPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, schoolId, academicYearId, currentSemester, isActive } =
      req.body;
    logger.http(`POST /api/plans (${name})`);

    const plan = await prisma.plan.create({
      data: {
        name,
        schoolId,
        academicYearId,
        currentSemester,
        isActive,
      },
      include: {
        academicYear: true,
      },
    });

    // Transform data - return relevant fields
    const transformedPlan = {
      id: plan.id,
      name: plan.name,
      schoolId: plan.schoolId,
      academicYearId: plan.academicYearId,
      academicYear: plan.academicYear,
      currentSemester: plan.currentSemester,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    res.status(201).json({ data: transformedPlan });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/plans/:id
 * Update an existing plan
 */
export async function updatePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.http(`PUT /api/plans/${id}`);

    const plan = await prisma.plan.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        academicYear: true,
      },
    });

    // Transform data - return relevant fields
    const transformedPlan = {
      id: plan.id,
      name: plan.name,
      schoolId: plan.schoolId,
      academicYearId: plan.academicYearId,
      academicYear: plan.academicYear,
      currentSemester: plan.currentSemester,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    sendSuccess(res, transformedPlan);
  } catch (err) {
    // Handle Prisma "record not found" error
    if (
      err instanceof Error &&
      err.message.includes('Record to update not found')
    ) {
      next(new NotFoundError('Plan not found'));
    } else {
      next(err);
    }
  }
}

/**
 * DELETE /api/plans/:id
 * Delete a plan (cascade deletes planned courses)
 */
export async function deletePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`DELETE /api/plans/${id}`);

    await prisma.plan.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (err) {
    // Handle Prisma "record not found" error
    if (
      err instanceof Error &&
      err.message.includes('Record to delete not found')
    ) {
      next(new NotFoundError('Plan not found'));
    } else {
      next(err);
    }
  }
}

/**
 * POST /api/plans/:id/duplicate
 * Duplicate a plan with a new name
 */
export async function duplicatePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;
    logger.http(`POST /api/plans/${id}/duplicate (${name})`);

    // Fetch original plan with planned courses
    const originalPlan = await prisma.plan.findUnique({
      where: { id: Number(id) },
      include: { plannedCourses: true },
    });

    if (!originalPlan) {
      throw new NotFoundError('Plan not found');
    }

    // Create duplicate plan with copied planned courses
    const duplicatedPlan = await prisma.plan.create({
      data: {
        name,
        schoolId: originalPlan.schoolId,
        academicYearId: originalPlan.academicYearId,
        currentSemester: 0, // Reset to semester 0
        isActive: false, // New plan starts inactive
        plannedCourses: {
          create: originalPlan.plannedCourses.map((pc) => ({
            courseId: pc.courseId,
            classId: pc.classId,
            semesterNumber: pc.semesterNumber,
            credits: pc.credits,
          })),
        },
      },
      include: {
        academicYear: true,
        plannedCourses: true,
      },
    });

    // Transform data - return plan with nested planned courses
    const transformedPlan = {
      id: duplicatedPlan.id,
      name: duplicatedPlan.name,
      schoolId: duplicatedPlan.schoolId,
      academicYearId: duplicatedPlan.academicYearId,
      academicYear: duplicatedPlan.academicYear,
      currentSemester: duplicatedPlan.currentSemester,
      isActive: duplicatedPlan.isActive,
      createdAt: duplicatedPlan.createdAt,
      updatedAt: duplicatedPlan.updatedAt,
      plannedCourses: duplicatedPlan.plannedCourses.map((pc) => ({
        id: pc.id,
        planId: pc.planId,
        courseId: pc.courseId,
        classId: pc.classId,
        semesterNumber: pc.semesterNumber,
        credits: pc.credits,
        createdAt: pc.createdAt,
        updatedAt: pc.updatedAt,
      })),
    };

    res.status(201).json({ data: transformedPlan });
  } catch (err) {
    next(err);
  }
}
