import { prisma } from '../../config/prisma.js';
import { PlanProgressOverview, ProgressStatus } from '../types/progress.types.js';
import { calculateProgramProgress } from './progressCalculator.service.js';

/**
 * Get progress overview for all programs in a plan
 */
export async function aggregatePlanProgress(planId: number): Promise<PlanProgressOverview> {
  // Fetch all plan programs
  const planPrograms = await prisma.planProgram.findMany({
    where: { planId },
    include: { program: true },
  });

  // Calculate progress for each program
  const programProgress = await Promise.all(
    planPrograms.map((pp) => calculateProgramProgress(pp.id))
  );

  // Aggregate to plan level
  const completedPrograms = programProgress.filter((p) => p.status === 'completed').length;
  const overallStatus: ProgressStatus =
    completedPrograms === planPrograms.length && planPrograms.length > 0
      ? 'completed'
      : programProgress.some((p) => p.status !== 'not_started')
        ? 'in_progress'
        : 'not_started';

  return {
    planId,
    programs: programProgress.map((p) => ({
      planProgramId: p.planProgramId,
      programId: p.programId,
      programName: p.programName,
      programType: p.programType,
      status: p.status,
      percentage: p.percentage,
      creditsFulfilled: p.totalCreditsFulfilled,
      creditsRequired: p.totalCreditsRequired,
    })),
    overallStatus,
    totalPrograms: planPrograms.length,
    completedPrograms,
    lastUpdated: new Date(),
  };
}
