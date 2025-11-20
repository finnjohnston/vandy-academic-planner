import { getAllCourses } from './ingestion/scrapers/functions.js';
import { parseCourse } from './ingestion/parsers/parsers/main/course.parser.js';
import { transformCourseForDb } from './ingestion/transformers/transformers/course.transformer.js';
import { insertCourses } from './ingestion/operations/course.insert.js';
import { getOrCreateAcademicYear } from './ingestion/pipelines/services/academicYear.service.js';
import { geminiSemaphore } from './ingestion/services/semaphore.service.js';
import * as logger from './ingestion/services/logger.service.js';

/**
 * Test script to run catalog pipeline on CS courses only
 */
async function testCatalogCS() {
  const startTime = Date.now();

  try {
    logger.log('Starting CS catalog ingestion test...');
    logger.log('='.repeat(60));

    // Step 1: Get or create academic year for 2024-2025
    logger.log('\n[1/4] Getting academic year...');
    const academicYearResult = await getOrCreateAcademicYear('2024-2025', 2024, 2025);

    if (!academicYearResult.success) {
      logger.error('Failed to get academic year:', academicYearResult.error);
      process.exit(1);
    }

    const academicYear = academicYearResult.data;
    logger.success(`Using academic year: ${academicYear.year} (ID: ${academicYear.id})`);

    // Step 2: Scrape CS courses only (filtered at source)
    logger.log('\n[2/4] Scraping CS courses from catalog...');
    const csCourses = await getAllCourses((course, elapsed) => {
      logger.log(`Scraped: ${course.subject} ${course.abbreviation} - ${course.name} (${elapsed}ms)`);
    }, 'CS');

    logger.success(`Found ${csCourses.length} CS courses`);

    if (csCourses.length === 0) {
      logger.warn('No CS courses found!');
      process.exit(0);
    }

    // Step 3: Parse CS courses with AI
    logger.log('\n[3/4] Parsing CS courses with AI...');
    logger.log(`Using semaphore with limit: ${geminiSemaphore.getState().limit}`);

    const parsedCourses = [];
    let parseErrors = 0;

    const parsePromises = csCourses.map(async (course, index) => {
      try {
        const parsed = await parseCourse(course);
        logger.log(
          `[${index + 1}/${csCourses.length}] Parsed: ${parsed.subject} ${parsed.abbreviation} - ${parsed.name}`
        );
        return parsed;
      } catch (err) {
        logger.error(`Failed to parse ${course.subject} ${course.abbreviation}`, err);
        parseErrors++;
        return null;
      }
    });

    const parseResults = await Promise.all(parsePromises);

    for (const result of parseResults) {
      if (result !== null) {
        parsedCourses.push(result);
      }
    }

    logger.success(
      `Successfully parsed ${parsedCourses.length}/${csCourses.length} CS courses (${parseErrors} errors)`
    );

    // Step 4: Transform and insert
    logger.log('\n[4/4] Inserting CS courses to database...');

    const dbCourses = parsedCourses.map((parsed) =>
      transformCourseForDb(parsed, academicYear.id)
    );

    const insertResult = await insertCourses(dbCourses);

    if (!insertResult.success) {
      logger.error('Failed to insert courses:', insertResult.error);
      process.exit(1);
    }

    logger.success(`Inserted ${insertResult.data.length} CS courses to database`);

    // Summary
    const duration = Date.now() - startTime;
    logger.log('\n' + '='.repeat(60));
    logger.success('CS CATALOG TEST COMPLETE');
    logger.log('='.repeat(60));
    logger.log(`Academic Year: ${academicYear.year}`);
    logger.log(`CS courses scraped: ${csCourses.length}`);
    logger.log(`CS courses parsed: ${parsedCourses.length}`);
    logger.log(`CS courses inserted: ${insertResult.data.length}`);
    logger.log(`Errors: ${parseErrors}`);
    logger.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    logger.log('='.repeat(60));

    process.exit(0);
  } catch (err) {
    logger.error('Test failed:', err);
    process.exit(1);
  }
}

// Run the test
testCatalogCS();
