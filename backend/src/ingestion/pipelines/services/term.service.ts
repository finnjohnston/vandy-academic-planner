import { AcademicYear } from '@prisma/client';
import { Term } from '../../scrapers/types/term.type.js';
import { getOrCreateAcademicYear } from './academicYear.service.js';
import { PipelineResult, success, failure } from '../types/pipeline.types.js';
import * as logger from '../../services/logger.service.js';

export interface TermInfo {
  semester: 'Fall' | 'Spring';
  year: number;
}

/**
 * Parse term title to extract semester and year information
 *
 * @param title Term title (e.g., "Fall 2024", "Spring 2025")
 * @returns Parsed term information or null if parsing fails
 */
export function parseTermInfo(title: string): TermInfo | null {
  // Common patterns: "Fall 2024", "Spring 2025"
  const match = title.match(/(Fall|Spring)\s+(\d{4})/i);

  if (!match) {
    logger.warn(`Failed to parse term title: ${title}`);
    return null;
  }

  // Normalize semester to title case
  const semesterRaw = match[1].toLowerCase();
  const semester = (semesterRaw.charAt(0).toUpperCase() + semesterRaw.slice(1)) as 'Fall' | 'Spring';
  const year = parseInt(match[2], 10);

  return { semester, year };
}

/**
 * Determine which academic year a term belongs to based on semester and year
 *
 * Academic year mapping:
 * - Fall YYYY → YYYY-(YYYY+1) academic year
 * - Spring YYYY → (YYYY-1)-YYYY academic year
 *
 * @param termInfo Parsed term information
 * @returns Academic year string (e.g., "2024-2025")
 */
export function determineAcademicYear(termInfo: TermInfo): {
  year: string;
  start: number;
  end: number;
} {
  const { semester, year } = termInfo;

  if (semester === 'Fall') {
    // Fall 2024 → 2024-2025
    return {
      year: `${year}-${year + 1}`,
      start: year,
      end: year + 1,
    };
  } else {
    // Spring 2025 → 2024-2025
    return {
      year: `${year - 1}-${year}`,
      start: year - 1,
      end: year,
    };
  }
}

/**
 * Map a term to its academic year, creating the academic year if it doesn't exist
 *
 * @param termId Term ID from YES system
 * @param termName Term display name (e.g., "Fall 2024")
 * @returns The academic year the term belongs to
 */
export async function mapTermToAcademicYear(
  termId: string,
  termName: string
): Promise<PipelineResult<AcademicYear>> {
  logger.log(`Mapping term ${termId} (${termName}) to academic year`);

  // Parse term information
  const termInfo = parseTermInfo(termName);

  if (!termInfo) {
    return failure(
      `Failed to parse term name: ${termName}`,
      'TERM_PARSE_FAILED',
      { termId, termName }
    );
  }

  // Determine academic year
  const { year, start, end } = determineAcademicYear(termInfo);

  logger.log(
    `Term ${termName} belongs to academic year ${year} (${termInfo.semester} ${termInfo.year})`
  );

  // Get or create the academic year
  const result = await getOrCreateAcademicYear(year);

  if (!result.success) {
    return failure(
      `Failed to get or create academic year ${year}`,
      'ACADEMIC_YEAR_FAILED',
      result.error
    );
  }

  return success(result.data);
}

/**
 * Get the latest term from a list of scraped terms
 * Assumes terms are ordered chronologically or uses heuristic to find most recent
 *
 * @param terms Array of scraped terms
 * @returns The most recent term
 */
export function getLatestTerm(terms: Term[]): Term | null {
  if (terms.length === 0) {
    logger.warn('No terms provided to getLatestTerm');
    return null;
  }

  // Parse all terms and find the one with the latest semester/year
  let latestTerm: Term | null = null;
  let latestScore = -1;

  for (const term of terms) {
    const termInfo = parseTermInfo(term.title);

    if (!termInfo) {
      continue;
    }

    // Calculate a score: year * 10 + semester priority
    // Fall = 2, Spring = 1
    const semesterPriority = {
      Fall: 2,
      Spring: 1,
    }[termInfo.semester];

    const score = termInfo.year * 10 + semesterPriority;

    if (score > latestScore) {
      latestScore = score;
      latestTerm = term;
    }
  }

  if (!latestTerm) {
    logger.warn('Could not determine latest term from provided list');
    return null;
  }

  logger.log(`Latest term: ${latestTerm.title} (ID: ${latestTerm.id})`);
  return latestTerm;
}
