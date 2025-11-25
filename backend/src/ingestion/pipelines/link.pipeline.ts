import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from './types/pipeline.types.js';
import {
  matchClassesToCourses,
  updateClassCourseLinks,
  getLinkStatistics,
  LinkStatistics,
} from '../operations/course.matcher.js';
import { prisma } from '../services/db.service.js';
import { mapTermToAcademicYear } from './services/term.service.js';

/**
 * Summary of linking operation
 */
export interface LinkPipelineSummary {
  totalClasses: number;
  matched: number;
  unmatched: number;
  updated: number;
  termsProcessed: number;
}

/**
 * Link classes to their corresponding courses based on subject code and course number
 * Can link all classes, classes in a specific term, or classes in a specific academic year
 *
 * @param termId Optional term ID to link classes for a specific term
 * @param year Optional academic year string (e.g., "2024-2025") to link classes for that year
 * @returns Summary of linking operation
 */
export async function linkCoursesToClasses(
  termId?: string,
  year?: string
): Promise<PipelineResult<LinkPipelineSummary>> {
  logger.log('Starting class-to-course linking pipeline...');

  try {
    let academicYearId: number | undefined;
    let termsToProcess: string[] = [];

    // Determine scope of linking operation
    if (termId) {
      // Link classes in a specific term
      logger.log(`Linking classes for term: ${termId}`);
      termsToProcess = [termId];

      // Get term to find its academic year
      const term = await prisma.term.findUnique({
        where: { termId },
        include: { academicYear: true },
      });

      if (!term) {
        return failure(`Term not found: ${termId}`, 'TERM_NOT_FOUND');
      }

      academicYearId = term.academicYearId;
    } else if (year) {
      // Link classes for an academic year
      logger.log(`Linking classes for academic year: ${year}`);

      const academicYear = await prisma.academicYear.findUnique({
        where: { year },
        include: { terms: true },
      });

      if (!academicYear) {
        return failure(
          `Academic year ${year} not found`,
          'ACADEMIC_YEAR_NOT_FOUND'
        );
      }

      academicYearId = academicYear.id;
      termsToProcess = academicYear.terms.map((t) => t.termId);

      logger.log(`Found ${termsToProcess.length} terms in ${year}`);
    } else {
      // Link all classes
      logger.log('Linking all classes in database');

      const terms = await prisma.term.findMany({
        select: { termId: true },
      });

      termsToProcess = terms.map((t) => t.termId);
      logger.log(`Found ${termsToProcess.length} terms total`);
    }

    if (termsToProcess.length === 0) {
      logger.warn('No terms to process');
      return success({
        totalClasses: 0,
        matched: 0,
        unmatched: 0,
        updated: 0,
        termsProcessed: 0,
      });
    }

    // Get initial statistics
    const initialStatsResult = termId
      ? await getLinkStatistics(termId)
      : academicYearId
        ? await getLinkStatistics(undefined, academicYearId)
        : await getLinkStatistics();

    if (!initialStatsResult.success) {
      return initialStatsResult;
    }

    logger.log(
      `Initial state: ${initialStatsResult.data.totalClasses} classes (${initialStatsResult.data.matched} already linked, ${initialStatsResult.data.unmatched} unlinked)`
    );

    // Match classes to courses
    const matchResult = await matchClassesToCourses(termId, academicYearId);
    if (!matchResult.success) {
      return matchResult;
    }

    const matches = matchResult.data;
    const matchedCount = matches.filter((m) => m.courseId !== null).length;
    const unmatchedCount = matches.length - matchedCount;

    logger.log(
      `Matching complete: ${matchedCount} matches found, ${unmatchedCount} orphans`
    );

    // Update class records with course links
    const updateResult = await updateClassCourseLinks(matches);
    if (!updateResult.success) {
      return updateResult;
    }

    const updated = updateResult.data;

    // Get final statistics
    const finalStatsResult = termId
      ? await getLinkStatistics(termId)
      : academicYearId
        ? await getLinkStatistics(undefined, academicYearId)
        : await getLinkStatistics();

    if (!finalStatsResult.success) {
      return finalStatsResult;
    }

    const summary: LinkPipelineSummary = {
      totalClasses: finalStatsResult.data.totalClasses,
      matched: finalStatsResult.data.matched,
      unmatched: finalStatsResult.data.unmatched,
      updated,
      termsProcessed: termsToProcess.length,
    };

    logger.success('Linking pipeline complete');
    logger.log(
      `Final state: ${summary.matched} linked, ${summary.unmatched} unlinked (${summary.updated} records updated)`
    );

    return success(summary);
  } catch (err) {
    logger.error('Linking pipeline failed', err);
    return failure('Linking pipeline failed', 'LINK_PIPELINE_FAILED', err);
  }
}
