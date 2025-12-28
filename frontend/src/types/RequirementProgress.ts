export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type TakeCoursesProgressDetails = {
  type: 'take_courses';
  requiredCourses: string[];
  takenCourses: string[];
  missingCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
  description?: string;
};

export type TakeFromListProgressDetails = {
  type: 'take_from_list';
  availableCourses: string[];
  takenCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
  description?: string;
};

export type TakeAnyCoursesProgressDetails = {
  type: 'take_any_courses';
  coursesRequired: number;
  coursesTaken: number;
  creditsRequired: number;
  creditsFulfilled: number;
  matchingCourses: Array<{
    courseId: string;
    title: string;
    credits: number;
  }>;
  filter: any;
  description?: string;
};

export type GroupProgressDetails = {
  type: 'group';
  operator: 'AND' | 'OR';
  subRuleProgress: RuleProgress[];
  activeOptionIndex?: number;
  description?: string;
};

export type RuleProgressDetails =
  | TakeCoursesProgressDetails
  | TakeFromListProgressDetails
  | TakeAnyCoursesProgressDetails
  | GroupProgressDetails;

export interface RuleProgress {
  type: 'take_courses' | 'take_from_list' | 'take_any_courses' | 'group';
  status: ProgressStatus;
  percentage: number;
  details: RuleProgressDetails;
}

export interface MinCourseCountConstraint {
  id: string;
  type: 'min_course_count';
  description: string;
  count: number;
  filter: any;
}

export interface MaxCourseCountConstraint {
  id: string;
  type: 'max_course_count';
  description: string;
  count: number;
  filter: any;
}

export interface MaxCreditsFromCoursesConstraint {
  id: string;
  type: 'max_credits_from_courses';
  description: string;
  maxCredits: number;
  courseIds: string[];
}

export interface MinCreditsFromCoursesConstraint {
  id: string;
  type: 'min_credits_from_courses';
  description: string;
  minCredits: number;
  courseIds: string[];
}

export interface CourseNumberRangeConstraint {
  id: string;
  type: 'course_number_range';
  description: string;
  subjectCode: string;
  minNumber: number;
  minCount: number;
  operator: 'above' | 'below' | 'between';
  maxNumber?: number;
}

export interface RequireCourseFromSectionsConstraint {
  id: string;
  type: 'require_course_from_sections';
  description: string;
  allowedSectionIds: string[];
  operator: 'AND' | 'OR';
}

export type Constraint =
  | MinCourseCountConstraint
  | MaxCourseCountConstraint
  | MaxCreditsFromCoursesConstraint
  | MinCreditsFromCoursesConstraint
  | CourseNumberRangeConstraint
  | RequireCourseFromSectionsConstraint;

export interface ConstraintResult {
  constraint: Constraint;
  satisfied: boolean;
}

export interface ConstraintValidation {
  allSatisfied: boolean;
  results: ConstraintResult[];
}

export interface FulfillingCourse {
  courseId: string;
  title: string;
  credits: number;
  creditsApplied: number;
  semesterNumber?: number;
  termLabel?: string;
}

export interface RequirementProgress {
  requirementId: string;
  sectionId: string;
  title: string;
  description: string;
  status: ProgressStatus;
  creditsRequired: number;
  creditsFulfilled: number;
  percentage: number;
  ruleProgress: RuleProgress;
  fulfillingCourses: FulfillingCourse[];
  constraintValidation?: ConstraintValidation;
}
