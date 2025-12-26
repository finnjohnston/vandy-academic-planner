import { Course } from '@prisma/client';
import {
  CourseFilter,
  AnyFilter,
  SubjectNumberFilter,
  AttributeFilter,
  CourseListFilter,
  CourseNumberSuffixFilter,
  NumberAttributeFilter,
  NumberConstraint,
  CompositeFilter,
} from '../types/program.types.js';
import { prisma } from '../../config/prisma.js';

/**
 * Evaluate if a course matches a filter
 * @param course - Course to evaluate
 * @param filter - Filter to evaluate against
 * @returns true if course matches filter
 */
export function evaluateCourseFilter(course: Course, filter: CourseFilter): boolean {
  switch (filter.type) {
    case 'any':
      return evaluateAny(course, filter);
    case 'subject_number':
      return evaluateSubjectNumber(course, filter);
    case 'attribute':
      return evaluateAttribute(course, filter);
    case 'course_list':
      return evaluateCourseList(course, filter);
    case 'course_number_suffix':
      return evaluateCourseNumberSuffix(course, filter);
    case 'number_attribute':
      return evaluateNumberAttribute(course, filter);
    case 'composite':
      return evaluateComposite(course, filter);
    default:
      return false;
  }
}

/**
 * Placeholder filter - always matches
 */
function evaluateAny(course: Course, filter: AnyFilter): boolean {
  return true;
}

/**
 * Subject number filter - matches by subject code, number ranges, and exclusions
 */
function evaluateSubjectNumber(course: Course, filter: SubjectNumberFilter): boolean {
  // Step 1: Check subject code
  if (!filter.subjects.includes(course.subjectCode)) {
    return false;
  }

  // Step 2: Check number constraints (if provided)
  if (filter.numbers) {
    const courseNum = parseInt(course.courseNumber);
    const matchesAnyConstraint = filter.numbers.some((constraint) => {
      if (constraint.type === 'specific') {
        return constraint.values.includes(course.courseNumber);
      } else {
        // type === 'range'
        const min = constraint.min;
        const max = constraint.max ?? Infinity;
        return courseNum >= min && courseNum <= max;
      }
    });
    if (!matchesAnyConstraint) return false;
  }

  // Step 3: Check exclusions (if provided)
  if (filter.exclude && filter.exclude.includes(course.courseId)) {
    return false;
  }

  return true;
}

/**
 * Attribute filter - matches by AXLE/CORE attributes with exclusions
 */
function evaluateAttribute(course: Course, filter: AttributeFilter): boolean {
  // Step 1: Check exclusions first
  if (filter.exclude?.subjects?.includes(course.subjectCode)) {
    return false;
  }

  // Step 2: Parse attributes from Course.attributes JSON
  if (!course.attributes) return false;

  const courseAttributes = getCourseAttributes(course, filter.attributeType);
  if (courseAttributes.length === 0) return false;

  return filter.attributes.some((attr) => courseAttributes.includes(attr));
}

/**
 * Course number suffix filter - matches by suffix with optional subject and exclusions
 */
function evaluateCourseNumberSuffix(
  course: Course,
  filter: CourseNumberSuffixFilter
): boolean {
  if (filter.subjects && !filter.subjects.includes(course.subjectCode)) {
    return false;
  }

  if (filter.exclude && filter.exclude.includes(course.courseId)) {
    return false;
  }

  return filter.suffixes.some((suffix) => course.courseNumber.endsWith(suffix));
}

/**
 * Number + attribute filter - matches by number constraints and attribute strings
 */
function evaluateNumberAttribute(course: Course, filter: NumberAttributeFilter): boolean {
  if (filter.subjects && !filter.subjects.includes(course.subjectCode)) {
    return false;
  }

  if (filter.exclude?.subjects?.includes(course.subjectCode)) {
    return false;
  }

  if (filter.exclude?.courses?.includes(course.courseId)) {
    return false;
  }

  if (!matchesNumberConstraints(course.courseNumber, filter.numbers)) {
    return false;
  }

  const courseAttributes = getCourseAttributes(course, filter.attributeType);
  if (courseAttributes.length === 0) return false;

  return filter.attributes.some((attr) => courseAttributes.includes(attr));
}

