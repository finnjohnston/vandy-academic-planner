import { CourseFilter } from './program.types.js';
import { Constraint } from './constraint.types.js';

/**
 * Progress status for requirements, sections, programs, and plans
 */
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Rule-level progress (bottom layer of progress tracking)
 */
export type RuleProgress = {
  type: 'take_courses' | 'take_from_list' | 'take_any_courses' | 'group';
  status: ProgressStatus;
  percentage: number; // 0-100
  details: RuleProgressDetails;
};

/**
 * Progress details for take_courses rule
 */
export type TakeCoursesProgressDetails = {
  type: 'take_courses';
  requiredCourses: string[];
  takenCourses: string[];
  missingCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
  description?: string;
};

/**
 * Progress details for take_from_list rule
 */
export type TakeFromListProgressDetails = {
  type: 'take_from_list';
  countType: 'courses' | 'credits';
  required: number;
  fulfilled: number;
  availableCourses: string[];
  takenCourses: string[];
  description?: string;
};

/**
 * Progress details for take_any_courses rule
 */
export type TakeAnyCoursesProgressDetails = {
  type: 'take_any_courses';
  creditsRequired: number;
  creditsFulfilled: number;
  matchingCourses: Array<{
    courseId: string;
    title: string;
    credits: number;
  }>;
  filter: CourseFilter;
  description?: string;
};

/**
 * Progress details for group rule (recursive)
 */
export type GroupProgressDetails = {
  type: 'group';
  operator: 'AND' | 'OR';
  subRuleProgress: RuleProgress[];
  activeOptionIndex?: number; // For OR: which path student is pursuing
  description?: string;
};

/**
 * Discriminated union of all rule progress detail types
 */
export type RuleProgressDetails =
  | TakeCoursesProgressDetails
  | TakeFromListProgressDetails
  | TakeAnyCoursesProgressDetails
  | GroupProgressDetails;

/**
 * Requirement-level progress
 */
export type RequirementProgress = {
  requirementId: string; // "sectionId.requirementId"
  sectionId: string;
  title: string;
  description: string;
  status: ProgressStatus;
  creditsRequired: number;
  creditsFulfilled: number;
  percentage: number;
  ruleProgress: RuleProgress;
  fulfillingCourses: Array<{
    courseId: string;
    title: string;
    credits: number;
    creditsApplied: number;
    semesterNumber?: number;
    termLabel?: string;
  }>;
  constraintValidation?: {
    results: Array<{
      constraint: Constraint;
      satisfied: boolean;
    }>;
    allSatisfied: boolean;
  };
};

/**
 * Section-level progress
 */
export type SectionProgress = {
  sectionId: string;
  title: string;
  status: ProgressStatus;
  creditsRequired: number;
  creditsFulfilled: number;
  percentage: number;
  requirementProgress: RequirementProgress[];
  constraintValidation?: {
    results: Array<{
      constraint: Constraint;
      satisfied: boolean;
    }>;
    allSatisfied: boolean;
  };
};

/**
 * Program-level progress
 */
export type ProgramProgress = {
  planProgramId: number;
  programId: number;
  programName: string;
  programType: string;
  status: ProgressStatus;
  totalCreditsRequired: number;
  totalCreditsFulfilled: number;
  percentage: number;
  sectionProgress: SectionProgress[];
  lastUpdated: Date;
  constraintValidation?: {
    results: Array<{
      constraint: Constraint;
      satisfied: boolean;
    }>;
    allSatisfied: boolean;
  };
};

/**
 * Plan overview (all programs)
 */
export type PlanProgressOverview = {
  planId: number;
  programs: Array<{
    planProgramId: number;
    programId: number;
    programName: string;
    programType: string;
    status: ProgressStatus;
    percentage: number;
    creditsFulfilled: number;
    creditsRequired: number;
  }>;
  overallStatus: ProgressStatus;
  totalPrograms: number;
  completedPrograms: number;
  lastUpdated: Date;
};

/**
 * Internal helper type for enriched fulfillments
 * Supports both Course (catalog) and Class (semester-specific offering)
 */
export type EnrichedFulfillment = {
  requirementId: string;
  course: {
    id: number;
    courseId: string | null;
    title?: string;
    credits: number;
    subjectCode: string;
    courseNumber: string;
    attributes: any;
  };
  creditsApplied: number;
  semesterNumber: number;
};
