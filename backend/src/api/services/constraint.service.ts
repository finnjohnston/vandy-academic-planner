import { Course, Class } from '@prisma/client';
import {
  Constraint,
  ConstraintValidationContext,
  ConstraintValidationResult,
  RequirementConstraintValidation,
  AllowDoubleCountConstraint,
  RequireCourseFromSectionsConstraint,
  MinCourseCountConstraint,
  MaxCourseCountConstraint,
  MaxCreditsFromCoursesConstraint,
  MinCreditsFromCoursesConstraint,
  CourseNumberRangeConstraint,
  DoubleCountMap,
  DoubleCountInfo,
  FulfillmentRecord,
} from '../types/constraint.types.js';
import { ProgramRequirements, Requirement, Section } from '../types/program.types.js';
import { evaluateCourseFilter } from './courseFilter.service.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Double Count Map Building
// ============================================================================

/**
 * Build a map of all double-counting rules for a program
 * Called once during fulfillment assignment to enable efficient lookup
 */
export function buildDoubleCountMap(
  programRequirements: ProgramRequirements
): DoubleCountMap {
  const map: DoubleCountMap = new Map();

  // Process program-level constraints
  if (programRequirements.constraintsStructured) {
    processConstraintsForDoubleCount(
      programRequirements.constraintsStructured,
      map
    );
  }

  // Process section and requirement-level constraints
  for (const section of programRequirements.sections) {
    if (section.constraintsStructured) {
      processConstraintsForDoubleCount(section.constraintsStructured, map);
    }

    for (const requirement of section.requirements) {
      if (requirement.constraintsStructured) {
        processConstraintsForDoubleCount(
          requirement.constraintsStructured,
          map
        );
      }
    }
  }

  return map;
}

function processConstraintsForDoubleCount(
  constraints: Constraint[],
  map: DoubleCountMap
): void {
  for (const constraint of constraints) {
    if (constraint.type === 'allow_double_count') {
      const existing = map.get(constraint.courseId);
      if (existing) {
        // Merge requirement IDs
        existing.allowedRequirementIds = [
          ...new Set([
            ...existing.allowedRequirementIds,
            ...constraint.requirementIds,
          ]),
        ];
      } else {
        map.set(constraint.courseId, {
          courseId: constraint.courseId,
          allowedRequirementIds: [...constraint.requirementIds],
        });
      }
    }
  }
}

/**
 * Check if a course can double count for a specific requirement
 * Checks both direct courseId match and subjectCode + courseNumber format
 */
export function canDoubleCount(
  courseIdOrCourse: string | Course | Class,
  targetRequirementId: string,
  doubleCountMap: DoubleCountMap
): boolean {
  // If a Course or Class object is passed, try both courseId and subjectCode + courseNumber
  if (typeof courseIdOrCourse === 'object') {
    const course = courseIdOrCourse;

    // Try direct courseId match (if it exists - Class has optional courseId)
    if ('courseId' in course && course.courseId) {
      let info = doubleCountMap.get(course.courseId);
      if (info && info.allowedRequirementIds.includes(targetRequirementId)) {
        return true;
      }
    }

    // For Class objects, also try classId
    if ('classId' in course && course.classId) {
      let info = doubleCountMap.get(course.classId);
      if (info && info.allowedRequirementIds.includes(targetRequirementId)) {
        return true;
      }
    }

    // Try subjectCode + courseNumber format (e.g., "MATH 1300")
    const courseCode = `${course.subjectCode} ${course.courseNumber}`;
    let info = doubleCountMap.get(courseCode);
    if (info && info.allowedRequirementIds.includes(targetRequirementId)) {
      return true;
    }

    return false;
  }

  // String courseId passed (legacy support)
  const info = doubleCountMap.get(courseIdOrCourse);
  if (!info) return false;
  return info.allowedRequirementIds.includes(targetRequirementId);
}

// ============================================================================
// Enforcement Constraint Checking
// ============================================================================

/**
 * Check if a course can be assigned to a requirement based on enforcement constraints
 * Returns { allowed: boolean, reason?: string }
 */
