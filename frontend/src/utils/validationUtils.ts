import type { PlannedCourse } from '../types/PlannedCourse';
import type { Course } from '../types/Course';
import type { Violation, ValidationResult } from '../types/Validation';

// LogicalExpression type (matches backend structure)
type LogicalExpression =
  | { $and: Array<string | LogicalExpression> }
  | { $or: Array<string | LogicalExpression> }
  | string;

interface ParsedRequirements {
  prerequisites?: {
    rawText: string | null;
    courses: LogicalExpression | null;
  };
  corequisites?: {
    rawText: string | null;
    courses: LogicalExpression | null;
  };
}

/**
 * Normalizes a course ID for comparison
 * Converts to uppercase and normalizes whitespace
 */
export const normalizeCourseId = (courseId: string): string => {
  return courseId.trim().replace(/\s+/g, ' ').toUpperCase();
};

/**
 * Checks if a course exists in the plan and is in the correct semester
 * relative to the target semester
 */
export const isCourseInPlanBySemester = (
  courseId: string,
  targetSemester: number,
  plannedCourses: PlannedCourse[],
  requirementType: 'prerequisite' | 'corequisite'
): boolean => {
  const normalizedId = normalizeCourseId(courseId);

  const matchingCourse = plannedCourses.find((pc) => {
    // Try matching using courseId field first (direct match)
    if (pc.courseId) {
      const normalized = normalizeCourseId(pc.courseId);
      if (normalized === normalizedId) return true;
    }

    // Fallback: try constructing from subjectCode + courseNumber
    if (pc.subjectCode && pc.courseNumber) {
      const plannedId = `${pc.subjectCode} ${pc.courseNumber}`;
      const normalized = normalizeCourseId(plannedId);
      if (normalized === normalizedId) return true;
    }

    return false;
  });

  if (!matchingCourse) {
    return false;
  }

  // Transfer credits (semester 0) satisfy all requirements
  if (matchingCourse.semesterNumber === 0) return true;

  // Prerequisite: must be in earlier semester
  if (requirementType === 'prerequisite') {
    return matchingCourse.semesterNumber < targetSemester;
  }

  // Corequisite: must be in same or earlier semester
  if (requirementType === 'corequisite') {
    return matchingCourse.semesterNumber <= targetSemester;
  }

  return false;
};

/**
 * Recursively extracts all course IDs from a LogicalExpression tree
 */
export const extractCourseIds = (logic: LogicalExpression | null): string[] => {
  if (!logic) return [];

  if (typeof logic === 'string') {
    return [logic];
  }

  if ('$and' in logic) {
    return logic.$and.flatMap((item) => extractCourseIds(item));
  }

  if ('$or' in logic) {
    return logic.$or.flatMap((item) => extractCourseIds(item));
  }

  return [];
};

/**
 * Recursively evaluates a LogicalExpression tree
 * Returns true if the expression is satisfied
 */
export const evaluateLogicalExpression = (
  logic: LogicalExpression,
  targetSemester: number,
  plannedCourses: PlannedCourse[],
  requirementType: 'prerequisite' | 'corequisite'
): boolean => {
  // Base case: single course ID string
  if (typeof logic === 'string') {
    return isCourseInPlanBySemester(logic, targetSemester, plannedCourses, requirementType);
  }

  // $and: ALL courses must be satisfied
  if ('$and' in logic) {
    return logic.$and.every((item) =>
      evaluateLogicalExpression(item, targetSemester, plannedCourses, requirementType)
    );
  }

  // $or: ANY course must be satisfied
  if ('$or' in logic) {
    return logic.$or.some((item) =>
      evaluateLogicalExpression(item, targetSemester, plannedCourses, requirementType)
    );
  }

  return false;
};

/**
 * Checks if requirements text indicates a mutual corequisite
 * (courses that must be taken in the same semester)
 */
export const isMutualCorequisite = (requirements: ParsedRequirements): boolean => {
  const rawText = requirements.corequisites?.rawText?.toLowerCase() || '';
  return (
    rawText.includes('mutual') ||
    rawText.includes('concurrent with') ||
    rawText.includes('must be taken with')
  );
};

/**
 * Detects if two courses have a bidirectional corequisite relationship
 */
export const detectMutualCorequisites = (
  courseA: Course,
  courseB: Course
): boolean => {
  const requirementsA = courseA.requirements as ParsedRequirements | undefined;
  const requirementsB = courseB.requirements as ParsedRequirements | undefined;

  if (!requirementsA?.corequisites?.courses || !requirementsB?.corequisites?.courses) {
    return false;
  }

  const courseBId = `${courseB.subjectCode} ${courseB.courseNumber}`;
  const courseAId = `${courseA.subjectCode} ${courseA.courseNumber}`;

  // Check if courseA lists courseB as a corequisite
  const aListsB = extractCourseIds(requirementsA.corequisites.courses)
    .map(normalizeCourseId)
    .includes(normalizeCourseId(courseBId));

  // Check if courseB lists courseA as a corequisite
  const bListsA = extractCourseIds(requirementsB.corequisites.courses)
    .map(normalizeCourseId)
    .includes(normalizeCourseId(courseAId));

  return aListsB && bListsA;
};

