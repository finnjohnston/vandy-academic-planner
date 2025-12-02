import { describe, it, expect } from 'vitest';
import { transformTermForDb } from '../../../src/ingestion/transformers/transformers/term.transformer.js';
import { Term } from '../../../src/ingestion/scrapers/types/term.type.js';
import { DbTermInput } from '../../../src/ingestion/transformers/types/db.term.input.js';

describe('Term Transformer - transformTermForDb', () => {
  it('should transform a scraped term to database format', () => {
    const scrapedTerm: Term = {
      id: '1248',
      title: 'Fall 2024',
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 1);

    expect(result).toEqual({
      termId: '1248',
      academicYearId: 1,
      name: 'Fall 2024',
    });
  });

  it('should handle different term IDs', () => {
    const scrapedTerm: Term = {
      id: '1249',
      title: 'Spring 2025',
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 2);

    expect(result).toEqual({
      termId: '1249',
      academicYearId: 2,
      name: 'Spring 2025',
    });
  });

  it('should preserve exact term name', () => {
    const scrapedTerm: Term = {
      id: 'CUSTOM_ID_123',
      title: 'Summer Session 2024 - Extended',
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 5);

    expect(result).toEqual({
      termId: 'CUSTOM_ID_123',
      academicYearId: 5,
      name: 'Summer Session 2024 - Extended',
    });
  });

  it('should handle numeric-like IDs as strings', () => {
    const scrapedTerm: Term = {
      id: '202401',
      title: 'Fall 2024',
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 10);

    expect(result).toEqual({
      termId: '202401',
      academicYearId: 10,
      name: 'Fall 2024',
    });
    expect(typeof result.termId).toBe('string');
  });

  it('should handle special characters in title', () => {
    const scrapedTerm: Term = {
      id: '1248',
      title: 'Fall 2024 (Semester I)',
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 1);

    expect(result).toEqual({
      termId: '1248',
      academicYearId: 1,
      name: 'Fall 2024 (Semester I)',
    });
  });

  it('should handle terms with sessions property (optional in Term type)', () => {
    const scrapedTerm: Term = {
      id: '1248',
      title: 'Fall 2024',
      sessions: [
        {
          id: 'session1',
          titleShort: 'FS24',
          titleLong: 'Fall Semester 2024',
        },
      ],
    };

    const result: DbTermInput = transformTermForDb(scrapedTerm, 1);

    // Sessions should not be included in DB input (not part of schema)
    expect(result).toEqual({
      termId: '1248',
      academicYearId: 1,
      name: 'Fall 2024',
    });
  });

  it('should maintain referential integrity with academic year ID', () => {
    const scrapedTerm: Term = {
      id: '1248',
      title: 'Fall 2024',
    };

    const academicYearId = 42;
    const result: DbTermInput = transformTermForDb(scrapedTerm, academicYearId);

    expect(result.academicYearId).toBe(academicYearId);
    expect(typeof result.academicYearId).toBe('number');
  });
});
