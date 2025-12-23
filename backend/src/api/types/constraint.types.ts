import { CourseFilter } from './program.types.js';

// ============================================================================
// Base Constraint Interface
// ============================================================================

// ============================================================================
// Constraint Types
// ============================================================================

/**
 * Discriminated union of all constraint types
 */
export type Constraint = EnforcementConstraint | ValidationConstraint;

// ============================================================================
// Enforcement Constraints (modify fulfillment assignment behavior)
// ============================================================================

export type EnforcementConstraint =
  | AllowDoubleCountConstraint
  | RequireCourseFromSectionsConstraint;

/**
 * Allow a specific course to fulfill multiple requirements
 * Example: "CS 1151 can double count for Ethics and Liberal Arts Core"
 */
export interface AllowDoubleCountConstraint {
  id: string;
  type: 'allow_double_count';
  courseId: string; // e.g., "CS 1151"
  requirementIds: string[]; // e.g., ["general_degree_requirements.ethics", "liberal_arts_core.12_credits_liberal_arts_core"]
}

/**
 * Require that courses assigned to this requirement must also be assigned to specific sections
 * Example: "Writing requirement must come from Liberal Arts Core, Technical Electives, or Open Electives"
 */
export interface RequireCourseFromSectionsConstraint {
  id: string;
  type: 'require_course_from_sections';
  description: string; // Human-readable description for UI display
  allowedSectionIds: string[]; // e.g., ["liberal_arts_core", "technical_electives", "open_electives"]
  operator: 'AND' | 'OR'; // Must be in ALL sections (AND) or ANY section (OR)
}

// ============================================================================
// Validation Constraints (check and report violations)
// ============================================================================

export type ValidationConstraint =
  | MinCourseCountConstraint
  | MaxCourseCountConstraint
  | MaxCreditsFromCoursesConstraint
  | MinCreditsFromCoursesConstraint
  | CourseNumberRangeConstraint;

/**
 * Minimum number of courses matching a filter
 * Example: "At least one lab course" or "At least one course above ECON 3015"
 */
export interface MinCourseCountConstraint {
  id: string;
  type: 'min_course_count';
  description: string; // Human-readable description for UI display
  count: number;
  filter: CourseFilter;
}

/**
 * Maximum number of courses matching a filter
 */
export interface MaxCourseCountConstraint {
  id: string;
  type: 'max_course_count';
  description: string; // Human-readable description for UI display
  count: number;
  filter: CourseFilter;
}

/**
 * Maximum credits that can come from specific courses
 * Example: "A maximum of six credits may come from CS 3860, 3861"
 */
export interface MaxCreditsFromCoursesConstraint {
  id: string;
  type: 'max_credits_from_courses';
  description: string; // Human-readable description for UI display
  maxCredits: number;
  courseIds: string[]; // e.g., ["CS 3860", "CS 3861"]
}

/**
 * Minimum credits that must come from specific courses
 */
export interface MinCreditsFromCoursesConstraint {
  id: string;
  type: 'min_credits_from_courses';
  description: string; // Human-readable description for UI display
  minCredits: number;
  courseIds: string[];
}

/**
 * Require courses above a certain level
 * Example: "At least one course must be above ECON 3015"
 */
export interface CourseNumberRangeConstraint {
  id: string;
  type: 'course_number_range';
  description: string; // Human-readable description for UI display
  subjectCode: string; // e.g., "ECON"
  minNumber: number; // e.g., 3015
  minCount: number; // How many courses must be in this range
  operator: 'above' | 'below' | 'between';
  maxNumber?: number; // For 'between' operator
}

// ============================================================================
// Validation Context Types
// ============================================================================

/**
 * Context for constraint validation
 */
export interface ConstraintValidationContext {
  requirementId: string;
  sectionId: string;
  planProgramId: number;
  programRequirements: any; // ProgramRequirements type
  allFulfillments: FulfillmentRecord[]; // All fulfillments for this plan-program
}

/**
 * Fulfillment record for validation
 */
export interface FulfillmentRecord {
  requirementId: string;
  sectionId: string;
  course: {
    id: number;
    courseId: string;
    title: string;
    credits: number;
    subjectCode: string;
    courseNumber: string;
    attributes: any;
  };
  creditsApplied: number;
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Result of validating a single constraint
 */
export interface ConstraintValidationResult {
  constraint: Constraint;
  satisfied: boolean;
}

/**
 * Aggregated validation results for a requirement
 */
export interface RequirementConstraintValidation {
  results: ConstraintValidationResult[];
  allSatisfied: boolean;
}

// ============================================================================
// Double Count Support Types
// ============================================================================

/**
 * Information about double counting for a course
 */
export interface DoubleCountInfo {
  courseId: string;
  allowedRequirementIds: string[]; // Which requirements can this course fulfill simultaneously
}

/**
 * Double count map for efficient lookup during fulfillment assignment
 */
export type DoubleCountMap = Map<string, DoubleCountInfo>;
