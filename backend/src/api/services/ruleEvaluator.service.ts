import {
  Rule,
  GroupRule,
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
} from '../types/program.types.js';
import { Course } from '@prisma/client';
import {
  evaluateCourseFilter,
  calculateFilterSpecificity,
} from './courseFilter.service.js';

export interface RuleEvaluation {
  matches: boolean;
  specificityScore: number;
}

/**
 * Evaluates if a course matches a rule and returns specificity score
 */
export function evaluateRule(rule: Rule, course: Course): RuleEvaluation {
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
  course: Course
): RuleEvaluation {
  // Course matches if it's in the required list
  const matches = rule.courses.includes(course.courseId);
  return {
    matches,
    specificityScore: matches ? 100 : 0,
  };
}

function evaluateTakeFromList(
  rule: TakeFromListRule,
  course: Course
): RuleEvaluation {
  // Course matches if it's one of the options
  const matches = rule.courses.includes(course.courseId);
  return {
    matches,
    specificityScore: matches ? 80 : 0,
  };
}

function evaluateTakeAnyCourses(
  rule: TakeAnyCoursesRule,
  course: Course
): RuleEvaluation {
  // Use real filter evaluation (Phase 6)
  const matches = evaluateCourseFilter(course, rule.filter);
  const specificityScore = matches ? calculateFilterSpecificity(rule.filter) : 0;

  return {
    matches,
    specificityScore,
  };
}

function evaluateGroup(rule: GroupRule, course: Course): RuleEvaluation {
  // Evaluate all sub-rules
  const subEvaluations = rule.rules.map((subRule) =>
    evaluateRule(subRule, course)
  );

  if (rule.operator === 'AND') {
    // For AND: all sub-rules must match
    const allMatch = subEvaluations.every((evaluation) => evaluation.matches);
    if (!allMatch) {
      return { matches: false, specificityScore: 0 };
    }
    // Score is minimum of all matched rules
    const minScore = Math.min(...subEvaluations.map((e) => e.specificityScore));
    return { matches: true, specificityScore: minScore };
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

