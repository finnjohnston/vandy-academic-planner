import { prisma } from '../../config/prisma.js';
import { findMatchingRequirements } from './requirementMatcher.service.js';
import {
  buildDoubleCountMap,
  canDoubleCount,
  checkEnforcementConstraints,
} from './constraint.service.js';
import { ProgramRequirements } from '../types/program.types.js';
import { FulfillmentRecord } from '../types/constraint.types.js';
import logger from '../../utils/logger.js';

/**
 * Automatically assign all courses in a plan to requirements
 * Called when courses or programs are added/removed
 * Supports double counting and enforcement constraints
 *
 * KEY BEHAVIOR: Courses automatically count across ALL programs unless constrained.
 * Double count constraints only apply within a single program (one course counting
 * for multiple requirements in the same program).
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
  const planProgramIds = plan.planPrograms.map((pp) => pp.id);

  await prisma.requirementFulfillment.deleteMany({
    where: {
      planProgramId: { in: planProgramIds },
    },
  });

  logger.info(`Cleared existing fulfillments for plan ${planId}`);

  // STEP 3: Build double count maps and fulfillment tracking for each program
  const programData = plan.planPrograms.map((planProgram) => ({
    planProgram,
    programRequirements: planProgram.program.requirements as ProgramRequirements,
    doubleCountMap: buildDoubleCountMap(
      planProgram.program.requirements as ProgramRequirements
    ),
    allFulfillments: [] as FulfillmentRecord[],
  }));

  // STEP 4: Process each course across ALL programs
  for (const plannedCourse of plan.plannedCourses) {
    if (!plannedCourse.course) continue;

    const course = plannedCourse.course;
    logger.info(`Processing course ${course.courseId} across ${programData.length} programs`);

    // STEP 5: For each program, find matches and assign fulfillments
    for (const data of programData) {
      const { planProgram, programRequirements, doubleCountMap, allFulfillments } = data;

      // Find all requirements this course could fulfill in this program
      const matches = findMatchingRequirements(course, programRequirements);

      if (matches.length === 0) {
        logger.info(
          `No matches for ${course.courseId} in program ${planProgram.program.name}`
        );
        continue;
      }

      logger.info(
        `Found ${matches.length} potential matches for ${course.courseId} in program ${planProgram.program.name}`
      );

      // Track which requirements we've assigned this course to IN THIS PROGRAM
      const assignedRequirementIds: string[] = [];
      const deferredMatches: typeof matches = [];

      // STEP 6: Process matches in specificity order (within this program)
      for (const match of matches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;

        // Check if already assigned to this requirement
        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
        }

        // Check if already assigned to a different requirement IN THIS PROGRAM
        const alreadyAssignedInProgram = assignedRequirementIds.length > 0;

        // If already assigned within this program, check if double counting is allowed
        if (alreadyAssignedInProgram) {
          if (!canDoubleCount(course, fullRequirementId, doubleCountMap)) {
            logger.debug(
              `Skipping ${course.courseId} for ${fullRequirementId} in ${planProgram.program.name}: ` +
                `already assigned within program and double counting not allowed`
            );
            continue;
          }
        }

        // Find the requirement object
        const section = programRequirements.sections.find(
          (s) => s.id === match.sectionId
        );
        const requirement = section?.requirements.find(
          (r) => r.id === match.requirementId
        );

        if (!requirement) {
          logger.warn(
            `Requirement ${fullRequirementId} not found in program ${planProgram.program.name}`
          );
          continue;
        }

        // Check enforcement constraints
        const enforcementCheck = checkEnforcementConstraints(
          course,
          requirement,
          match.sectionId,
          allFulfillments,
          programRequirements
        );

        if (!enforcementCheck.allowed) {
          logger.debug(
            `Deferring ${course.courseId} for ${fullRequirementId} in ${planProgram.program.name}: ${enforcementCheck.reason}`
          );
          deferredMatches.push(match);
          continue;
        }

        // Create fulfillment
        await prisma.requirementFulfillment.create({
          data: {
            planProgramId: planProgram.id,
            requirementId: fullRequirementId,
            plannedCourseId: plannedCourse.id,
            creditsApplied: plannedCourse.credits,
          },
        });

        // Track this fulfillment
        assignedRequirementIds.push(fullRequirementId);
        allFulfillments.push({
          requirementId: fullRequirementId,
          sectionId: match.sectionId,
          course: {
            id: course.id,
            courseId: course.courseId,
            title: course.title,
            credits: plannedCourse.credits,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            attributes: course.attributes,
          },
          creditsApplied: plannedCourse.credits,
        });

        logger.info(
          `✓ Assigned ${course.courseId} to ${fullRequirementId} in program ${planProgram.program.name} ` +
            `(planProgramId: ${planProgram.id}, score: ${match.specificityScore})${alreadyAssignedInProgram ? ' [DOUBLE COUNT WITHIN PROGRAM]' : ''}`
        );
      }

      // STEP 7: Re-check deferred matches after other assignments (within this program)
      for (const match of deferredMatches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;

        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
        }

        const alreadyAssignedInProgram = assignedRequirementIds.length > 0;
        if (alreadyAssignedInProgram) {
          if (!canDoubleCount(course, fullRequirementId, doubleCountMap)) {
            continue;
          }
        }

        const section = programRequirements.sections.find(
          (s) => s.id === match.sectionId
        );
        const requirement = section?.requirements.find(
          (r) => r.id === match.requirementId
        );

        if (!requirement) {
          continue;
        }

        const enforcementCheck = checkEnforcementConstraints(
          course,
          requirement,
          match.sectionId,
          allFulfillments,
          programRequirements
        );

        if (!enforcementCheck.allowed) {
          continue;
        }

        await prisma.requirementFulfillment.create({
          data: {
            planProgramId: planProgram.id,
            requirementId: fullRequirementId,
            plannedCourseId: plannedCourse.id,
            creditsApplied: plannedCourse.credits,
          },
        });

        assignedRequirementIds.push(fullRequirementId);
        allFulfillments.push({
          requirementId: fullRequirementId,
          sectionId: match.sectionId,
          course: {
            id: course.id,
            courseId: course.courseId,
            title: course.title,
            credits: plannedCourse.credits,
            subjectCode: course.subjectCode,
            courseNumber: course.courseNumber,
            attributes: course.attributes,
          },
          creditsApplied: plannedCourse.credits,
        });

        logger.debug(
          `Assigned ${course.courseId} to ${fullRequirementId} in program ${planProgram.program.name} [DEFERRED]`
        );
      }
    }
  }

  logger.info(`Completed auto-assignment for plan ${planId}`);
}