function getCourseAttributes(
  course: Course,
  attributeType?: 'axle' | 'core'
): string[] {
  if (!course.attributes) return [];
  const attrs = course.attributes as { axle?: string[]; core?: string[] };
  const axleAttributes = attrs.axle ?? [];
  const coreAttributes = attrs.core ?? [];

  if (attributeType === 'axle') return axleAttributes;
  if (attributeType === 'core') return coreAttributes;
  return [...axleAttributes, ...coreAttributes];
}

function matchesNumberConstraints(
  courseNumber: string,
  constraints: NumberConstraint[]
): boolean {
  const courseNum = parseInt(courseNumber);
  return constraints.some((constraint) => {
    if (constraint.type === 'specific') {
      return constraint.values.includes(courseNumber);
    }
    const min = constraint.min;
    const max = constraint.max ?? Infinity;
    return courseNum >= min && courseNum <= max;
  });
}

/**
 * Course list filter - matches specific course IDs
 */
function evaluateCourseList(course: Course, filter: CourseListFilter): boolean {
  return filter.courses.includes(course.courseId);
}

/**
 * Composite filter - combines filters with AND/OR logic
 */
function evaluateComposite(course: Course, filter: CompositeFilter): boolean {
  if (filter.operator === 'AND') {
    return filter.filters.every((f) => evaluateCourseFilter(course, f));
  } else {
    // operator === 'OR'
    return filter.filters.some((f) => evaluateCourseFilter(course, f));
  }
}

/**
 * Calculate specificity score for a filter (0-100)
 * Higher score = more specific requirement
 */
export function calculateFilterSpecificity(filter: CourseFilter): number {
  switch (filter.type) {
    case 'any':
      return 10; // Least specific (matches everything)

    case 'attribute': {
      // 40-65 based on exclusions and attribute count
      const baseScore = 40;
      const exclusionBonus = filter.exclude?.subjects ? 10 : 0;
      const attributeCount = filter.attributes.length;
      // More attributes = less specific (wider net)
      const attributePenalty = Math.min(15, (attributeCount - 1) * 3);
      return baseScore + exclusionBonus - attributePenalty;
    }

    case 'subject_number': {
      // 50-85 based on constraints
      let score = 50;

      // Has number constraints: +10-25
      if (filter.numbers) {
        const hasSpecificNumbers = filter.numbers.some((c) => c.type === 'specific');
        const hasRanges = filter.numbers.some((c) => c.type === 'range');
        if (hasSpecificNumbers) score += 25; // Very specific
        else if (hasRanges) score += 15; // Moderately specific
      }

      // Has exclusions: +5
      if (filter.exclude && filter.exclude.length > 0) {
        score += 5;
      }

      // Few subjects: +5
      if (filter.subjects.length <= 2) {
        score += 5;
      }

      return Math.min(85, score);
    }

    case 'course_list': {
      // 85-90 based on list size
      const baseListScore = 85;
      // Smaller list = more specific
      const listSize = filter.courses.length;
      const sizeBonus = listSize <= 5 ? 5 : listSize <= 10 ? 3 : 0;
      return baseListScore + sizeBonus;
    }

    case 'course_number_suffix': {
      // 45-60 based on subject scope and suffix count
      let score = 45;
      if (filter.subjects && filter.subjects.length <= 2) {
        score += 5;
      }
      if (filter.suffixes.length === 1) {
        score += 5;
      }
      return Math.min(60, score);
    }

    case 'number_attribute': {
      // 55-75 based on constraints and attribute count
      let score = 55;
      if (filter.subjects && filter.subjects.length <= 2) {
        score += 5;
      }
      const attributePenalty = Math.min(10, (filter.attributes.length - 1) * 2);
      score -= attributePenalty;
      if (filter.numbers.some((c) => c.type === 'specific')) {
        score += 10;
      }
      return Math.min(75, score);
    }

    case 'composite': {
      // Use maximum specificity of sub-filters
      // AND increases specificity, OR decreases it
      const subScores = filter.filters.map(calculateFilterSpecificity);
      const maxScore = Math.max(...subScores);

      if (filter.operator === 'AND') {
        // AND is more specific: average of top 2 scores
        const sorted = subScores.sort((a, b) => b - a);
        return sorted.length >= 2 ? (sorted[0] + sorted[1]) / 2 : sorted[0];
      } else {
        // OR is less specific: use minimum score
        // An OR filter is only as specific as its least specific (most broadly matching) component
        // since it accepts courses that match ANY sub-filter
        const minScore = Math.min(...subScores);
        return minScore;
      }
    }

    default:
      return 0;
  }
}

