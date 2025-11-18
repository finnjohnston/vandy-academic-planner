import { ParsedCatalogCourse } from '../../parsers/types/main/parsed.course.type.js';
import { DbCourseInput } from '../types/db.course.input.js';
import { serializeAttributes, serializeRequirements } from '../utils/index.js';

/**
 * Transforms a ParsedCatalogCourse into database-ready format
 * @param parsed The parsed course object from the parser
 * @param academicYearId The academic year ID to associate with this course
 * @returns Database-ready course object
 */
export function transformCourseForDb(
  parsed: ParsedCatalogCourse,
  academicYearId: number
): DbCourseInput {
  return {
    courseId: parsed.id,
    academicYearId: academicYearId,

    subjectCode: parsed.subject,
    courseNumber: parsed.abbreviation,
    title: parsed.name,

    school: parsed.details.school,
    creditsMin: parsed.details.credits.min,
    creditsMax: parsed.details.credits.max,
    typicallyOffered: parsed.details.typicallyOffered,
    description: parsed.details.description,
    attributes: serializeAttributes(parsed.details.attributes),
    requirements: serializeRequirements(parsed.details.requirements),
  };
}
