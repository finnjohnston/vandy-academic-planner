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
        school: true,
        planPrograms: {
          include: {
            program: true,
          },
          orderBy: [
            { program: { type: 'asc' } },
            { createdAt: 'asc' },
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
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
      school: plan.school,
      currentSemester: plan.currentSemester,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      programs: plan.planPrograms.map(pp => ({
        id: pp.id,
        name: pp.program.name,
        type: pp.program.type,
      })),
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
        school: true,
        plannedCourses: {
          include: {
            course: true,
            class: true,
          },
          orderBy: [{ semesterNumber: 'asc' }, { position: 'asc' }],
        },
        planPrograms: {
          include: {
            program: {
              include: {
                academicYear: true,
                school: true,
              },
            },
          },
          orderBy: [
            { program: { type: 'asc' } },
            { createdAt: 'asc' },
          ],
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
      school: plan.school,
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
        position: pc.position,
        credits: pc.credits,
        createdAt: pc.createdAt,
        updatedAt: pc.updatedAt,
        course: pc.course,
        class: pc.class,
      })),
      programs: plan.planPrograms.map((pp) => ({
        id: pp.id,
        planId: pp.planId,
        programId: pp.programId,
        createdAt: pp.createdAt,
        updatedAt: pp.updatedAt,
        program: {
          id: pp.program.id,
          programId: pp.program.programId,
          name: pp.program.name,
          type: pp.program.type,
          totalCredits: pp.program.totalCredits,
          requirements: pp.program.requirements,
          academicYearId: pp.program.academicYearId,
          schoolId: pp.program.schoolId,
          academicYear: {
            id: pp.program.academicYear.id,
            year: pp.program.academicYear.year,
            start: pp.program.academicYear.start,
            end: pp.program.academicYear.end,
            isCurrent: pp.program.academicYear.isCurrent,
            createdAt: pp.program.academicYear.createdAt,
            updatedAt: pp.program.academicYear.updatedAt,
          },
          school: {
            id: pp.program.school.id,
            code: pp.program.school.code,
            name: pp.program.school.name,
            createdAt: pp.program.school.createdAt,
            updatedAt: pp.program.school.updatedAt,
          },
          createdAt: pp.program.createdAt,
          updatedAt: pp.program.updatedAt,
        },
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

    // Automatically add College Core for College of Arts and Sciences (schoolId = 2)
    if (schoolId === 2) {
      const collegeCore = await prisma.program.findFirst({
        where: {
          type: 'core',
          schoolId: 2,
          academicYearId,
        },
      });

      if (collegeCore) {
        await prisma.planProgram.create({
          data: {
            planId: plan.id,
            programId: collegeCore.id,
          },
        });
        logger.info(`Automatically added College Core (program ${collegeCore.id}) to plan ${plan.id}`);
      } else {
        logger.warn(`College Core program not found for academic year ${academicYearId}`);
      }
    }

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

    // Fetch original plan with planned courses and programs
    const originalPlan = await prisma.plan.findUnique({
      where: { id: Number(id) },
      include: {
        plannedCourses: true,
        planPrograms: true,
      },
    });

    if (!originalPlan) {
      throw new NotFoundError('Plan not found');
    }

    // Create duplicate plan with copied planned courses and programs
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
        planPrograms: {
          create: originalPlan.planPrograms.map((pp) => ({
            programId: pp.programId,
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
