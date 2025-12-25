import { prisma } from '../../config/prisma.js';
import { NotFoundError } from '../types/error.types.js';
import {
  ProgramRequirements,
  Section,
  Requirement,
} from '../types/program.types.js';
import {
  ProgramProgress,
  SectionProgress,
  RequirementProgress,
  EnrichedFulfillment,
  ProgressStatus,
} from '../types/progress.types.js';
import { evaluateRuleProgress } from './ruleProgressEvaluator.service.js';
import { Course } from '@prisma/client';
import {
  validateRequirementConstraints,
  validateSectionConstraints,
  validateProgramConstraints,
} from './constraint.service.js';
import { getCoursesByFilter } from './courseFilter.service.js';
import {
  ConstraintValidationContext,
  FulfillmentRecord,
} from '../types/constraint.types.js';

const getTermLabel = (semesterNumber: number, academicYearStart: number): string => {
  const season = semesterNumber % 2 === 1 ? 'Fall' : 'Spring';
  const yearOffset = Math.floor(semesterNumber / 2);
  const year = academicYearStart + yearOffset;
  return `${season} ${year}`;
};

/**
 * Calculate complete progress for a program in a plan
 */
export async function calculateProgramProgress(
  planProgramId: number
): Promise<ProgramProgress> {
  // Fetch PlanProgram with all necessary data
  const planProgram = await prisma.planProgram.findUnique({
    where: { id: planProgramId },
    include: {
      program: true,
      plan: {
        include: {
          academicYear: true,
        },
      },
      fulfillments: {
        include: {
          plannedCourse: {
            include: { course: true },
          },
        },
      },
    },
  });

  if (!planProgram) {
    throw new NotFoundError('Program association not found');
  }

  // Parse program requirements
  const requirements = planProgram.program.requirements as unknown as ProgramRequirements;

  // Transform fulfillments into EnrichedFulfillment format
  const academicYearStart = planProgram.plan.academicYear.start;
  const academicYearId = planProgram.plan.academicYear.id;

  const enrichedFulfillments: EnrichedFulfillment[] = planProgram.fulfillments.map((f) => ({
    requirementId: f.requirementId,
    course: {
      id: f.plannedCourse.course.id,
      courseId: f.plannedCourse.course.courseId,
      title: f.plannedCourse.course.title,
      credits: f.plannedCourse.credits,
      subjectCode: f.plannedCourse.course.subjectCode,
      courseNumber: f.plannedCourse.course.courseNumber,
      attributes: f.plannedCourse.course.attributes,
    },
    creditsApplied: f.creditsApplied,
    semesterNumber: f.plannedCourse.semesterNumber,
  }));

  // Calculate progress for each section
  const sectionProgress = await Promise.all(
    requirements.sections.map((section) =>
      calculateSectionProgress(
        section,
        section.id,
        enrichedFulfillments,
        requirements,
        planProgramId,
        academicYearStart,
        academicYearId
      )
    )
  );

  // Aggregate to program level
  const totalCreditsFulfilled = sectionProgress.reduce(
    (sum, s) => sum + s.creditsFulfilled,
    0
  );
  const totalCreditsRequired = planProgram.program.totalCredits;
  const percentage =
    totalCreditsRequired === 0 ? 100 : (totalCreditsFulfilled / totalCreditsRequired) * 100;

  // Determine program status
  let status: ProgressStatus;
  if (totalCreditsFulfilled === 0) {
    status = 'not_started';
  } else if (totalCreditsFulfilled >= totalCreditsRequired) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  const programConstraintValidation =
    requirements.constraintsStructured && requirements.constraintsStructured.length > 0
      ? validateProgramConstraints(requirements, {
          requirementId: '',
          sectionId: '',
          planProgramId,
          programRequirements: requirements,
          allFulfillments: enrichedFulfillments.map((f) => ({
            requirementId: f.requirementId,
            sectionId: f.requirementId.split('.')[0],
            course: {
              id: f.course.id,
              courseId: f.course.courseId,
              title: f.course.title,
              credits: f.course.credits,
              subjectCode: f.course.subjectCode,
              courseNumber: f.course.courseNumber,
              attributes: f.course.attributes,
            },
            creditsApplied: f.creditsApplied,
          })),
        })
      : undefined;

  return {
    planProgramId: planProgram.id,
    programId: planProgram.program.id,
    programName: planProgram.program.name,
    programType: planProgram.program.type,
    status,
    totalCreditsRequired,
    totalCreditsFulfilled,
    percentage,
    sectionProgress,
    lastUpdated: new Date(),
    constraintValidation: programConstraintValidation
      ? {
          results: programConstraintValidation.results,
          allSatisfied: programConstraintValidation.allSatisfied,
        }
      : undefined,
  };
}

/**
 * Calculate progress for a section within a program
 */
