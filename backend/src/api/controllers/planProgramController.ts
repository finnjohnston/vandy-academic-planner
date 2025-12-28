import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';
import { autoAssignFulfillments } from '../services/fulfillmentAssigner.service.js';

/**
 * GET /api/plans/:planId/programs
 * List all programs associated with a plan
 */
export async function getPlanPrograms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    logger.http(`GET /api/plans/${planId}/programs`);

    // Query PlanProgram with nested program data
    const planPrograms = await prisma.planProgram.findMany({
      where: { planId: Number(planId) },
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
    });

    // Transform to return program details with association metadata
    const transformedPrograms = planPrograms.map((pp) => ({
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
    }));

    sendSuccess(res, transformedPrograms);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/plans/:planId/programs
 * Add a program to a plan
 */
export async function addPlanProgram(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    const { programId } = req.body;

    logger.http(`POST /api/plans/${planId}/programs (programId: ${programId})`);

    // STEP 1: Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // STEP 2: Verify program exists
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        academicYear: true,
        school: true,
      },
    });

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    // STEP 3: Create association
    // Note: Unique constraint on [planId, programId] prevents duplicates
    const planProgram = await prisma.planProgram.create({
      data: {
        planId: Number(planId),
        programId: programId,
      },
    });

    // PHASE 4: Auto-assign fulfillments for new program
    await autoAssignFulfillments(Number(planId));

    // STEP 4: Transform and return with 201 Created
    const transformedPlanProgram = {
      id: planProgram.id,
      planId: planProgram.planId,
      programId: planProgram.programId,
      createdAt: planProgram.createdAt,
      updatedAt: planProgram.updatedAt,
      program: {
        id: program.id,
        programId: program.programId,
        name: program.name,
        type: program.type,
        totalCredits: program.totalCredits,
        requirements: program.requirements,
        academicYearId: program.academicYearId,
        schoolId: program.schoolId,
        academicYear: {
          id: program.academicYear.id,
          year: program.academicYear.year,
          start: program.academicYear.start,
          end: program.academicYear.end,
          isCurrent: program.academicYear.isCurrent,
          createdAt: program.academicYear.createdAt,
          updatedAt: program.academicYear.updatedAt,
        },
        school: {
          id: program.school.id,
          code: program.school.code,
          name: program.school.name,
          createdAt: program.school.createdAt,
          updatedAt: program.school.updatedAt,
        },
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      },
    };

    res.status(201).json({ data: transformedPlanProgram });
  } catch (err) {
    // Prisma will throw P2002 error if duplicate (unique constraint violation)
    // Error middleware will convert to 409 DUPLICATE_ERROR
    next(err);
  }
}

/**
 * DELETE /api/plans/:planId/programs/:id
 * Remove a program from a plan
 */
export async function deletePlanProgram(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, id } = req.params;
    logger.http(`DELETE /api/plans/${planId}/programs/${id}`);

    // STEP 1: Fetch existing PlanProgram
    const existingPlanProgram = await prisma.planProgram.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPlanProgram) {
      throw new NotFoundError('Program association not found');
    }

    // STEP 2: SECURITY - Verify belongs to plan
    if (existingPlanProgram.planId !== Number(planId)) {
      throw new NotFoundError('Program association not found');
    }

    // STEP 3: Delete association
    await prisma.planProgram.delete({
      where: { id: Number(id) },
    });

    // STEP 4: Return 204 No Content
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/plans/:planId/programs
 * Bulk update programs for a plan (replaces all existing programs)
 */
export async function updatePlanPrograms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    const { programIds } = req.body;

    logger.http(`PUT /api/plans/${planId}/programs (programIds: ${programIds.join(', ')})`);

    // STEP 1: Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // STEP 2: Get current programs
    const currentPlanPrograms = await prisma.planProgram.findMany({
      where: { planId: Number(planId) },
    });

    const currentProgramIds = currentPlanPrograms.map(pp => pp.programId);

    // STEP 3: Determine what to add and what to delete
    const toAdd = programIds.filter((id: number) => !currentProgramIds.includes(id));
    const toDelete = currentPlanPrograms.filter(pp => !programIds.includes(pp.programId));

    // STEP 4: Execute deletions
    if (toDelete.length > 0) {
      await prisma.planProgram.deleteMany({
        where: {
          id: { in: toDelete.map(pp => pp.id) },
        },
      });
    }

    // STEP 5: Execute additions
    if (toAdd.length > 0) {
      await prisma.planProgram.createMany({
        data: toAdd.map((programId: number) => ({
          planId: Number(planId),
          programId,
        })),
      });
    }

    // STEP 6: Auto-assign fulfillments if programs were added
    if (toAdd.length > 0) {
      await autoAssignFulfillments(Number(planId));
    }

    // STEP 7: Update plan's updatedAt timestamp if there were changes
    if (toAdd.length > 0 || toDelete.length > 0) {
      await prisma.plan.update({
        where: { id: Number(planId) },
        data: { updatedAt: new Date() },
      });
    }

    // STEP 8: Return success
    sendSuccess(res, { updated: true });
  } catch (err) {
    next(err);
  }
}
