import { Course } from '@prisma/client';
import {
  Rule,
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
  GroupRule,
} from '../types/program.types.js';
import {
  RuleProgress,
  ProgressStatus,
  TakeCoursesProgressDetails,
  TakeFromListProgressDetails,
  TakeAnyCoursesProgressDetails,
  GroupProgressDetails,
} from '../types/progress.types.js';

/**
 * Evaluate progress for a given rule against a list of courses
 */
export function evaluateRuleProgress(rule: Rule, courses: Course[]): RuleProgress {
  switch (rule.type) {
    case 'take_courses':
      return evaluateTakeCoursesProgress(rule, courses);
    case 'take_from_list':
      return evaluateTakeFromListProgress(rule, courses);
    case 'take_any_courses':
      return evaluateTakeAnyCoursesProgress(rule, courses);
    case 'group':
      return evaluateGroupProgress(rule, courses);
    default:
      // Default case for unknown rule types
      return {
        type: 'take_courses',
        status: 'not_started',
        percentage: 0,
        details: {
          type: 'take_courses',
          requiredCourses: [],
          takenCourses: [],
          missingCourses: [],
          coursesRequired: 0,
          coursesTaken: 0,
        },
      };
  }
}

/**
 * Evaluate progress for take_courses rule
 * Student must take ALL specified courses
 */
function evaluateTakeCoursesProgress(
  rule: TakeCoursesRule,
  courses: Course[]
): RuleProgress {
  const takenCourses = rule.courses.filter((reqCourse) =>
    courses.some((c) => c.courseId === reqCourse)
  );
  const missingCourses = rule.courses.filter((c) => !takenCourses.includes(c));

  const coursesRequired = rule.courses.length;
  const coursesTaken = takenCourses.length;
  const percentage = coursesRequired === 0 ? 100 : (coursesTaken / coursesRequired) * 100;

  let status: ProgressStatus;
  if (percentage === 100) {
    status = 'completed';
  } else if (percentage === 0) {
    status = 'not_started';
  } else {
    status = 'in_progress';
  }

  const details: TakeCoursesProgressDetails = {
    type: 'take_courses',
    requiredCourses: rule.courses,
    takenCourses,
    missingCourses,
    coursesRequired,
    coursesTaken,
  };

  return {
    type: 'take_courses',
    status,
    percentage,
    details,
  };
}

/**
 * Evaluate progress for take_from_list rule
 * Student must take N courses or N credits from the list
 */
function evaluateTakeFromListProgress(
  rule: TakeFromListRule,
  courses: Course[]
): RuleProgress {
  const matchingCourses = courses.filter((c) => rule.courses.includes(c.courseId));

  let fulfilled: number;
  if (rule.countType === 'courses') {
    fulfilled = matchingCourses.length;
  } else {
    // 'credits'
    fulfilled = matchingCourses.reduce((sum, c) => sum + c.creditsMin, 0);
  }

  const percentage = Math.min(100, (fulfilled / rule.count) * 100);

  let status: ProgressStatus;
  if (fulfilled === 0) {
    status = 'not_started';
  } else if (fulfilled >= rule.count) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  const details: TakeFromListProgressDetails = {
    type: 'take_from_list',
    countType: rule.countType,
    required: rule.count,
    fulfilled,
    availableCourses: rule.courses,
    takenCourses: matchingCourses.map((c) => c.courseId),
  };

  return {
    type: 'take_from_list',
    status,
    percentage,
    details,
  };
}

/**
 * Evaluate progress for take_any_courses rule
 * Student must take N credits of any courses matching the filter
 */
function evaluateTakeAnyCoursesProgress(
  rule: TakeAnyCoursesRule,
  courses: Course[]
): RuleProgress {
  // For now, only placeholder filter is supported
  let matchingCourses: Course[];
  if (rule.filter.type === 'placeholder') {
    matchingCourses = courses;
  } else {
    matchingCourses = [];
  }

  const creditsFulfilled = matchingCourses.reduce((sum, c) => sum + c.creditsMin, 0);
  const percentage = Math.min(100, (creditsFulfilled / rule.credits) * 100);

  let status: ProgressStatus;
  if (creditsFulfilled === 0) {
    status = 'not_started';
  } else if (creditsFulfilled >= rule.credits) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  const details: TakeAnyCoursesProgressDetails = {
    type: 'take_any_courses',
    creditsRequired: rule.credits,
    creditsFulfilled,
    matchingCourses: matchingCourses.map((c) => ({
      courseId: c.courseId,
      title: c.title,
      credits: c.creditsMin,
    })),
    filter: rule.filter,
  };

  return {
    type: 'take_any_courses',
    status,
    percentage,
    details,
  };
}

/**
 * Evaluate progress for group rule (AND/OR)
 * Recursively evaluates sub-rules
 */
function evaluateGroupProgress(rule: GroupRule, courses: Course[]): RuleProgress {
  const subRuleProgress = rule.rules.map((r) => evaluateRuleProgress(r, courses));

  let percentage: number;
  let status: ProgressStatus;
  let activeOptionIndex: number | undefined;

  if (rule.operator === 'AND') {
    // AND: all sub-rules must be completed
    const allComplete = subRuleProgress.every((p) => p.status === 'completed');
    const anyStarted = subRuleProgress.some((p) => p.status !== 'not_started');

    // Average percentage for AND
    percentage =
      subRuleProgress.length === 0
        ? 100
        : subRuleProgress.reduce((sum, p) => sum + p.percentage, 0) / subRuleProgress.length;

    if (allComplete) {
      status = 'completed';
    } else if (anyStarted) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }
  } else {
    // OR: at least one sub-rule must be completed
    const anyComplete = subRuleProgress.some((p) => p.status === 'completed');
    const anyStarted = subRuleProgress.some((p) => p.status !== 'not_started');

    // Maximum percentage for OR
    percentage =
      subRuleProgress.length === 0
        ? 0
        : Math.max(...subRuleProgress.map((p) => p.percentage));

    // Track which option has highest progress
    if (subRuleProgress.length > 0) {
      activeOptionIndex = subRuleProgress.findIndex((p) => p.percentage === percentage);
    }

    if (anyComplete) {
      status = 'completed';
    } else if (anyStarted) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }
  }

  const details: GroupProgressDetails = {
    type: 'group',
    operator: rule.operator,
    subRuleProgress,
    activeOptionIndex,
  };

  return {
    type: 'group',
    status,
    percentage,
    details,
  };
}
