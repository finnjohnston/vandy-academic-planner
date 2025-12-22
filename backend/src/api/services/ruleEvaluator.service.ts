import {
  Rule,
  GroupRule,
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
  CourseFilter,
} from '../types/program.types.js';
import { Course } from '@prisma/client';

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
  // For Phase 4, filters are placeholders - always match
  // TODO: Implement actual filter evaluation in Phase 6
  const matches = evaluateFilter(rule.filter, course);
  return {
    matches,
    specificityScore: matches ? 10 : 0,
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

/**
 * Evaluates if course matches a filter
 * Phase 4: Placeholder implementation (always returns true)
 * Phase 6: Implement actual filter logic
 */
function evaluateFilter(filter: CourseFilter, course: Course): boolean {
  // For Phase 4, all filters are placeholders
  if (filter.type === 'placeholder') {
    return true;
  }

  // TODO Phase 6: Implement actual filter evaluation
  // - Check course attributes (MNS, HCA, etc.)
  // - Check course number ranges
  // - Check department codes
  // - etc.

  return false;
}
