import { Section } from '@prisma/client';
import { getTerms, getAllClasses, getAllSections } from '../scrapers/functions.js';
import { parseClass } from '../parsers/parsers/main/class.parser.js';
import { parseSection } from '../parsers/parsers/main/section.parser.js';
import { transformClassForDb } from '../transformers/transformers/class.transformer.js';
import { transformSectionForDb } from '../transformers/transformers/section.transformer.js';
import { transformTermForDb } from '../transformers/transformers/term.transformer.js';
import { insertTerm } from '../operations/term.insert.js';
import { insertClasses, deleteStaleClasses } from '../operations/class.insert.js';
import { insertSections, deleteStaleSections, DbSectionWithClass } from '../operations/section.insert.js';
import { getLatestTerm, mapTermToAcademicYear } from './services/term.service.js';
import { geminiSemaphore } from '../services/semaphore.service.js';
import * as logger from '../services/logger.service.js';
import { PipelineResult, success, failure } from './types/pipeline.types.js';

/**
 * Summary of semester ingestion pipeline results
 */
export interface SemesterPipelineSummary {
  academicYearId: number;
  termId: string;
  termName: string;

  classesScraped: number;
  classesParsed: number;
  classesUpserted: number;
  classesDeleted: number;

  sectionsScraped: number;
  sectionsParsed: number;
  sectionsUpserted: number;
  sectionsDeleted: number;

  errors: number;
  duration: number;
}

/**
 * Ingest semester data (classes and sections) for a specific term
 *
 * This pipeline:
 * 1. Scrapes all available terms (or uses provided termId)
 * 2. Determines which academic year the term belongs to
 * 3. Inserts/updates the term record
 * 4. Scrapes all classes and sections for the term (in parallel)
 * 5. Parses classes with AI and sections synchronously
 * 6. Transforms and upserts to database (Term → Classes → Sections)
 * 7. Deletes stale classes/sections not in current scrape
 *
 * @param termId Optional specific term ID to process. If not provided, processes latest term.
 * @returns Pipeline result with summary of operations
 */
