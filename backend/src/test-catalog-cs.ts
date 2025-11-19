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

    // Step 2: Scrape all courses and filter to CS only
    logger.log('\n[2/4] Scraping courses from catalog...');
    const allCourses = await getAllCourses((course, elapsed) => {
      if (course.subject === 'CS') {
        logger.log(`Scraped: ${course.subject} ${course.abbreviation} - ${course.name} (${elapsed}ms)`);
      }
    });

    const csCourses = allCourses.filter(course => course.subject === 'CS');
    logger.success(`Found ${csCourses.length} CS courses (out of ${allCourses.length} total)`);

    if (csCourses.length === 0) {
      logger.warn('No CS courses found!');
      process.exit(0);
    }

    // Validation: Ensure CS courses are actually Computer Science courses
    logger.log('\nValidating CS courses are Computer Science (not Communication Studies)...');

    // Keywords that indicate Communication Studies courses (not CS)
    const cmstKeywords = [
      'communication', 'rhetoric', 'speaking', 'debate', 'argumentation',
      'media', 'advocacy', 'social movements', 'civic life'
    ];

    // Keywords that indicate Computer Science courses
    const csKeywords = [
      'programming', 'algorithm', 'data structure', 'software', 'computing',
      'computer', 'code', 'python', 'java', 'web', 'database', 'network'
    ];

    const suspiciousCourses = [];
    const confirmedCSCourses = [];

    for (const course of csCourses) {
      const nameAndDesc = `${course.name} ${course.details.description || ''}`.toLowerCase();

      // Check if course looks like Communication Studies
      const hasCmstKeyword = cmstKeywords.some(keyword => nameAndDesc.includes(keyword));
      const hasCSKeyword = csKeywords.some(keyword => nameAndDesc.includes(keyword));

      if (hasCmstKeyword && !hasCSKeyword) {
        suspiciousCourses.push(course);
        logger.warn(
          `⚠️  Suspicious: ${course.subject} ${course.abbreviation} - ${course.name} ` +
          `(may be Communication Studies)`
        );
      } else if (hasCSKeyword) {
        confirmedCSCourses.push(course);
      }
    }

    if (suspiciousCourses.length > 0) {
      logger.error(
        `\n❌ VALIDATION FAILED: Found ${suspiciousCourses.length} courses that appear to be ` +
        `Communication Studies but are labeled as CS!`
      );
      logger.log('\nSuspicious courses:');
      suspiciousCourses.forEach(course => {
        logger.log(`  - ${course.subject} ${course.abbreviation}: ${course.name}`);
      });
      logger.error('\nThis indicates the subject code extraction bug is still present.');
      process.exit(1);
    }

    logger.success(
      `✓ Validation passed: All ${confirmedCSCourses.length} CS courses appear to be Computer Science courses`
    );

    // Additional validation: Check for any CMST courses mislabeled as CS
    const cmstCourses = allCourses.filter(course => course.subject === 'CMST');
    logger.log(`\nFound ${cmstCourses.length} CMST (Communication Studies) courses - these should be separate from CS`);

    if (cmstCourses.length > 0) {
      logger.log('Sample CMST courses:');
      cmstCourses.slice(0, 3).forEach(course => {
        logger.log(`  - ${course.subject} ${course.abbreviation}: ${course.name}`);
      });
    }

    // Step 3: Parse CS courses with AI
    logger.log('\n[3/4] Parsing CS courses with AI...');
    logger.log(`Using semaphore with limit: ${geminiSemaphore.getState().limit}`);

    const parsedCourses = [];
    let parseErrors = 0;

    const parsePromises = csCourses.map((course, index) =>
      geminiSemaphore.execute(async () => {
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
      })
    );

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
    logger.log(`Total courses scraped: ${allCourses.length}`);
    logger.log(`CS courses found: ${csCourses.length}`);
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