export function checkEnforcementConstraints(
  course: Course | Class,
  requirement: Requirement,
  sectionId: string,
  allFulfillments: FulfillmentRecord[],
  programRequirements: ProgramRequirements
): { allowed: boolean; reason?: string } {
  const requirementId = `${sectionId}.${requirement.id}`;

  // Check requirement-level enforcement constraints
  if (requirement.constraintsStructured) {
    for (const constraint of requirement.constraintsStructured) {
      if (constraint.type === 'require_course_from_sections') {
        const result = checkRequireCourseFromSections(
          course,
          constraint,
          allFulfillments
        );
        if (!result.allowed) {
          return result;
        }
      }
    }
  }

  // Check section-level enforcement constraints
  const section = programRequirements.sections.find((s) => s.id === sectionId);
  if (section?.constraintsStructured) {
    for (const constraint of section.constraintsStructured) {
      if (constraint.type === 'require_course_from_sections') {
        const result = checkRequireCourseFromSections(
          course,
          constraint,
          allFulfillments
        );
        if (!result.allowed) {
          return result;
        }
      }
    }
  }

  return { allowed: true };
}

function checkRequireCourseFromSections(
  course: Course | Class,
  constraint: RequireCourseFromSectionsConstraint,
  allFulfillments: FulfillmentRecord[]
): { allowed: boolean; reason?: string } {
  // Check if this course is assigned to any of the allowed sections
  // Match by courseId (if both exist), classId (for Class objects), or subjectCode+courseNumber
  const courseFulfillments = allFulfillments.filter((f) => {
    // Try courseId match (if both have courseId and they're not null)
    if ('courseId' in course && course.courseId && f.course.courseId && f.course.courseId === course.courseId) {
      return true;
    }
    // Try classId match (for Class objects)
    if ('classId' in course && course.classId && f.course.courseId === course.classId) {
      return true;
    }
    // Fallback to subjectCode + courseNumber match
    const courseCode = `${course.subjectCode} ${course.courseNumber}`;
    const fulfillmentCode = `${f.course.subjectCode} ${f.course.courseNumber}`;
    return courseCode === fulfillmentCode;
  });

  const fulfilledSections = new Set(
    courseFulfillments.map((f) => f.sectionId)
  );

  if (constraint.operator === 'OR') {
    // Course must be in at least one allowed section
    const hasAnyAllowed = constraint.allowedSectionIds.some((sectionId) =>
      fulfilledSections.has(sectionId)
    );
    if (!hasAnyAllowed) {
      return {
        allowed: false,
        reason: `Course must also fulfill at least one of: ${constraint.allowedSectionIds.join(', ')}`,
      };
    }
  } else {
    // AND: Course must be in all allowed sections
    const hasAllRequired = constraint.allowedSectionIds.every((sectionId) =>
      fulfilledSections.has(sectionId)
    );
    if (!hasAllRequired) {
      return {
        allowed: false,
        reason: `Course must also fulfill all of: ${constraint.allowedSectionIds.join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

// ============================================================================
// Validation Constraint Checking
// ============================================================================

/**
 * Validate all constraints for a requirement
 */
export function validateRequirementConstraints(
  requirement: Requirement,
  context: ConstraintValidationContext
): RequirementConstraintValidation {
  const results: ConstraintValidationResult[] = [];

  // Get fulfillments for this requirement
  const requirementFulfillments = context.allFulfillments.filter(
    (f) => f.requirementId === context.requirementId
  );

  // Validate requirement-level constraints
  if (requirement.constraintsStructured) {
    for (const constraint of requirement.constraintsStructured) {
      const result = validateConstraint(
        constraint,
        requirementFulfillments,
        context
      );
      if (result !== null) {
        results.push(result);
      }
    }
  }

  const allSatisfied = results.every((r) => r.satisfied);

  return {
    results,
    allSatisfied,
  };
}

/**
 * Validate all constraints for a section
 */
export function validateSectionConstraints(
  section: Section,
  context: ConstraintValidationContext
): RequirementConstraintValidation {
  if (!section.constraintsStructured || section.constraintsStructured.length === 0) {
    return { results: [], allSatisfied: true };
  }

  const sectionFulfillments = context.allFulfillments.filter(
    (f) => f.sectionId === context.sectionId
  );

  const results: ConstraintValidationResult[] = [];
  for (const constraint of section.constraintsStructured) {
    const result = validateConstraint(constraint, sectionFulfillments, context);
    if (result !== null) {
      results.push(result);
    }
  }

  const allSatisfied = results.every((r) => r.satisfied);
  return { results, allSatisfied };
}

/**
 * Validate all constraints for a program
 */
export function validateProgramConstraints(
  programRequirements: ProgramRequirements,
  context: ConstraintValidationContext
): RequirementConstraintValidation {
  if (!programRequirements.constraintsStructured || programRequirements.constraintsStructured.length === 0) {
    return { results: [], allSatisfied: true };
  }

  const results: ConstraintValidationResult[] = [];
  for (const constraint of programRequirements.constraintsStructured) {
    const result = validateConstraint(constraint, context.allFulfillments, context);
    if (result !== null) {
      results.push(result);
    }
  }

  const allSatisfied = results.every((r) => r.satisfied);
  return { results, allSatisfied };
}

/**
 * Validate a single constraint
 */
function validateConstraint(
  constraint: Constraint,
  fulfillments: FulfillmentRecord[],
  context: ConstraintValidationContext
): ConstraintValidationResult | null {
  // Skip enforcement constraints (handled during assignment)
  if (
    constraint.type === 'allow_double_count' ||
    constraint.type === 'require_course_from_sections'
  ) {
    return null;
  }

  // Validate based on constraint type
  switch (constraint.type) {
    case 'min_course_count':
      return validateMinCourseCount(constraint, fulfillments);
    case 'max_course_count':
      return validateMaxCourseCount(constraint, fulfillments);
    case 'max_credits_from_courses':
      return validateMaxCreditsFromCourses(constraint, fulfillments);
    case 'min_credits_from_courses':
      return validateMinCreditsFromCourses(constraint, fulfillments);
    case 'course_number_range':
      return validateCourseNumberRange(constraint, fulfillments);
    default:
      logger.warn(`Unknown constraint type: ${(constraint as any).type}`);
      return null;
  }
}

// ============================================================================
// Individual Constraint Validators
// ============================================================================

function validateMinCourseCount(
  constraint: MinCourseCountConstraint,
  fulfillments: FulfillmentRecord[]
): ConstraintValidationResult {
  const matchingCourses = fulfillments.filter((f) =>
    evaluateCourseFilter(f.course as any, constraint.filter)
  );

  const satisfied = matchingCourses.length >= constraint.count;

  return {
    constraint,
    satisfied,
  };
}

function validateMaxCourseCount(
  constraint: MaxCourseCountConstraint,
  fulfillments: FulfillmentRecord[]
): ConstraintValidationResult {
  const matchingCourses = fulfillments.filter((f) =>
    evaluateCourseFilter(f.course as any, constraint.filter)
  );

  const satisfied = matchingCourses.length <= constraint.count;

  return {
    constraint,
    satisfied,
  };
}

function validateMaxCreditsFromCourses(
  constraint: MaxCreditsFromCoursesConstraint,
  fulfillments: FulfillmentRecord[]
): ConstraintValidationResult {
  const matchingFulfillments = fulfillments.filter((f) => {
    // Check if courseId matches (if it exists)
    if (f.course.courseId && constraint.courseIds.includes(f.course.courseId)) {
      return true;
    }
    // For Class objects, the courseId might be stored as the identifier
    // Also check subjectCode + courseNumber format
    const courseCode = `${f.course.subjectCode} ${f.course.courseNumber}`;
    return constraint.courseIds.includes(courseCode);
  });

  const totalCredits = matchingFulfillments.reduce(
    (sum, f) => sum + f.creditsApplied,
    0
  );

  const satisfied = totalCredits <= constraint.maxCredits;

  return {
    constraint,
    satisfied,
  };
}

function validateMinCreditsFromCourses(
  constraint: MinCreditsFromCoursesConstraint,
  fulfillments: FulfillmentRecord[]
): ConstraintValidationResult {
  const matchingFulfillments = fulfillments.filter((f) => {
    // Check if courseId matches (if it exists)
    if (f.course.courseId && constraint.courseIds.includes(f.course.courseId)) {
      return true;
    }
    // For Class objects, the courseId might be stored as the identifier
    // Also check subjectCode + courseNumber format
    const courseCode = `${f.course.subjectCode} ${f.course.courseNumber}`;
    return constraint.courseIds.includes(courseCode);
  });

  const totalCredits = matchingFulfillments.reduce(
    (sum, f) => sum + f.creditsApplied,
    0
  );

  const satisfied = totalCredits >= constraint.minCredits;

  return {
    constraint,
    satisfied,
  };
}

function validateCourseNumberRange(
  constraint: CourseNumberRangeConstraint,
  fulfillments: FulfillmentRecord[]
): ConstraintValidationResult {
  const matchingCourses = fulfillments.filter((f) => {
    if (f.course.subjectCode !== constraint.subjectCode) return false;

    const courseNumber = parseInt(f.course.courseNumber);
    if (isNaN(courseNumber)) return false;

    if (constraint.operator === 'above') {
      return courseNumber > constraint.minNumber;
    } else if (constraint.operator === 'below') {
      return courseNumber < constraint.minNumber;
    } else {
      // between
      return (
        courseNumber >= constraint.minNumber &&
        courseNumber <= (constraint.maxNumber || Infinity)
      );
    }
  });

  const satisfied = matchingCourses.length >= constraint.minCount;

  return {
    constraint,
    satisfied,
  };
}
