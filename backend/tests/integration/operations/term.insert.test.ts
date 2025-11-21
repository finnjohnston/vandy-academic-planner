import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import {
  insertTerm,
  insertTerms,
  getTermsForYear,
  deleteTermsForYear,
} from '../../../src/ingestion/operations/term.insert.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { DbTermInput } from '../../../src/ingestion/transformers/types/db.term.input.js';

describe('Term Insert Operations', () => {
  let academicYearId: number;
  let academicYearId2: number;

  beforeEach(async () => {
    // Create academic years for testing
    const year1Result = await createAcademicYear('2024-2025');
    if (year1Result.success) {
      academicYearId = year1Result.data.id;
    }

    const year2Result = await createAcademicYear('2023-2024');
    if (year2Result.success) {
      academicYearId2 = year2Result.data.id;
    }
  });

  describe('insertTerm', () => {
    it('should insert a single term', async () => {
      const termData: DbTermInput = {
        termId: '1248',
        academicYearId,
        name: 'Fall 2024',
      };

      const result = await insertTerm(termData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.termId).toBe('1248');
        expect(result.data.name).toBe('Fall 2024');
        expect(result.data.academicYearId).toBe(academicYearId);
      }

      // Verify in database
      const found = await prisma.term.findUnique({
        where: { termId: '1248' },
      });

      expect(found).toBeDefined();
      expect(found?.name).toBe('Fall 2024');
    });

    it('should upsert existing term (update on conflict)', async () => {
      const termData: DbTermInput = {
        termId: '1248',
        academicYearId,
        name: 'Fall 2024',
      };

      // Insert first time
      const result1 = await insertTerm(termData);
      expect(result1.success).toBe(true);

      // Insert again with updated name
      const updatedData: DbTermInput = {
        termId: '1248',
        academicYearId,
        name: 'Fall 2024 - Updated',
      };

      const result2 = await insertTerm(updatedData);
      expect(result2.success).toBe(true);

      // Verify only one record exists with updated name
      const allTerms = await prisma.term.findMany({
        where: { termId: '1248' },
      });

      expect(allTerms).toHaveLength(1);
      expect(allTerms[0].name).toBe('Fall 2024 - Updated');
    });

    it('should handle different academic years', async () => {
      const term1: DbTermInput = {
        termId: '1248',
        academicYearId,
        name: 'Fall 2024',
      };

      const term2: DbTermInput = {
        termId: '1246',
        academicYearId: academicYearId2,
        name: 'Fall 2023',
      };

      const result1 = await insertTerm(term1);
      const result2 = await insertTerm(term2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify both exist
      const found1 = await prisma.term.findUnique({ where: { termId: '1248' } });
      const found2 = await prisma.term.findUnique({ where: { termId: '1246' } });

      expect(found1?.academicYearId).toBe(academicYearId);
      expect(found2?.academicYearId).toBe(academicYearId2);
    });
  });

  describe('insertTerms', () => {
    it('should insert multiple terms in batch', async () => {
      const termsData: DbTermInput[] = [
        { termId: '1248', academicYearId, name: 'Fall 2024' },
        { termId: '1249', academicYearId, name: 'Spring 2025' },
      ];

      const result = await insertTerms(termsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((t) => t.termId)).toEqual(['1248', '1249']);
      }

      // Verify in database
      const count = await prisma.term.count({
        where: { academicYearId },
      });

      expect(count).toBe(2);
    });

    it('should handle large batch (50+ terms)', async () => {
      const termsData: DbTermInput[] = [];

      for (let i = 0; i < 60; i++) {
        termsData.push({
          termId: `TERM_${i}`,
          academicYearId,
          name: `Term ${i}`,
        });
      }

      const result = await insertTerms(termsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(60);
      }

      const count = await prisma.term.count({
        where: { academicYearId },
      });

      expect(count).toBe(60);
    });

    it('should upsert on conflict in batch', async () => {
      const initialData: DbTermInput[] = [
        { termId: '1248', academicYearId, name: 'Fall 2024' },
        { termId: '1249', academicYearId, name: 'Spring 2025' },
      ];

      await insertTerms(initialData);

      // Update with same IDs but different names
      const updatedData: DbTermInput[] = [
        { termId: '1248', academicYearId, name: 'Fall 2024 - Updated' },
        { termId: '1249', academicYearId, name: 'Spring 2025 - Updated' },
      ];

      const result = await insertTerms(updatedData);

      expect(result.success).toBe(true);

      // Verify count (should be 2, not 4)
      const count = await prisma.term.count({
        where: { academicYearId },
      });

      expect(count).toBe(2);

      // Verify updates
      const term1248 = await prisma.term.findUnique({ where: { termId: '1248' } });
      expect(term1248?.name).toBe('Fall 2024 - Updated');
    });

    it('should return empty array for empty input', async () => {
      const result = await insertTerms([]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('getTermsForYear', () => {
    beforeEach(async () => {
      // Insert test data
      await insertTerms([
        { termId: '1248', academicYearId, name: 'Fall 2024' },
        { termId: '1249', academicYearId, name: 'Spring 2025' },
        { termId: '1246', academicYearId: academicYearId2, name: 'Fall 2023' },
      ]);
    });

    it('should get all terms for a specific academic year', async () => {
      const result = await getTermsForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((t) => t.termId)).toEqual(['1248', '1249']);
      }
    });

    it('should return empty array for academic year with no terms', async () => {
      // Create a new academic year with no terms
      const year3Result = await createAcademicYear('2025-2026');
      expect(year3Result.success).toBe(true);

      if (year3Result.success) {
        const result = await getTermsForYear(year3Result.data.id);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([]);
        }
      }
    });

    it('should isolate terms by academic year', async () => {
      const result1 = await getTermsForYear(academicYearId);
      const result2 = await getTermsForYear(academicYearId2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.data).toHaveLength(2);
        expect(result2.data).toHaveLength(1);
        expect(result2.data[0].termId).toBe('1246');
      }
    });
  });

  describe('deleteTermsForYear', () => {
    beforeEach(async () => {
      // Insert test data
      await insertTerms([
        { termId: '1248', academicYearId, name: 'Fall 2024' },
        { termId: '1249', academicYearId, name: 'Spring 2025' },
        { termId: '1246', academicYearId: academicYearId2, name: 'Fall 2023' },
      ]);
    });

    it('should delete all terms for a specific academic year', async () => {
      const result = await deleteTermsForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2); // Deleted 2 terms
      }

      // Verify deletion
      const remaining = await prisma.term.count({
        where: { academicYearId },
      });

      expect(remaining).toBe(0);
    });

    it('should not affect terms from other academic years', async () => {
      await deleteTermsForYear(academicYearId);

      // Verify other academic year's terms still exist
      const otherYearTerms = await prisma.term.count({
        where: { academicYearId: academicYearId2 },
      });

      expect(otherYearTerms).toBe(1);
    });

    it('should return 0 for academic year with no terms', async () => {
      // Create a new academic year with no terms
      const year3Result = await createAcademicYear('2025-2026');
      expect(year3Result.success).toBe(true);

      if (year3Result.success) {
        const result = await deleteTermsForYear(year3Result.data.id);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(0);
        }
      }
    });

    it('should cascade delete related classes and sections', async () => {
      // Insert a class for the term
      await prisma.class.create({
        data: {
          classId: 'CLASS_001',
          termId: '1248',
          subjectCode: 'CS',
          courseNumber: '101',
          title: 'Intro to CS',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
      });

      // Insert a section for the class
      await prisma.section.create({
        data: {
          sectionId: 'SEC_001',
          termId: '1248',
          classId: 'CLASS_001',
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      // Delete terms
      await deleteTermsForYear(academicYearId);

      // Verify cascade delete
      const classCount = await prisma.class.count({ where: { termId: '1248' } });
      const sectionCount = await prisma.section.count({ where: { termId: '1248' } });

      expect(classCount).toBe(0);
      expect(sectionCount).toBe(0);
    });
  });
});