async function calculateSectionProgress(
  section: Section,
  sectionId: string,
  fulfillments: EnrichedFulfillment[],
  programRequirements: ProgramRequirements,
  planProgramId: number,
  academicYearStart: number,
  academicYearId: number
): Promise<SectionProgress> {
  // Calculate progress for each requirement in the section
  const requirementProgress = await Promise.all(
    section.requirements.map((req) =>
      calculateRequirementProgress(
        req,
        sectionId,
        fulfillments,
        programRequirements,
        planProgramId,
        academicYearStart,
        academicYearId
      )
    )
  );

  // Aggregate credits
  const creditsFulfilled = requirementProgress.reduce(
    (sum, r) => sum + r.creditsFulfilled,
    0
  );
  const creditsRequired = section.creditsRequired;
  const percentage = creditsRequired === 0 ? 100 : (creditsFulfilled / creditsRequired) * 100;

  // Determine section status
  let status: ProgressStatus;
  if (creditsFulfilled === 0) {
    status = 'not_started';
  } else if (creditsFulfilled >= creditsRequired) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  const sectionConstraintValidation =
    section.constraintsStructured && section.constraintsStructured.length > 0
      ? validateSectionConstraints(section, {
          requirementId: '',
          sectionId,
          planProgramId,
          programRequirements,
          allFulfillments: fulfillments.map((f) => ({
            requirementId: f.requirementId,
            sectionId: f.requirementId.split('.')[0],
            course: {
              id: f.course.id,
              courseId: f.course.courseId,
              title: f.course.title,
              credits: f.course.credits,
              subjectCode: f.course.subjectCode,
              courseNumber: f.course.courseNumber,
              attributes: f.course.attributes,
            },
            creditsApplied: f.creditsApplied,
          })),
        })
      : undefined;

  return {
    sectionId,
    title: section.title,
    status,
    creditsRequired,
    creditsFulfilled,
    percentage,
    requirementProgress,
    constraintValidation: sectionConstraintValidation
      ? {
          results: sectionConstraintValidation.results,
          allSatisfied: sectionConstraintValidation.allSatisfied,
        }
      : undefined,
  };
}

/**
 * Calculate progress for a single requirement
 */
async function calculateRequirementProgress(
  requirement: Requirement,
  sectionId: string,
  fulfillments: EnrichedFulfillment[],
  programRequirements: ProgramRequirements,
  planProgramId: number,
  academicYearStart: number,
  academicYearId: number
): Promise<RequirementProgress> {
  const fullRequirementId = `${sectionId}.${requirement.id}`;

  // Filter fulfillments for this requirement
  const reqFulfillments = fulfillments.filter(
    (f) => f.requirementId === fullRequirementId
  );

  // For take_any_courses rules, fetch ALL catalog courses matching the filter
  // For other rule types, just use the planned courses
  let coursesForEvaluation: Course[];
  if (requirement.rule.type === 'take_any_courses') {
    // Fetch all courses matching the filter from the catalog
    coursesForEvaluation = await getCoursesByFilter(
      requirement.rule.filter,
      academicYearId
    );
  } else {
    // Extract courses from fulfillments for other rule types
    coursesForEvaluation = reqFulfillments.map((f) => ({
      id: f.course.id,
      courseId: f.course.courseId,
      academicYearId: 0, // Not needed for progress calculation
      subjectCode: f.course.subjectCode,
      courseNumber: f.course.courseNumber,
      title: f.course.title,
      school: '',
      creditsMin: f.course.credits,
      creditsMax: f.course.credits,
      typicallyOffered: null,
      description: null,
      attributes: f.course.attributes,
      requirements: null,
      isCatalogCourse: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  // Evaluate rule progress
  const ruleProgress = evaluateRuleProgress(requirement.rule, coursesForEvaluation);

  // Sum credits from fulfillments
  const creditsFulfilled = reqFulfillments.reduce((sum, f) => sum + f.creditsApplied, 0);
  const creditsRequired = requirement.creditsRequired;
  const percentage = creditsRequired === 0 ? 100 : (creditsFulfilled / creditsRequired) * 100;

  // Determine requirement status
  let status: ProgressStatus;
  if (creditsFulfilled === 0) {
    status = 'not_started';
  } else if (creditsFulfilled >= creditsRequired) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  // Validate constraints if they exist
  let constraintValidation;
  if (requirement.constraintsStructured && requirement.constraintsStructured.length > 0) {
    // Convert all fulfillments to FulfillmentRecord format for constraint validation
    const allFulfillmentRecords: FulfillmentRecord[] = fulfillments.map((f) => {
      const courseId = f.course.courseId;
      const parts = f.requirementId.split('.');
      return {
        requirementId: f.requirementId,
        sectionId: parts[0],
        course: {
          id: f.course.id,
          courseId: courseId,
          title: f.course.title,
          credits: f.course.credits,
          subjectCode: f.course.subjectCode,
          courseNumber: f.course.courseNumber,
          attributes: f.course.attributes,
        },
        creditsApplied: f.creditsApplied,
      };
    });

    // Build validation context
    const context: ConstraintValidationContext = {
      requirementId: fullRequirementId,
      sectionId,
      planProgramId,
      programRequirements,
      allFulfillments: allFulfillmentRecords,
    };

    // Validate constraints
    const validation = validateRequirementConstraints(requirement, context);
    constraintValidation = {
      results: validation.results,
      allSatisfied: validation.allSatisfied,
    };
  }

  return {
    requirementId: fullRequirementId,
    sectionId,
    title: requirement.title,
    description: requirement.description,
    status,
    creditsRequired,
    creditsFulfilled,
    percentage,
    ruleProgress,
    fulfillingCourses: reqFulfillments.map((f) => ({
      courseId: f.course.courseId,
      title: f.course.title,
      credits: f.course.credits,
      creditsApplied: f.creditsApplied,
      semesterNumber: f.semesterNumber,
      termLabel: getTermLabel(f.semesterNumber, academicYearStart),
    })),
    constraintValidation,
  };
}