export async function ingestSemester(
  termId?: string
): Promise<PipelineResult<SemesterPipelineSummary>> {
  const startTime = Date.now();

  logger.log('Starting semester ingestion pipeline...');
  logger.log('='.repeat(60));

  try {
    // Step 1: Get terms and select which one to process
    logger.log('\n[1/8] Getting terms...');
    const scrapedTerms = await getTerms();
    logger.success(`Scraped ${scrapedTerms.length} available terms`);

    if (scrapedTerms.length === 0) {
      return failure('No terms available to scrape', 'NO_TERMS_FOUND');
    }

    // Select term to process
    let selectedTerm;
    if (termId) {
      selectedTerm = scrapedTerms.find((t) => t.id === termId);
      if (!selectedTerm) {
        return failure(
          `Term with ID ${termId} not found`,
          'TERM_NOT_FOUND',
          { availableTerms: scrapedTerms.map((t) => ({ id: t.id, title: t.title })) }
        );
      }
      logger.log(`Using specified term: ${selectedTerm.title} (${selectedTerm.id})`);
    } else {
      selectedTerm = getLatestTerm(scrapedTerms);
      if (!selectedTerm) {
        return failure('Could not determine latest term', 'LATEST_TERM_FAILED');
      }
      logger.log(`Using latest term: ${selectedTerm.title} (${selectedTerm.id})`);
    }

    // Step 2: Map term to academic year
    logger.log('\n[2/8] Mapping term to academic year...');
    const academicYearResult = await mapTermToAcademicYear(
      selectedTerm.id,
      selectedTerm.title
    );

    if (!academicYearResult.success) {
      return failure(
        'Failed to map term to academic year',
        'ACADEMIC_YEAR_MAPPING_FAILED',
        academicYearResult.error
      );
    }

    const academicYear = academicYearResult.data;
    logger.success(
      `Term ${selectedTerm.title} belongs to academic year: ${academicYear.year} (ID: ${academicYear.id})`
    );

    // Step 3: Insert/update term record
    logger.log('\n[3/8] Inserting term record...');
    const dbTerm = transformTermForDb(selectedTerm, academicYear.id);
    const termInsertResult = await insertTerm(dbTerm);

    if (!termInsertResult.success) {
      return failure(
        'Failed to insert term',
        'TERM_INSERT_FAILED',
        termInsertResult.error
      );
    }

    logger.success(`Term record saved: ${termInsertResult.data.name}`);

    // Step 4: Scrape classes and sections in parallel
    logger.log('\n[4/8] Scraping classes and sections...');

    const [scrapedClasses, scrapedSections] = await Promise.all([
      (async () => {
        const classes = await getAllClasses(selectedTerm, (cls, elapsed) => {
          logger.log(`Scraped class: ${cls.subject} ${cls.abbreviation} (${elapsed}ms)`);
        });
        logger.success(`Scraped ${classes.length} classes`);
        return classes;
      })(),
      (async () => {
        const sections = await getAllSections(selectedTerm, (section, elapsed) => {
          logger.log(`Scraped section: ${section.id} (${elapsed}ms)`);
        });
        logger.success(`Scraped ${sections.length} sections`);
        return sections;
      })(),
    ]);

    if (scrapedClasses.length === 0) {
      logger.warn('No classes found - stopping pipeline');
      return success({
        academicYearId: academicYear.id,
        termId: selectedTerm.id,
        termName: selectedTerm.title,
        classesScraped: 0,
        classesParsed: 0,
        classesUpserted: 0,
        classesDeleted: 0,
        sectionsScraped: scrapedSections.length,
        sectionsParsed: 0,
        sectionsUpserted: 0,
        sectionsDeleted: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Step 5: Parse classes with AI (semaphore-controlled for rate limiting)
    logger.log('\n[5/8] Parsing classes with AI...');
    logger.log(`Using semaphore with limit: ${geminiSemaphore.getState().limit}`);

    const parsedClasses = [];
    let classParseErrors = 0;

    const classParsePromises = scrapedClasses.map((cls, index) =>
      geminiSemaphore.execute(async () => {
        try {
          const parsed = await parseClass(cls);
          logger.log(
            `[${index + 1}/${scrapedClasses.length}] Parsed: ${parsed.subject} ${parsed.abbreviation}`
          );
          return parsed;
        } catch (err) {
          logger.error(`Failed to parse ${cls.subject} ${cls.abbreviation}`, err);
          classParseErrors++;
          return null;
        }
      })
    );

    const classParseResults = await Promise.all(classParsePromises);

    for (const result of classParseResults) {
      if (result !== null) {
        parsedClasses.push(result);
      }
    }

    logger.success(
      `Successfully parsed ${parsedClasses.length}/${scrapedClasses.length} classes (${classParseErrors} errors)`
    );

    if (parsedClasses.length === 0) {
      return failure(
        'All classes failed to parse',
        'PARSE_ALL_FAILED',
        { classParseErrors }
      );
    }

    // Step 6: Parse sections (synchronous, no AI)
    logger.log('\n[6/8] Parsing sections...');

    const parsedSections = [];
    let sectionParseErrors = 0;

    for (const [index, section] of scrapedSections.entries()) {
      try {
        const parsed = parseSection(section);
        parsedSections.push(parsed);
        logger.log(
          `[${index + 1}/${scrapedSections.length}] Parsed section: ${parsed.id}`
        );
      } catch (err) {
        logger.error(`Failed to parse section ${section.id}`, err);
        sectionParseErrors++;
      }
    }

    logger.success(
      `Successfully parsed ${parsedSections.length}/${scrapedSections.length} sections (${sectionParseErrors} errors)`
    );

    // Step 7: Transform and insert classes, then sections
    logger.log('\n[7/8] Transforming and upserting to database...');

    // Transform classes
    const dbClasses = parsedClasses.map((parsed) => transformClassForDb(parsed));

    // Insert classes
    const classInsertResult = await insertClasses(dbClasses);

    if (!classInsertResult.success) {
      return failure(
        'Failed to insert classes',
        'CLASS_INSERT_FAILED',
        classInsertResult.error
      );
    }

    const upsertedClasses = classInsertResult.data;
    logger.success(`Upserted ${upsertedClasses.length} classes to database`);

    // Create mapping from (subject, courseNumber, termId) to classId
    const classIdMap = new Map<string, string>();
    for (const cls of upsertedClasses) {
      const key = `${cls.termId}:${cls.subjectCode}:${cls.courseNumber}`;
      classIdMap.set(key, cls.classId);
    }

    // Transform sections with classId
    const dbSections: DbSectionWithClass[] = [];
    let sectionMappingErrors = 0;

    for (const [index, parsed] of parsedSections.entries()) {
      try {
        const transformed = transformSectionForDb(parsed);

        // Find the corresponding class from the scraped section data
        const scrapedSection = scrapedSections[index];
        const classKey = `${selectedTerm.id}:${scrapedSection.class.subject}:${scrapedSection.class.abbreviation}`;
        const classId = classIdMap.get(classKey);

        if (!classId) {
          logger.warn(
            `Could not find classId for section ${parsed.id} (class: ${scrapedSection.class.subject} ${scrapedSection.class.abbreviation})`
          );
          sectionMappingErrors++;
          continue;
        }

        dbSections.push({
          ...transformed,
          classId,
        });
      } catch (err) {
        logger.error(`Failed to transform section ${parsed.id}`, err);
        sectionMappingErrors++;
      }
    }

    logger.log(
      `Prepared ${dbSections.length} sections for insertion (${sectionMappingErrors} mapping errors)`
    );

    // Insert sections
    let upsertedSections: Section[] = [];
    if (dbSections.length > 0) {
      const sectionInsertResult = await insertSections(dbSections);

      if (!sectionInsertResult.success) {
        return failure(
          'Failed to insert sections',
          'SECTION_INSERT_FAILED',
          sectionInsertResult.error
        );
      }

      upsertedSections = sectionInsertResult.data;
      logger.success(`Upserted ${upsertedSections.length} sections to database`);
    }

    // Step 8: Clean up stale data
    logger.log('\n[8/8] Cleaning up stale data...');

    const scrapedClassIds = upsertedClasses.map((c) => c.classId);
    const deleteClassResult = await deleteStaleClasses(
      selectedTerm.id,
      scrapedClassIds
    );

    if (!deleteClassResult.success) {
      logger.warn(`Failed to delete stale classes: ${deleteClassResult.error.message}`);
    }

    const deletedClassCount = deleteClassResult.success ? deleteClassResult.data : 0;

    const scrapedSectionIds = upsertedSections.map((s) => s.sectionId);
    const deleteSectionResult = await deleteStaleSections(
      selectedTerm.id,
      scrapedSectionIds
    );

    if (!deleteSectionResult.success) {
      logger.warn(`Failed to delete stale sections: ${deleteSectionResult.error.message}`);
    }

    const deletedSectionCount = deleteSectionResult.success
      ? deleteSectionResult.data
      : 0;

    // Final summary
    const duration = Date.now() - startTime;
    const summary: SemesterPipelineSummary = {
      academicYearId: academicYear.id,
      termId: selectedTerm.id,
      termName: selectedTerm.title,
      classesScraped: scrapedClasses.length,
      classesParsed: parsedClasses.length,
      classesUpserted: upsertedClasses.length,
      classesDeleted: deletedClassCount,
      sectionsScraped: scrapedSections.length,
      sectionsParsed: parsedSections.length,
      sectionsUpserted: upsertedSections.length,
      sectionsDeleted: deletedSectionCount,
      errors: classParseErrors + sectionParseErrors + sectionMappingErrors,
      duration,
    };

    logger.log('\n' + '='.repeat(60));
    logger.success('SEMESTER INGESTION COMPLETE');
    logger.log('='.repeat(60));
    logger.log(`Term: ${summary.termName} (${summary.termId})`);
    logger.log(`Academic Year ID: ${summary.academicYearId}`);
    logger.log('');
    logger.log('Classes:');
    logger.log(`  Scraped: ${summary.classesScraped}`);
    logger.log(`  Parsed: ${summary.classesParsed}`);
    logger.log(`  Upserted: ${summary.classesUpserted}`);
    logger.log(`  Deleted: ${summary.classesDeleted}`);
    logger.log('');
    logger.log('Sections:');
    logger.log(`  Scraped: ${summary.sectionsScraped}`);
    logger.log(`  Parsed: ${summary.sectionsParsed}`);
    logger.log(`  Upserted: ${summary.sectionsUpserted}`);
    logger.log(`  Deleted: ${summary.sectionsDeleted}`);
    logger.log('');
    logger.log(`Total Errors: ${summary.errors}`);
    logger.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    logger.log('='.repeat(60));

    return success(summary);
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Semester ingestion failed', err);
    logger.log(`Duration before failure: ${(duration / 1000).toFixed(2)}s`);

    return failure(
      'Semester ingestion pipeline failed',
      'PIPELINE_FAILED',
      err
    );
  }
}
