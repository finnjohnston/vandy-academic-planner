import { Term } from '../../scrapers/types/term.type.js';
import { DbTermInput } from '../types/db.term.input.js';
import { normalizeTermName } from '../../pipelines/services/term.service.js';

/**
 * Transform a scraped term into database input format
 *
 * @param term Scraped term from YES system
 * @param academicYearId The academic year this term belongs to
 * @returns Database-ready term input
 */
export function transformTermForDb(
  term: Term,
  academicYearId: number
): DbTermInput {
  return {
    termId: term.id,
    academicYearId,
    name: normalizeTermName(term.title),
  };
}
