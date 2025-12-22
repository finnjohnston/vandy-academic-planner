import { Request, Response, NextFunction } from 'express';
import { calculateProgramProgress } from '../services/progressCalculator.service.js';
import { aggregatePlanProgress } from '../services/planProgressAggregator.service.js';
import { NotFoundError } from '../types/error.types.js';
import { sendSuccess } from '../utils/response.utils.js';
import logger from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

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
