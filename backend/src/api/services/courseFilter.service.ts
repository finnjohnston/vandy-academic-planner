import { Course } from '@prisma/client';
import {
  CourseFilter,
  PlaceholderFilter,
  SubjectNumberFilter,
  AttributeFilter,
  CourseListFilter,
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
    case 'placeholder':
      return evaluatePlaceholder(course, filter);
    case 'subject_number':
      return evaluateSubjectNumber(course, filter);
    case 'attribute':
      return evaluateAttribute(course, filter);
    case 'course_list':
      return evaluateCourseList(course, filter);
    case 'composite':
      return evaluateComposite(course, filter);
    default:
      return false;
  }
}

/**
 * Placeholder filter - always matches
 */
function evaluatePlaceholder(course: Course, filter: PlaceholderFilter): boolean {
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

  const attrs = course.attributes as { axle?: string[]; core?: string[] };

  // Step 3: Extract short codes from attribute strings
  const axleShortCodes = attrs.axle ? extractShortCodes(attrs.axle) : [];
  const coreShortCodes = attrs.core ? extractShortCodes(attrs.core) : [];

  // Step 4: Check if any required attribute matches
  const allShortCodes =
    filter.attributeType === 'axle'
      ? axleShortCodes
      : filter.attributeType === 'core'
        ? coreShortCodes
        : [...axleShortCodes, ...coreShortCodes];

  return filter.attributes.some((attr) => allShortCodes.includes(attr));
}

/**
 * Extract short codes from full attribute strings
 * "AXLE: Math and Natural Sciences" → "MNS"
 * "AXLE: Humanities and Creative Arts" → "HCA"
 */
function extractShortCodes(attributes: string[]): string[] {
  const attributeMapping: Record<string, string> = {
    'Math and Natural Sciences': 'MNS',
    'Humanities and Creative Arts': 'HCA',
    'International Cultures': 'INT',
    'History and Culture of the United States': 'US',
    'Social and Behavioral Sciences': 'SBS',
    Perspectives: 'P',
    // CORE mappings
    'B-Systemic & Structural Reasoning': 'B-SSR',
  };

  return attributes.map((attr) => {
    // Extract acronym from parentheses: "Something (ABC)" → "ABC"
    const parenMatch = attr.match(/\(([A-Z-]+)\)/);
    if (parenMatch) return parenMatch[1];

    // Strip "AXLE: " or "CORE: " prefix if present
    let cleanAttr = attr.replace(/^(AXLE|CORE):\s*/, '');

    // Try exact mapping after cleaning
    if (attributeMapping[cleanAttr]) return attributeMapping[cleanAttr];

    // Extract short code after colon: "AXLE: XYZ" → "XYZ"
    const colonMatch = attr.match(/:\s*([A-Z-]+)$/);
    if (colonMatch) return colonMatch[1];

    // Return original if no pattern matches
    return attr;
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
    case 'placeholder':
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
        // OR is less specific: use max but cap at 70
        return Math.min(70, maxScore);
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

  if (filter.type === 'placeholder') {
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
    case 'placeholder':
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
