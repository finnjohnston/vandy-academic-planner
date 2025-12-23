import { Request, Response, NextFunction } from 'express';
import { calculateProgramProgress } from '../services/progressCalculator.service.js';
import { aggregatePlanProgress } from '../services/planProgressAggregator.service.js';
import { NotFoundError } from '../types/error.types.js';
import { sendSuccess } from '../utils/response.utils.js';
import logger from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';
import { ProgramRequirements } from '../types/program.types.js';

/**
 * GET /api/plans/:planId/programs/:planProgramId/progress
 */
export async function getProgramProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, planProgramId } = req.params;
    logger.http(`GET /api/plans/${planId}/programs/${planProgramId}/progress`);

    // Verify planProgram exists and belongs to plan
    const planProgram = await prisma.planProgram.findUnique({
      where: { id: Number(planProgramId) },
    });

    if (!planProgram || planProgram.planId !== Number(planId)) {
      throw new NotFoundError('Program association not found');
    }

    const progress = await calculateProgramProgress(Number(planProgramId));
    sendSuccess(res, progress);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:planId/programs/:planProgramId/progress/sections/:sectionId
 */
export async function getSectionProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, planProgramId, sectionId } = req.params;
    logger.http(
      `GET /api/plans/${planId}/programs/${planProgramId}/progress/sections/${sectionId}`
    );

    // Verify planProgram exists and belongs to plan
    const planProgram = await prisma.planProgram.findUnique({
      where: { id: Number(planProgramId) },
    });

    if (!planProgram || planProgram.planId !== Number(planId)) {
      throw new NotFoundError('Program association not found');
    }

    // Get full program progress, then extract section
    const programProgress = await calculateProgramProgress(Number(planProgramId));
    const sectionProgress = programProgress.sectionProgress.find((s) => s.sectionId === sectionId);

    if (!sectionProgress) {
      throw new NotFoundError('Section not found');
    }

    sendSuccess(res, sectionProgress);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:planId/progress
 */
export async function getPlanProgressOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId } = req.params;
    logger.http(`GET /api/plans/${planId}/progress`);

    const overview = await aggregatePlanProgress(Number(planId));
    sendSuccess(res, overview);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/plans/:planId/programs/:planProgramId/progress/requirements
 */
export async function getProgramRequirementsProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { planId, planProgramId } = req.params;
    logger.http(
      `GET /api/plans/${planId}/programs/${planProgramId}/progress/requirements`
    );

    const planProgram = await prisma.planProgram.findUnique({
      where: { id: Number(planProgramId) },
      include: { program: true },
    });

    if (!planProgram || planProgram.planId !== Number(planId)) {
      throw new NotFoundError('Program association not found');
    }

    const programProgress = await calculateProgramProgress(Number(planProgramId));
    const requirements =
      planProgram.program.requirements as unknown as ProgramRequirements;

    const sectionProgressById = new Map(
      programProgress.sectionProgress.map((section) => [section.sectionId, section])
    );

    const enrichedSections = requirements.sections.map((section) => {
      const sectionProgress = sectionProgressById.get(section.id);
      const requirementProgressById = new Map(
        (sectionProgress?.requirementProgress ?? []).map((req) => [
          req.requirementId,
          req,
        ])
      );

      const enrichedRequirements = section.requirements.map((req) => {
        const requirementId = `${section.id}.${req.id}`;
        const progress = requirementProgressById.get(requirementId) ?? null;
        return {
          ...req,
          progress,
        };
      });

      return {
        ...section,
        requirements: enrichedRequirements,
        progress: sectionProgress
          ? {
              status: sectionProgress.status,
              creditsRequired: sectionProgress.creditsRequired,
              creditsFulfilled: sectionProgress.creditsFulfilled,
              percentage: sectionProgress.percentage,
              constraintValidation: sectionProgress.constraintValidation ?? null,
            }
          : null,
      };
    });

    sendSuccess(res, {
      planProgramId: planProgram.id,
      program: {
        id: planProgram.program.id,
        programId: planProgram.program.programId,
        name: planProgram.program.name,
        type: planProgram.program.type,
        totalCredits: planProgram.program.totalCredits,
      },
      requirements: {
        sections: enrichedSections,
        constraintsStructured: requirements.constraintsStructured ?? [],
      },
      progress: {
        status: programProgress.status,
        totalCreditsRequired: programProgress.totalCreditsRequired,
        totalCreditsFulfilled: programProgress.totalCreditsFulfilled,
        percentage: programProgress.percentage,
        lastUpdated: programProgress.lastUpdated,
        constraintValidation: programProgress.constraintValidation ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}