/**
 * Validates prerequisite requirements for a course
 */
export const validatePrerequisites = (
  courseId: string,
  targetSemester: number,
  prerequisites: LogicalExpression,
  plannedCourses: PlannedCourse[]
): Violation[] => {
  const violations: Violation[] = [];

  const isValid = evaluateLogicalExpression(
    prerequisites,
    targetSemester,
    plannedCourses,
    'prerequisite'
  );

  if (!isValid) {
    violations.push({
      type: 'prerequisite-not-taken',
      message: `Missing prerequisites for ${courseId}`,
    });
  }

  return violations;
};

/**
 * Validates corequisite requirements for a course
 */
export const validateCorequisites = (
  courseId: string,
  targetSemester: number,
  corequisites: LogicalExpression,
  plannedCourses: PlannedCourse[]
): Violation[] => {
  const violations: Violation[] = [];

  const isValid = evaluateLogicalExpression(
    corequisites,
    targetSemester,
    plannedCourses,
    'corequisite'
  );

  if (!isValid) {
    violations.push({
      type: 'corequisite-not-taken',
      message: `Missing corequisites for ${courseId}`,
    });
  }

  return violations;
};

/**
 * Validates mutual corequisites (courses that must be in same semester)
 */
export const validateMutualCorequisites = (
  plannedCourse: PlannedCourse,
  courseDetails: Course,
  plannedCourses: PlannedCourse[],
  courseDetailsMap: Map<string, Course>
): Violation[] => {
  const violations: Violation[] = [];
  const requirements = courseDetails.requirements as ParsedRequirements | undefined;

  if (!requirements?.corequisites?.courses) {
    return violations;
  }

  // Check if this is a mutual corequisite situation
  if (!isMutualCorequisite(requirements)) {
    return violations;
  }

  // Extract all corequisite course IDs
  const coreqIds = extractCourseIds(requirements.corequisites.courses);

  for (const coreqId of coreqIds) {
    const coreqCourse = courseDetailsMap.get(coreqId);
    if (!coreqCourse) continue;

    // Check if this is bidirectional (mutual)
    if (detectMutualCorequisites(courseDetails, coreqCourse)) {
      const coreqPlanned = plannedCourses.find((pc) => {
        const plannedId = `${pc.subjectCode} ${pc.courseNumber}`;
        return normalizeCourseId(plannedId) === normalizeCourseId(coreqId);
      });

      if (!coreqPlanned) {
        violations.push({
          type: 'mutual-corequisite-missing',
          message: `Mutual corequisite ${coreqId} not in plan`,
          relatedCourseId: coreqId,
        });
      } else if (coreqPlanned.semesterNumber !== plannedCourse.semesterNumber) {
        violations.push({
          type: 'mutual-corequisite-different-semester',
          message: `Mutual corequisite ${coreqId} must be in semester ${plannedCourse.semesterNumber}`,
          relatedCourseId: coreqId,
          expectedSemester: plannedCourse.semesterNumber,
          actualSemester: coreqPlanned.semesterNumber,
        });
      }
    }
  }

  return violations;
};

/**
 * Main validation function for a single planned course
 * Checks prerequisites, corequisites, and mutual corequisites
 */
export const validatePlannedCourse = (
  plannedCourse: PlannedCourse,
  courseDetails: Course,
  plannedCourses: PlannedCourse[],
  courseDetailsMap: Map<string, Course>
): ValidationResult => {
  const violations: Violation[] = [];
  const requirements = courseDetails.requirements as ParsedRequirements | undefined;
  const courseId = plannedCourse.courseId || `${plannedCourse.subjectCode} ${plannedCourse.courseNumber}`;

  if (!requirements) {
    return { isValid: true, violations: [] };
  }

  // Validate prerequisites
  if (requirements.prerequisites?.courses) {
    const prereqViolations = validatePrerequisites(
      courseId,
      plannedCourse.semesterNumber,
      requirements.prerequisites.courses,
      plannedCourses
    );
    violations.push(...prereqViolations);
  }

  // Validate corequisites
  if (requirements.corequisites?.courses) {
    const coreqViolations = validateCorequisites(
      courseId,
      plannedCourse.semesterNumber,
      requirements.corequisites.courses,
      plannedCourses
    );
    violations.push(...coreqViolations);
  }

  // Validate mutual corequisites
  const mutualViolations = validateMutualCorequisites(
    plannedCourse,
    courseDetails,
    plannedCourses,
    courseDetailsMap
  );
  violations.push(...mutualViolations);

  return {
    isValid: violations.length === 0,
    violations,
  };
};
