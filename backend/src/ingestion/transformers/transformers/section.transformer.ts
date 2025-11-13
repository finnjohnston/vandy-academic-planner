import { ParsedSection } from '../../parsers/types/main/parsed.section.type.js';
import { DbSectionInput } from '../types/db.section.input.js';
import { serializeSchedule, serializeInstructors } from '../utils/index.js';

/**
 * Transforms a ParsedSection into database-ready format
 * Note: classId (foreign key to Class table) should be added during DB insertion
 * @param parsed The parsed section object from the parser
 * @returns Database-ready section object (without classId)
 */
export function transformSectionForDb(parsed: ParsedSection): DbSectionInput {
  return {
    sectionId: parsed.id,
    termId: parsed.term,

    sectionNumber: parsed.number,
    sectionType: parsed.type,

    instructors: serializeInstructors(parsed.instructors),
    schedule: serializeSchedule(parsed.schedule),
    creditsMin: parsed.credits.min,
    creditsMax: parsed.credits.max
  };
}
