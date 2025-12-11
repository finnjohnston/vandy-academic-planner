import { describe, it, expect } from 'vitest';
import {
  parseSearchQuery,
  buildCourseFilter,
  buildClassFilter,
} from '../../../src/api/utils/courseSearch.utils.js';

describe('courseSearch.utils', () => {
  describe('parseSearchQuery', () => {
    it('should parse full course code with space (CS 1101)', () => {
      const result = parseSearchQuery('CS 1101');
      expect(result.type).toBe('full_code');
      expect(result.subjectCode).toBe('CS');
      expect(result.courseNumber).toBe('1101');
    });

    it('should parse full course code with hyphen (CS-1101)', () => {
      const result = parseSearchQuery('CS-1101');
      expect(result.type).toBe('full_code');
      expect(result.subjectCode).toBe('CS');
      expect(result.courseNumber).toBe('1101');
    });

    it('should parse full course code without separator (CS1101)', () => {
      const result = parseSearchQuery('CS1101');
      expect(result.type).toBe('full_code');
      expect(result.subjectCode).toBe('CS');
      expect(result.courseNumber).toBe('1101');
    });

    it('should parse exact subject code (CS)', () => {
      const result = parseSearchQuery('CS');
      expect(result.type).toBe('subject_exact');
      expect(result.subjectCode).toBe('CS');
    });

    it('should parse exact subject code case insensitive (cs)', () => {
      const result = parseSearchQuery('cs');
      expect(result.type).toBe('subject_exact');
      expect(result.subjectCode).toBe('CS');
    });

    it('should parse exact course number (1101)', () => {
      const result = parseSearchQuery('1101');
      expect(result.type).toBe('number_exact');
      expect(result.courseNumber).toBe('1101');
    });

    it('should parse partial course code (CS 11)', () => {
      const result = parseSearchQuery('CS 11');
      expect(result.type).toBe('partial_code');
      expect(result.subjectCode).toBe('CS');
      expect(result.courseNumber).toBe('11');
    });

    it('should parse partial course code with hyphen (MATH-2)', () => {
      const result = parseSearchQuery('MATH-2');
      expect(result.type).toBe('partial_code');
      expect(result.subjectCode).toBe('MATH');
      expect(result.courseNumber).toBe('2');
    });

    it('should parse subject code prefix (C)', () => {
      const result = parseSearchQuery('C');
      expect(result.type).toBe('subject_prefix');
      expect(result.subjectCodes).toBeDefined();
      expect(result.subjectCodes?.length).toBeGreaterThan(0);
      // Should include codes like CS, CHEM, CHIN, etc.
      expect(result.subjectCodes).toContain('CS');
      expect(result.subjectCodes).toContain('CHEM');
    });

    it('should parse subject code prefix (CH)', () => {
      const result = parseSearchQuery('CH');
      expect(result.type).toBe('subject_prefix');
      expect(result.subjectCodes).toBeDefined();
      // Should include CHEM, CHIN, CHBE, CHRK, CHEB
      expect(result.subjectCodes).toContain('CHEM');
      expect(result.subjectCodes).toContain('CHIN');
    });

    it('should parse subject name (Computer Science)', () => {
      const result = parseSearchQuery('Computer Science');
      expect(result.type).toBe('subject_name');
      expect(result.subjectCode).toBe('CS');
    });

    it('should parse subject name case insensitive (computer science)', () => {
      const result = parseSearchQuery('computer science');
      expect(result.type).toBe('subject_name');
      expect(result.subjectCode).toBe('CS');
    });

    it('should parse subject name (Mathematics)', () => {
      const result = parseSearchQuery('Mathematics');
      expect(result.type).toBe('subject_name');
      expect(result.subjectCode).toBe('MATH');
    });

    it('should fall back to title search for unknown input', () => {
      const result = parseSearchQuery('intro programming');
      expect(result.type).toBe('title_search');
      expect(result.searchTerms).toEqual(['intro', 'programming']);
    });

    it('should fall back to title search for single word', () => {
      const result = parseSearchQuery('introduction');
      expect(result.type).toBe('title_search');
      expect(result.searchTerms).toEqual(['introduction']);
    });

    it('should handle empty string as title search', () => {
      const result = parseSearchQuery('');
      expect(result.type).toBe('title_search');
      expect(result.searchTerms).toEqual([]);
    });

    it('should trim whitespace in queries', () => {
      const result = parseSearchQuery('  CS 1101  ');
      expect(result.type).toBe('full_code');
      expect(result.subjectCode).toBe('CS');
      expect(result.courseNumber).toBe('1101');
    });
  });

  describe('buildCourseFilter', () => {
    it('should build filter for full course code', () => {
      const pattern = { type: 'full_code' as const, subjectCode: 'CS', courseNumber: '1101' };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
        courseNumber: '1101',
      });
    });

    it('should build filter for exact subject code', () => {
      const pattern = { type: 'subject_exact' as const, subjectCode: 'CS' };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
      });
    });

    it('should build filter for exact course number', () => {
      const pattern = { type: 'number_exact' as const, courseNumber: '1101' };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        courseNumber: '1101',
      });
    });

    it('should build filter for partial course code', () => {
      const pattern = { type: 'partial_code' as const, subjectCode: 'CS', courseNumber: '11' };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
        courseNumber: { startsWith: '11' },
      });
    });

    it('should build filter for subject prefix', () => {
      const pattern = { type: 'subject_prefix' as const, subjectCodes: ['CS', 'CHEM', 'CHIN'] };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        subjectCode: { in: ['CS', 'CHEM', 'CHIN'] },
      });
    });

    it('should build filter for subject name', () => {
      const pattern = { type: 'subject_name' as const, subjectCode: 'CS' };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
      });
    });

    it('should build filter for title search with single term', () => {
      const pattern = { type: 'title_search' as const, searchTerms: ['programming'] };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        AND: [
          { title: { contains: 'programming', mode: 'insensitive' } },
        ],
      });
    });

    it('should build filter for title search with multiple terms', () => {
      const pattern = { type: 'title_search' as const, searchTerms: ['intro', 'programming'] };
      const filter = buildCourseFilter(pattern);
      expect(filter).toEqual({
        AND: [
          { title: { contains: 'intro', mode: 'insensitive' } },
          { title: { contains: 'programming', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('buildClassFilter', () => {
    it('should build filter for full course code', () => {
      const pattern = { type: 'full_code' as const, subjectCode: 'CS', courseNumber: '1101' };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
        courseNumber: '1101',
      });
    });

    it('should build filter for exact subject code', () => {
      const pattern = { type: 'subject_exact' as const, subjectCode: 'CS' };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
      });
    });

    it('should build filter for exact course number', () => {
      const pattern = { type: 'number_exact' as const, courseNumber: '1101' };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        courseNumber: '1101',
      });
    });

    it('should build filter for partial course code', () => {
      const pattern = { type: 'partial_code' as const, subjectCode: 'CS', courseNumber: '11' };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
        courseNumber: { startsWith: '11' },
      });
    });

    it('should build filter for subject prefix', () => {
      const pattern = { type: 'subject_prefix' as const, subjectCodes: ['CS', 'CHEM', 'CHIN'] };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        subjectCode: { in: ['CS', 'CHEM', 'CHIN'] },
      });
    });

    it('should build filter for subject name', () => {
      const pattern = { type: 'subject_name' as const, subjectCode: 'CS' };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        subjectCode: 'CS',
      });
    });

    it('should build filter for title search with single term', () => {
      const pattern = { type: 'title_search' as const, searchTerms: ['programming'] };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        AND: [
          { title: { contains: 'programming', mode: 'insensitive' } },
        ],
      });
    });

    it('should build filter for title search with multiple terms', () => {
      const pattern = { type: 'title_search' as const, searchTerms: ['intro', 'programming'] };
      const filter = buildClassFilter(pattern);
      expect(filter).toEqual({
        AND: [
          { title: { contains: 'intro', mode: 'insensitive' } },
          { title: { contains: 'programming', mode: 'insensitive' } },
        ],
      });
    });
  });
});
