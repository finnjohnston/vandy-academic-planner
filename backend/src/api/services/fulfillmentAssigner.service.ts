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
        include: {
          course: true,
          class: true  // Include semester-specific class offerings
        },
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

  // Track running totals of credits assigned to each requirement
  // Key format: "planProgramId.sectionId.requirementId"
  const requirementCreditsMap = new Map<string, number>();

  // Helper function to get current assigned credits for a requirement
  const getAssignedCredits = (
    planProgramId: number,
    sectionId: string,
    requirementId: string
  ): number => {
    const key = `${planProgramId}.${sectionId}.${requirementId}`;
    return requirementCreditsMap.get(key) || 0;
  };

  // Helper function to add credits to requirement total
  const addCreditsToRequirement = (
    planProgramId: number,
    sectionId: string,
    requirementId: string,
    credits: number
  ) => {
    const key = `${planProgramId}.${sectionId}.${requirementId}`;
    const current = requirementCreditsMap.get(key) || 0;
    requirementCreditsMap.set(key, current + credits);
  };

  // STEP 4: Process each course across ALL programs
  for (const plannedCourse of plan.plannedCourses) {
    // Use class if available (semester-specific offering), otherwise use course (catalog)
    const courseOrClass = plannedCourse.class || plannedCourse.course;
    if (!courseOrClass) continue;

    const identifier = 'courseId' in courseOrClass && courseOrClass.courseId
      ? courseOrClass.courseId
      : 'classId' in courseOrClass
        ? courseOrClass.classId
        : 'unknown';
    logger.info(`Processing ${identifier} across ${programData.length} programs`);

    // STEP 5: For each program, find matches and assign fulfillments
    for (const data of programData) {
      const { planProgram, programRequirements, doubleCountMap, allFulfillments } = data;

      // Build a lookup map for requirement credit limits: "sectionId.requirementId" -> creditsRequired
      const requirementLimitsMap = new Map<string, number>();
      for (const section of programRequirements.sections) {
        for (const req of section.requirements) {
          const key = `${section.id}.${req.id}`;
          requirementLimitsMap.set(key, req.creditsRequired);
        }
      }

      // Find all requirements this course could fulfill in this program
      const matches = findMatchingRequirements(courseOrClass, programRequirements);

      if (matches.length === 0) {
        logger.info(
          `No matches for ${identifier} in program ${planProgram.program.name}`
        );
        continue;
      }

      logger.info(
        `Found ${matches.length} potential matches for ${identifier} in program ${planProgram.program.name}`
      );

      // Track which requirements we've assigned this course to IN THIS PROGRAM
      const assignedRequirementIds: string[] = [];
      const deferredMatches: typeof matches = [];

      // STEP 6: Process matches in fulfillment status + specificity order (within this program)
      // Sort matches: unfilled requirements first, then by specificity
      const sortedMatches = [...matches].sort((a, b) => {
        const aKey = `${a.sectionId}.${a.requirementId}`;
        const bKey = `${b.sectionId}.${b.requirementId}`;

        const aLimit = requirementLimitsMap.get(aKey) || 0;
        const bLimit = requirementLimitsMap.get(bKey) || 0;

        const aAssigned = getAssignedCredits(planProgram.id, a.sectionId, a.requirementId);
        const bAssigned = getAssignedCredits(planProgram.id, b.sectionId, b.requirementId);

        const aIsFull = aAssigned >= aLimit;
        const bIsFull = bAssigned >= bLimit;

        // Prioritize unfilled requirements
        if (!aIsFull && bIsFull) return -1;
        if (aIsFull && !bIsFull) return 1;

        // If both full or both unfilled, use specificity
        return b.specificityScore - a.specificityScore;
      });

      for (const match of sortedMatches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;
        const requirementKey = `${match.sectionId}.${match.requirementId}`;

        // Check if already assigned to this requirement
        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
        }

        // Check if this requirement is already fully satisfied
        const creditsRequired = requirementLimitsMap.get(requirementKey) || 0;
        const creditsAssigned = getAssignedCredits(planProgram.id, match.sectionId, match.requirementId);
        const isFull = creditsAssigned >= creditsRequired;

        // If requirement is full, only assign if ALL matches are full
        if (isFull) {
          // Check if ANY other match is unfilled
          const hasUnfilledMatch = sortedMatches.some((m) => {
            const key = `${m.sectionId}.${m.requirementId}`;
            const limit = requirementLimitsMap.get(key) || 0;
            const assigned = getAssignedCredits(planProgram.id, m.sectionId, m.requirementId);
            return assigned < limit && key !== requirementKey;
          });

          if (hasUnfilledMatch) {
            logger.debug(
              `Skipping ${identifier} for ${fullRequirementId} in ${planProgram.program.name}: ` +
                `requirement is full (${creditsAssigned}/${creditsRequired}) and unfilled matches exist`
            );
            continue; // Skip this full requirement, try next match
          }
          // If NO unfilled matches exist, allow assignment to this full requirement (overflow)
          logger.debug(
            `Allowing overflow: ${identifier} to ${fullRequirementId} in ${planProgram.program.name} ` +
              `(${creditsAssigned}/${creditsRequired}) - all matches are full`
          );
        }

        // Check if already assigned to a different requirement IN THIS PROGRAM
        const alreadyAssignedInProgram = assignedRequirementIds.length > 0;

        // If already assigned within this program, check if double counting is allowed
        if (alreadyAssignedInProgram) {
          if (!canDoubleCount(courseOrClass, fullRequirementId, doubleCountMap)) {
            logger.debug(
              `Skipping ${identifier} for ${fullRequirementId} in ${planProgram.program.name}: ` +
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
          courseOrClass,
          requirement,
          match.sectionId,
          allFulfillments,
          programRequirements
        );

        if (!enforcementCheck.allowed) {
          logger.debug(
            `Deferring ${identifier} for ${fullRequirementId} in ${planProgram.program.name}: ${enforcementCheck.reason}`
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

        // Track credits assigned to this requirement
        addCreditsToRequirement(
          planProgram.id,
          match.sectionId,
          match.requirementId,
          plannedCourse.credits
        );

        // Track this fulfillment
        assignedRequirementIds.push(fullRequirementId);
        allFulfillments.push({
          requirementId: fullRequirementId,
          sectionId: match.sectionId,
          course: {
            id: courseOrClass.id,
            courseId: 'courseId' in courseOrClass ? courseOrClass.courseId : null,
            title: 'title' in courseOrClass ? courseOrClass.title : undefined,
            credits: plannedCourse.credits,
            subjectCode: courseOrClass.subjectCode,
            courseNumber: courseOrClass.courseNumber,
            attributes: courseOrClass.attributes,
          },
          creditsApplied: plannedCourse.credits,
        });

        logger.info(
          `✓ Assigned ${identifier} to ${fullRequirementId} in program ${planProgram.program.name} ` +
            `(planProgramId: ${planProgram.id}, score: ${match.specificityScore})${alreadyAssignedInProgram ? ' [DOUBLE COUNT WITHIN PROGRAM]' : ''}`
        );
      }

      // STEP 7: Re-check deferred matches after other assignments (within this program)
      for (const match of deferredMatches) {
        const fullRequirementId = `${match.sectionId}.${match.requirementId}`;

        if (assignedRequirementIds.includes(fullRequirementId)) {
          continue;
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

        // Re-check enforcement constraints first (they may pass now after other assignments)
        const enforcementCheck = checkEnforcementConstraints(
          courseOrClass,
          requirement,
          match.sectionId,
          allFulfillments,
          programRequirements
        );

        if (!enforcementCheck.allowed) {
          continue;
        }

        // Check if double counting is allowed
        const alreadyAssignedInProgram = assignedRequirementIds.length > 0;
        if (alreadyAssignedInProgram && !canDoubleCount(courseOrClass, fullRequirementId, doubleCountMap)) {
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

        // Track credits assigned to this requirement
        addCreditsToRequirement(
          planProgram.id,
          match.sectionId,
          match.requirementId,
          plannedCourse.credits
        );

        assignedRequirementIds.push(fullRequirementId);
        allFulfillments.push({
          requirementId: fullRequirementId,
          sectionId: match.sectionId,
          course: {
            id: courseOrClass.id,
            courseId: 'courseId' in courseOrClass ? courseOrClass.courseId : null,
            title: 'title' in courseOrClass ? courseOrClass.title : undefined,
            credits: plannedCourse.credits,
            subjectCode: courseOrClass.subjectCode,
            courseNumber: courseOrClass.courseNumber,
            attributes: courseOrClass.attributes,
          },
          creditsApplied: plannedCourse.credits,
        });

        logger.debug(
          `Assigned ${identifier} to ${fullRequirementId} in program ${planProgram.program.name} [DEFERRED]`
        );
      }
    }
  }

  logger.info(`Completed auto-assignment for plan ${planId}`);
}
