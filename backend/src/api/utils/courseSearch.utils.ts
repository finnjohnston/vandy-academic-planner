import { Prisma } from '@prisma/client';
import {
  SUBJECT_CODES,
  isValidSubjectCode,
  getSubjectCodeByName,
  getSubjectsByPrefix,
} from '../constants/subjects.js';

/**
 * Search pattern types with precedence (most specific to least specific)
 */
export type SearchPatternType =
  | 'full_code' // "CS 1101", "CS-1101", "CS1101"
  | 'subject_exact' // "CS", "MATH"
  | 'number_exact' // "1101", "2201"
  | 'partial_code' // "CS 11", "MATH 24"
  | 'subject_prefix' // "C", "CH"
  | 'subject_name' // "Computer Science", "Comp"
  | 'title_search'; // "intro programming", "data structures"

/**
 * Parsed search pattern with extracted components
 */
export interface SearchPattern {
  type: SearchPatternType;
  subjectCode?: string;
  subjectCodes?: string[]; // For prefix matching
  courseNumber?: string;
  searchTerms?: string[]; // For title search
}

/**
 * Parse a search query string and determine its search pattern
 * Patterns are checked in order of precedence (most specific to least)
 *
 * @param query - The search query string
 * @returns Parsed search pattern with type and extracted components
 */
export function parseSearchQuery(query: string): SearchPattern {
  if (!query || query.trim().length === 0) {
    return { type: 'title_search', searchTerms: [] };
  }

  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();

  // 1. Full Course Code Pattern: "CS 1101", "CS-1101", "CS1101"
  const fullCodeMatch = trimmed.match(/^([A-Z]{2,6})[\s-]?(\d{3,4}[A-Z]?)$/i);
  if (fullCodeMatch) {
    return {
      type: 'full_code',
      subjectCode: fullCodeMatch[1].toUpperCase(),
      courseNumber: fullCodeMatch[2].toUpperCase(),
    };
  }

  // 2. Exact Subject Code: "CS", "MATH"
  if (upper.length >= 2 && upper.length <= 6 && isValidSubjectCode(upper)) {
    return {
      type: 'subject_exact',
      subjectCode: upper,
    };
  }

  // 3. Exact Course Number: "1101", "2201"
  if (/^\d{3,4}[A-Z]?$/.test(upper)) {
    return {
      type: 'number_exact',
      courseNumber: upper,
    };
  }

  // 4. Partial Course Code: "CS 11", "MATH 24"
  const partialCodeMatch = trimmed.match(/^([A-Z]{2,6})[\s-]?(\d{1,3})$/i);
  if (partialCodeMatch) {
    const subj = partialCodeMatch[1].toUpperCase();
    const num = partialCodeMatch[2];
    if (isValidSubjectCode(subj)) {
      return {
        type: 'partial_code',
        subjectCode: subj,
        courseNumber: num, // Will use LIKE with this prefix
      };
    }
  }

  // 5. Subject Code Prefix: "C", "CH" (only if results in matches)
  if (trimmed.length < 5 && /^[A-Z]+$/i.test(trimmed)) {
    const prefixMatches = getSubjectsByPrefix(upper);
    if (prefixMatches.length > 0) {
      return {
        type: 'subject_prefix',
        subjectCodes: prefixMatches,
      };
    }
  }

  // 6. Subject Name: "Computer Science", "mathematics"
  const subjectCode = getSubjectCodeByName(trimmed);
  if (subjectCode) {
    return {
      type: 'subject_name',
      subjectCode,
    };
  }

  // 7. Title Search (default fallback): "intro programming", "data structures"
  // Split into search terms, filter out very short words
  const terms = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return {
    type: 'title_search',
    searchTerms: terms,
  };
}

/**
 * Build Prisma where clause for Course model based on search pattern
 *
 * @param pattern - Parsed search pattern
 * @returns Prisma where clause for Course queries
 */
export function buildCourseFilter(
  pattern: SearchPattern
): Prisma.CourseWhereInput {
  switch (pattern.type) {
    case 'full_code':
      return {
        subjectCode: pattern.subjectCode,
        courseNumber: pattern.courseNumber,
      };

    case 'subject_exact':
      return {
        subjectCode: pattern.subjectCode,
      };

    case 'number_exact':
      return {
        courseNumber: pattern.courseNumber,
      };

    case 'partial_code':
      return {
        subjectCode: pattern.subjectCode,
        courseNumber: {
          startsWith: pattern.courseNumber,
        },
      };

    case 'subject_prefix':
      return {
        subjectCode: {
          in: pattern.subjectCodes,
        },
      };

    case 'subject_name':
      return {
        subjectCode: pattern.subjectCode,
      };

    case 'title_search':
      // All search terms must be present in the title (AND logic)
      if (!pattern.searchTerms || pattern.searchTerms.length === 0) {
        return {};
      }
      return {
        AND: pattern.searchTerms.map((term) => ({
          title: {
            contains: term,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        })),
      };

    default:
      return {};
  }
}

/**
 * Build Prisma where clause for Class model based on search pattern
 * Same logic as buildCourseFilter but for Class table
 *
 * @param pattern - Parsed search pattern
 * @returns Prisma where clause for Class queries
 */
export function buildClassFilter(
  pattern: SearchPattern
): Prisma.ClassWhereInput {
  switch (pattern.type) {
    case 'full_code':
      return {
        subjectCode: pattern.subjectCode,
        courseNumber: pattern.courseNumber,
      };

    case 'subject_exact':
      return {
        subjectCode: pattern.subjectCode,
      };

    case 'number_exact':
      return {
        courseNumber: pattern.courseNumber,
      };

    case 'partial_code':
      return {
        subjectCode: pattern.subjectCode,
        courseNumber: {
          startsWith: pattern.courseNumber,
        },
      };

    case 'subject_prefix':
      return {
        subjectCode: {
          in: pattern.subjectCodes,
        },
      };

    case 'subject_name':
      return {
        subjectCode: pattern.subjectCode,
      };

    case 'title_search':
      // All search terms must be present in the title (AND logic)
      if (!pattern.searchTerms || pattern.searchTerms.length === 0) {
        return {};
      }
      return {
        AND: pattern.searchTerms.map((term) => ({
          title: {
            contains: term,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        })),
      };

    default:
      return {};
  }
}