/**
 * Get all courses that match a filter
 * @param filter - Filter to match against
 * @param academicYearId - Academic year for course catalog
 * @returns Array of matching courses
 */
export async function getCoursesByFilter(
  filter: CourseFilter,
  academicYearId: number
): Promise<Course[]> {
  // Strategy: Use Prisma queries for simple filters, in-memory for complex

  if (filter.type === 'any') {
    // Fetch all courses
    return await prisma.course.findMany({
      where: { academicYearId, isCatalogCourse: true },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });
  }

  if (filter.type === 'course_list') {
    // Direct query by course IDs
    return await prisma.course.findMany({
      where: {
        academicYearId,
        courseId: { in: filter.courses },
        isCatalogCourse: true,
      },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });
  }

  if (filter.type === 'subject_number' && !filter.numbers && !filter.exclude) {
    // Simple subject filter without constraints
    return await prisma.course.findMany({
      where: {
        academicYearId,
        subjectCode: { in: filter.subjects },
        isCatalogCourse: true,
      },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });
  }

  if (filter.type === 'course_number_suffix' && !filter.exclude) {
    const suffixClauses = filter.suffixes.map((suffix) => ({
      courseNumber: { endsWith: suffix },
    }));

    if (!filter.subjects || filter.subjects.length === 0) {
      return await prisma.course.findMany({
        where: {
          academicYearId,
          OR: suffixClauses,
          isCatalogCourse: true,
        },
        orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
      });
    }

    return await prisma.course.findMany({
      where: {
        academicYearId,
        subjectCode: { in: filter.subjects },
        OR: suffixClauses,
        isCatalogCourse: true,
      },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });
  }

  // Complex filters: fetch all courses and filter in memory
  const allCourses = await prisma.course.findMany({
    where: { academicYearId, isCatalogCourse: true },
  });

  return allCourses.filter((course) => evaluateCourseFilter(course, filter));
}

/**
 * Validate filter structure and return error if invalid
 * @returns null if valid, error message if invalid
 */
export function validateFilter(filter: CourseFilter): string | null {
  switch (filter.type) {
    case 'any':
      return null; // Always valid

    case 'subject_number':
      if (!filter.subjects || filter.subjects.length === 0) {
        return 'subject_number filter must have at least one subject';
      }
      if (filter.numbers) {
        for (const constraint of filter.numbers) {
          if (constraint.type === 'specific' && constraint.values.length === 0) {
            return 'specific number constraint must have at least one value';
          }
          if (constraint.type === 'range' && constraint.min < 0) {
            return 'range min must be non-negative';
          }
        }
      }
      return null;

    case 'attribute':
      if (!filter.attributes || filter.attributes.length === 0) {
        return 'attribute filter must have at least one attribute';
      }
      return null;

    case 'course_list':
      if (!filter.courses || filter.courses.length === 0) {
        return 'course_list filter must have at least one course';
      }
      return null;

    case 'course_number_suffix':
      if (!filter.suffixes || filter.suffixes.length === 0) {
        return 'course_number_suffix filter must have at least one suffix';
      }
      return null;

    case 'number_attribute':
      if (!filter.numbers || filter.numbers.length === 0) {
        return 'number_attribute filter must have at least one number constraint';
      }
      if (!filter.attributes || filter.attributes.length === 0) {
        return 'number_attribute filter must have at least one attribute';
      }
      for (const constraint of filter.numbers) {
        if (constraint.type === 'specific' && constraint.values.length === 0) {
          return 'specific number constraint must have at least one value';
        }
        if (constraint.type === 'range' && constraint.min < 0) {
          return 'range min must be non-negative';
        }
      }
      return null;

    case 'composite':
      if (!filter.filters || filter.filters.length < 2) {
        return 'composite filter must have at least two sub-filters';
      }
      // Recursively validate sub-filters
      for (const subFilter of filter.filters) {
        const error = validateFilter(subFilter);
        if (error) return error;
      }
      return null;

    default:
      return 'unknown filter type';
  }
}
