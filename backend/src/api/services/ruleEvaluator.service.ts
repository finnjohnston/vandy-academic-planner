import {
  Rule,
  GroupRule,
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
} from '../types/program.types.js';
import { Course, Class } from '@prisma/client';
import {
  evaluateCourseFilter,
  calculateFilterSpecificity,
} from './courseFilter.service.js';

export interface RuleEvaluation {
  matches: boolean;
  specificityScore: number;
}

/**
 * Helper function to check if a course matches a course identifier
 * Supports both "SUBJ NUM" format (e.g., "MATH 1300") and raw courseId/classId
 * Accepts both Course (catalog) and Class (semester-specific offering)
 */
function courseMatchesIdentifier(course: Course | Class, identifier: string): boolean {
  // First try direct courseId match (Course always has it, Class optionally has it)
  if ('courseId' in course && course.courseId === identifier) {
    return true;
  }

  // For Class objects, also try classId match
  if ('classId' in course && course.classId === identifier) {
    return true;
  }

  // Then try matching by subjectCode + courseNumber (e.g., "MATH 1300")
  const courseCode = `${course.subjectCode} ${course.courseNumber}`;
  if (courseCode === identifier) {
    return true;
  }

  return false;
}

/**
 * Evaluates if a course matches a rule and returns specificity score
 * Accepts both Course (catalog) and Class (semester-specific offering)
 */
export function evaluateRule(rule: Rule, course: Course | Class): RuleEvaluation {
  switch (rule.type) {
    case 'take_courses':
      return evaluateTakeCourses(rule, course);

    case 'take_from_list':
      return evaluateTakeFromList(rule, course);

    case 'take_any_courses':
      return evaluateTakeAnyCourses(rule, course);

    case 'group':
      return evaluateGroup(rule, course);

    default:
      return { matches: false, specificityScore: 0 };
  }
}

function evaluateTakeCourses(
  rule: TakeCoursesRule,
  course: Course | Class
): RuleEvaluation {
  // Course matches if it's in the required list (by courseId or subjectCode + courseNumber)
  const matches = rule.courses.some((identifier) =>
    courseMatchesIdentifier(course, identifier)
  );
  return {
    matches,
    specificityScore: matches ? 100 : 0,
  };
}

function evaluateTakeFromList(
  rule: TakeFromListRule,
  course: Course | Class
): RuleEvaluation {
  // Course matches if it's one of the options (by courseId or subjectCode + courseNumber)
  const matches = rule.courses.some((identifier) =>
    courseMatchesIdentifier(course, identifier)
  );
  return {
    matches,
    specificityScore: matches ? 80 : 0,
  };
}

function evaluateTakeAnyCourses(
  rule: TakeAnyCoursesRule,
  course: Course | Class
): RuleEvaluation {
  // Use real filter evaluation (Phase 6)
  const matches = evaluateCourseFilter(course, rule.filter);
  const specificityScore = matches ? calculateFilterSpecificity(rule.filter) : 0;

  return {
    matches,
    specificityScore,
  };
}

function evaluateGroup(rule: GroupRule, course: Course | Class): RuleEvaluation {
  // Evaluate all sub-rules
  const subEvaluations = rule.rules.map((subRule) =>
    evaluateRule(subRule, course)
  );

  if (rule.operator === 'AND') {
    // For AND during matching: a course matches if it satisfies ANY sub-rule
    // (different courses will satisfy different parts of the AND)
    const matchedEvaluations = subEvaluations.filter(
      (evaluation) => evaluation.matches
    );
    if (matchedEvaluations.length === 0) {
      return { matches: false, specificityScore: 0 };
    }
    // Score is maximum of matched sub-rules
    const maxScore = Math.max(
      ...matchedEvaluations.map((e) => e.specificityScore)
    );
    return { matches: true, specificityScore: maxScore };
  } else {
    // OR
    // For OR: at least one sub-rule must match
    const matchedEvaluations = subEvaluations.filter(
      (evaluation) => evaluation.matches
    );
    if (matchedEvaluations.length === 0) {
      return { matches: false, specificityScore: 0 };
    }
    // Score is maximum of matched rules
    const maxScore = Math.max(
      ...matchedEvaluations.map((e) => e.specificityScore)
    );
    return { matches: true, specificityScore: maxScore };
  }
}

