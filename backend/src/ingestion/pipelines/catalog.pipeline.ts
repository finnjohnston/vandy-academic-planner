import { getAllCourses } from '../scrapers/functions.js';
import { parseCourse } from '../parsers/parsers/main/course.parser.js';
import { transformCourseForDb } from '../transformers/transformers/course.transformer.js';
import { insertCourses } from '../operations/course.insert.js';
import { getOrCreateAcademicYear } from './services/academicYear.service.js';
import { prisma } from '../services/db.service.js';
import { geminiSemaphore } from '../services/semaphore.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from './types/pipeline.types.js';

/**
 * Summary of catalog ingestion pipeline results
 */
export interface CatalogPipelineSummary {
  academicYearId: number;
  academicYear: string;
  scraped: number;
  parsed: number;
  upserted: number;
  deleted: number;
  errors: number;
  duration: number; // milliseconds
}

/**
 * Ingest the entire course catalog for a given academic year
 *
 * This pipeline:
 * 1. Scrapes all courses from the catalog
 * 2. Parses course data using AI (with semaphore-controlled concurrency)
 * 3. Transforms and upserts courses to the database
 * 4. Deletes courses that exist in DB but not in the current catalog (hard delete)
 *
 * @param year Academic year string (e.g., "2024-2025")
 * @returns Pipeline result with summary of operations
 */
export async function ingestCatalog(
  year: string
): Promise<PipelineResult<CatalogPipelineSummary>> {
  const startTime = Date.now();

  logger.log(`Starting catalog ingestion for academic year: ${year}`);
  logger.log('='.repeat(60));

  try {
    // Step 1: Get or create academic year
    logger.log('\n[1/5] Getting or creating academic year...');
    const academicYearResult = await getOrCreateAcademicYear(year);

    if (!academicYearResult.success) {
      return failure(
        'Failed to get/create academic year',
        'ACADEMIC_YEAR_FAILED',
        academicYearResult.error
      );
    }

    const academicYear = academicYearResult.data;
    logger.success(`Using academic year: ${academicYear.year} (ID: ${academicYear.id})`);

    // Step 2: Scrape all courses from catalog
    logger.log('\n[2/5] Scraping courses from catalog...');
    const scrapedCourses = await getAllCourses((course, elapsed) => {
      logger.log(`Scraped: ${course.subject} ${course.abbreviation} - ${course.name} (${elapsed}ms)`);
    });
    logger.success(`Scraped ${scrapedCourses.length} courses from catalog`);

    if (scrapedCourses.length === 0) {
      logger.warn('No courses found in catalog - stopping pipeline');
      return success({
        academicYearId: academicYear.id,
        academicYear: academicYear.year,
        scraped: 0,
        parsed: 0,
        upserted: 0,
        deleted: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Step 3: Parse courses with AI (semaphore-controlled for rate limiting)
    logger.log('\n[3/5] Parsing courses with AI...');
    logger.log(`Using semaphore with limit: ${geminiSemaphore.getState().limit}`);

    const parsedCourses = [];
    let parseErrors = 0;

    // Parse courses with controlled concurrency
    const parsePromises = scrapedCourses.map(async (course, index) => {
      try {
        const parsed = await parseCourse(course);
        logger.log(
          `[${index + 1}/${scrapedCourses.length}] Parsed: ${parsed.subject} ${parsed.abbreviation}`
        );
        return parsed;
      } catch (err) {
        logger.error(
          `Failed to parse ${course.subject} ${course.abbreviation}`,
          err
        );
        parseErrors++;
        return null;
      }
    });

    const parseResults = await Promise.all(parsePromises);

    // Filter out null results (failed parses)
    for (const result of parseResults) {
      if (result !== null) {
        parsedCourses.push(result);
      }
    }

    logger.success(
      `Successfully parsed ${parsedCourses.length}/${scrapedCourses.length} courses (${parseErrors} errors)`
    );

    if (parsedCourses.length === 0) {
      logger.error('All courses failed to parse - stopping pipeline');
      return failure(
        'All courses failed to parse',
        'PARSE_ALL_FAILED',
        { parseErrors }
      );
    }

    // Step 4: Transform and upsert to database
    logger.log('\n[4/5] Transforming and upserting courses to database...');

    const dbCourses = parsedCourses.map((parsed) =>
      transformCourseForDb(parsed, academicYear.id)
    );

    const insertResult = await insertCourses(dbCourses);

    if (!insertResult.success) {
      return failure(
        'Failed to insert courses',
        'INSERT_FAILED',
        insertResult.error
      );
    }

    const upsertedCourses = insertResult.data;
    logger.success(`Upserted ${upsertedCourses.length} courses to database`);

    // Step 5: Hard delete courses not in current catalog
    logger.log('\n[5/5] Cleaning up deleted courses...');

    // Track which courses were scraped (by subject + abbreviation)
    const scrapedCourseKeys = new Set(
      parsedCourses.map(c => `${c.subject}:${c.abbreviation}`)
    );

    // Get all catalog courses in DB for this academic year
    const dbCoursesForYear = await prisma.course.findMany({
      where: {
        academicYearId: academicYear.id,
        isCatalogCourse: true,
      },
      select: {
        id: true,
        subjectCode: true,
        courseNumber: true,
      },
    });

    // Find courses to delete (in DB but not in scraped catalog)
    const coursesToDelete = dbCoursesForYear.filter(
      (dbCourse) => !scrapedCourseKeys.has(`${dbCourse.subjectCode}:${dbCourse.courseNumber}`)
    );

    let deletedCount = 0;
    if (coursesToDelete.length > 0) {
      logger.warn(`Found ${coursesToDelete.length} courses to delete (no longer in catalog)`);

      for (const course of coursesToDelete) {
        logger.warn(`Deleting: ${course.subjectCode} ${course.courseNumber}`);
      }

      const deleteResult = await prisma.course.deleteMany({
        where: {
          id: {
            in: coursesToDelete.map(c => c.id),
          },
        },
      });

      deletedCount = deleteResult.count;
      logger.success(`Deleted ${deletedCount} courses from database`);
    } else {
      logger.log('No courses to delete (all DB courses exist in catalog)');
    }

    // Final summary
    const duration = Date.now() - startTime;
    const summary: CatalogPipelineSummary = {
      academicYearId: academicYear.id,
      academicYear: academicYear.year,
      scraped: scrapedCourses.length,
      parsed: parsedCourses.length,
      upserted: upsertedCourses.length,
      deleted: deletedCount,
      errors: parseErrors,
      duration,
    };

    logger.log('\n' + '='.repeat(60));
    logger.success('CATALOG INGESTION COMPLETE');
    logger.log('='.repeat(60));
    logger.log(`Academic Year: ${summary.academicYear} (ID: ${summary.academicYearId})`);
    logger.log(`Scraped: ${summary.scraped} courses`);
    logger.log(`Parsed: ${summary.parsed} courses`);
    logger.log(`Upserted: ${summary.upserted} courses`);
    logger.log(`Deleted: ${summary.deleted} courses`);
    logger.log(`Errors: ${summary.errors}`);
    logger.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    logger.log('='.repeat(60));

    return success(summary);
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Catalog ingestion failed', err);
    logger.log(`Duration before failure: ${(duration / 1000).toFixed(2)}s`);

    return failure(
      'Catalog ingestion pipeline failed',
      'PIPELINE_FAILED',
      err
    );
  }
}