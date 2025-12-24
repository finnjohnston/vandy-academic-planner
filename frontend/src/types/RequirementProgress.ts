export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type TakeCoursesProgressDetails = {
  type: 'take_courses';
  requiredCourses: string[];
  takenCourses: string[];
  missingCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
};

export type TakeFromListProgressDetails = {
  type: 'take_from_list';
  availableCourses: string[];
  takenCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
};

export type TakeAnyCoursesProgressDetails = {
  type: 'take_any_courses';
  takenCourses: string[];
  coursesRequired: number;
  coursesTaken: number;
};

export type GroupProgressDetails = {
  type: 'group';
  childRequirements: string[];
  completedRequirements: string[];
  requirementsRequired: number;
  requirementsCompleted: number;
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

export interface ConstraintResult {
  constraintType: string;
  satisfied: boolean;
  message: string;
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
