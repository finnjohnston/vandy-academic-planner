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

  // STEP 3: For each program, build double count map and process courses
  for (const planProgram of plan.planPrograms) {
    const programRequirements =
      planProgram.program.requirements as ProgramRequirements;
    const doubleCountMap = buildDoubleCountMap(programRequirements);

    logger.debug(
      `Built double count map for ${planProgram.program.name}: ${doubleCountMap.size} courses`
    );

    // Track all fulfillments created for this program (for enforcement constraint checking)
    const allFulfillments: FulfillmentRecord[] = [];

    // STEP 4: For each course, find all valid matches
    for (const plannedCourse of plan.plannedCourses) {
      if (!plannedCourse.course) continue;

      const course = plannedCourse.course;

      // Find all requirements this course could fulfill
      const matches = findMatchingRequirements(course, programRequirements);

      // Track which requirements we've assigned this course to
      const assignedRequirementIds: string[] = [];
      const deferredMatches: typeof matches = [];

      // STEP 5: Process matches in specificity order
      for (const match of matches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;

        // Check if already assigned to this requirement
        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
        }

        // Check if already assigned to a different requirement
        const alreadyAssigned = assignedRequirementIds.length > 0;

        // If already assigned, check if double counting is allowed
        if (alreadyAssigned) {
          if (!canDoubleCount(course.courseId, fullRequirementId, doubleCountMap)) {
            logger.debug(
              `Skipping ${course.courseId} for ${fullRequirementId}: already assigned and double counting not allowed`
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
            `Deferring ${course.courseId} for ${fullRequirementId}: ${enforcementCheck.reason}`
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

        logger.debug(
          `Assigned ${course.courseId} to ${fullRequirementId} in program ${planProgram.program.name} ` +
            `(score: ${match.specificityScore})${alreadyAssigned ? ' [DOUBLE COUNT]' : ''}`
        );

        // If not double counting and we've made one assignment, stop
        if (!alreadyAssigned) {
          // Don't break - continue to check for double count possibilities
        }
      }

      // STEP 6: Re-check deferred matches after other assignments
      for (const match of deferredMatches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;

        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
        }

        const alreadyAssigned = assignedRequirementIds.length > 0;
        if (alreadyAssigned) {
          if (!canDoubleCount(course.courseId, fullRequirementId, doubleCountMap)) {
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
      }
    }
  }

  logger.info(`Completed auto-assignment for plan ${planId}`);
}
