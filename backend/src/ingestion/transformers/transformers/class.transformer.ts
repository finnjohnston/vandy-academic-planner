import { ParsedSemesterClass } from '../../parsers/types/main/parsed.class.type.js';
import { DbClassInput } from '../types/db.class.input.js';
import { serializeAttributes, serializeRequirements } from '../utils/index.js';

/**
 * Transforms a ParsedSemesterClass into database-ready format
 * @param parsed The parsed class object from the parser
 * @returns Database-ready class object
 */
export function transformClassForDb(parsed: ParsedSemesterClass): DbClassInput {
  return {
    classId: parsed.id,
    termId: parsed.termId,

    subjectCode: parsed.subject,
    courseNumber: parsed.abbreviation,
    title: parsed.name,

    school: parsed.details.school,
    creditsMin: parsed.details.credits.min,
    creditsMax: parsed.details.credits.max,
    description: parsed.details.description,
    attributes: serializeAttributes(parsed.details.attributes),
    requirements: serializeRequirements(parsed.details.requirements),
  };
}
