import { prisma } from '../../config/prisma.js';
import { findMatchingRequirements } from './requirementMatcher.service.js';
import logger from '../../utils/logger.js';

/**
 * Automatically assign all courses in a plan to requirements
 * Called when courses or programs are added/removed
 */
export async function autoAssignFulfillments(planId: number): Promise<void> {
  logger.info(`Auto-assigning fulfillments for plan ${planId}`);

  // STEP 1: Fetch plan with all courses and programs
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      plannedCourses: {
        include: { course: true },
        orderBy: [{ semesterNumber: 'asc' }, { position: 'asc' }],
      },
      planPrograms: {
        include: {
          program: true,
        },
      },
    },
  });

  if (!plan) {
    logger.warn(`Plan ${planId} not found for auto-assignment`);
    return;
  }

  // STEP 2: Clear all existing fulfillments for this plan
  // Delete via planProgram relation to ensure we only delete this plan's fulfillments
  const planProgramIds = plan.planPrograms.map((pp) => pp.id);

  await prisma.requirementFulfillment.deleteMany({
    where: {
      planProgramId: { in: planProgramIds },
    },
  });

  logger.info(`Cleared existing fulfillments for plan ${planId}`);

  // STEP 3: For each course, find best match in each program
  for (const plannedCourse of plan.plannedCourses) {
    if (plannedCourse.course) {
      for (const planProgram of plan.planPrograms) {
        // Find all requirements this course could fulfill
        const matches = findMatchingRequirements(
          plannedCourse.course,
          planProgram.program.requirements as any
        );

        // Assign to the most specific match (already sorted by specificity)
        if (matches.length > 0) {
          const bestMatch = matches[0];

          await prisma.requirementFulfillment.create({
            data: {
              planProgramId: planProgram.id,
              requirementId: `${bestMatch.sectionId}.${bestMatch.requirementId}`,
              plannedCourseId: plannedCourse.id,
              creditsApplied: plannedCourse.credits,
            },
          });

          logger.debug(
            `Assigned ${plannedCourse.course.courseId} to ${bestMatch.sectionId}.${bestMatch.requirementId} ` +
              `in program ${planProgram.program.name} (score: ${bestMatch.specificityScore})`
          );
        }
      }
    }
  }

  logger.info(`Completed auto-assignment for plan ${planId}`);
}
