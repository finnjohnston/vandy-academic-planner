import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import {
  createAcademicYear,
  getCurrentAcademicYear,
  getAcademicYearById,
  getAcademicYearByYear,
  setCurrentAcademicYear,
  getAllAcademicYears,
  getOrCreateAcademicYear,
  deleteAcademicYear,
} from '../../../src/ingestion/pipelines/services/academicYear.service.js';

describe('Academic Year Service', () => {
  describe('createAcademicYear', () => {
    it('should create a new academic year as current', async () => {
      const result = await createAcademicYear('2024-2025');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe('2024-2025');
        expect(result.data.start).toBe(2024);
        expect(result.data.end).toBe(2025);
        expect(result.data.isCurrent).toBe(true);
      }
    });

    it('should set all other years to not current when creating new year', async () => {
      // Create first year
      await createAcademicYear('2024-2025');

      // Create second year
      const result = await createAcademicYear('2025-2026');

      expect(result.success).toBe(true);

      // Check that first year is no longer current
      const firstYear = await prisma.academicYear.findUnique({
        where: { year: '2024-2025' },
      });

      expect(firstYear?.isCurrent).toBe(false);

      // Check that second year is current
      const secondYear = await prisma.academicYear.findUnique({
        where: { year: '2025-2026' },
      });

      expect(secondYear?.isCurrent).toBe(true);
    });

    it('should return existing year if already exists', async () => {
      // Create year
      const first = await createAcademicYear('2024-2025');

      // Try to create again
      const second = await createAcademicYear('2024-2025');

      expect(second.success).toBe(true);
      if (first.success && second.success) {
        expect(second.data.id).toBe(first.data.id);
      }

      // Verify only one was created
      const count = await prisma.academicYear.count({
        where: { year: '2024-2025' },
      });
      expect(count).toBe(1);
    });
  });

  describe('getCurrentAcademicYear', () => {
    it('should return null when no current year is set', async () => {
      const result = await getCurrentAcademicYear();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should return the current academic year', async () => {
      // Create two years
      await createAcademicYear('2024-2025');
      await createAcademicYear('2025-2026');

      const result = await getCurrentAcademicYear();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.year).toBe('2025-2026');
        expect(result.data.isCurrent).toBe(true);
      }
    });
  });

  describe('getAcademicYearById', () => {
    it('should return academic year by ID', async () => {
      const created = await createAcademicYear('2024-2025');

      if (created.success) {
        const result = await getAcademicYearById(created.data.id);

        expect(result.success).toBe(true);
        if (result.success && result.data) {
          expect(result.data.id).toBe(created.data.id);
          expect(result.data.year).toBe('2024-2025');
        }
      }
    });

    it('should return null for non-existent ID', async () => {
      const result = await getAcademicYearById(99999);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('getAcademicYearByYear', () => {
    it('should return academic year by year string', async () => {
      await createAcademicYear('2024-2025');

      const result = await getAcademicYearByYear('2024-2025');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.year).toBe('2024-2025');
        expect(result.data.start).toBe(2024);
        expect(result.data.end).toBe(2025);
      }
    });

    it('should return null for non-existent year', async () => {
      const result = await getAcademicYearByYear('1999-2000');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('should set a specific year as current', async () => {
      // Create two years
      const first = await createAcademicYear('2024-2025');
      const second = await createAcademicYear('2025-2026');

      // Second is now current, set first as current
      if (first.success) {
        const result = await setCurrentAcademicYear(first.data.id);

        expect(result.success).toBe(true);

        // Verify first is current
        const firstYear = await prisma.academicYear.findUnique({
          where: { id: first.data.id },
        });
        expect(firstYear?.isCurrent).toBe(true);

        // Verify second is not current
        if (second.success) {
          const secondYear = await prisma.academicYear.findUnique({
            where: { id: second.data.id },
          });
          expect(secondYear?.isCurrent).toBe(false);
        }
      }
    });

    it('should fail for non-existent ID', async () => {
      const result = await setCurrentAcademicYear(99999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACADEMIC_YEAR_NOT_FOUND');
      }
    });

    it('should ensure only one year is current at a time', async () => {
      // Create multiple years
      await createAcademicYear('2023-2024');
      await createAcademicYear('2024-2025');
      const third = await createAcademicYear('2025-2026');

      // Verify only one is current
      const currentCount = await prisma.academicYear.count({
        where: { isCurrent: true },
      });
      expect(currentCount).toBe(1);

      // Verify it's the last one created
      if (third.success) {
        const current = await getCurrentAcademicYear();
        if (current.success && current.data) {
          expect(current.data.id).toBe(third.data.id);
        }
      }
    });
  });

  describe('getAllAcademicYears', () => {
    it('should return empty array when no years exist', async () => {
      const result = await getAllAcademicYears();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return all academic years ordered by start year descending', async () => {
      // Create years in random order
      await createAcademicYear('2025-2026');
      await createAcademicYear('2023-2024');
      await createAcademicYear('2024-2025');

      const result = await getAllAcademicYears();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        // Should be ordered newest to oldest
        expect(result.data[0].year).toBe('2025-2026');
        expect(result.data[1].year).toBe('2024-2025');
        expect(result.data[2].year).toBe('2023-2024');
      }
    });
  });

  describe('getOrCreateAcademicYear', () => {
    it('should create new year if it does not exist', async () => {
      const result = await getOrCreateAcademicYear('2024-2025');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe('2024-2025');
        expect(result.data.isCurrent).toBe(true);
      }

      // Verify it was created
      const count = await prisma.academicYear.count({
        where: { year: '2024-2025' },
      });
      expect(count).toBe(1);
    });

    it('should return existing year if it already exists', async () => {
      // Create year
      const first = await createAcademicYear('2024-2025');

      // Get or create
      const second = await getOrCreateAcademicYear('2024-2025');

      expect(second.success).toBe(true);
      if (first.success && second.success) {
        expect(second.data.id).toBe(first.data.id);
      }

      // Verify only one exists
      const count = await prisma.academicYear.count({
        where: { year: '2024-2025' },
      });
      expect(count).toBe(1);
    });

    it('should preserve isCurrent flag when getting existing year', async () => {
      // Create first year (current)
      await createAcademicYear('2024-2025');

      // Create second year (becomes current, first becomes non-current)
      await createAcademicYear('2025-2026');

      // Get existing first year - should preserve its isCurrent=false status
      const result = await getOrCreateAcademicYear('2024-2025');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe('2024-2025');
        expect(result.data.isCurrent).toBe(false); // Should stay false
      }

      // Verify second year is still current
      const current = await getCurrentAcademicYear();
      if (current.success && current.data) {
        expect(current.data.year).toBe('2025-2026');
      }
    });
  });

  describe('deleteAcademicYear', () => {
    it('should delete an academic year', async () => {
      const created = await createAcademicYear('2024-2025');

      if (created.success) {
        const result = await deleteAcademicYear(created.data.id);

        expect(result.success).toBe(true);

        // Verify it was deleted
        const found = await prisma.academicYear.findUnique({
          where: { id: created.data.id },
        });
        expect(found).toBeNull();
      }
    });

    it('should fail for non-existent ID', async () => {
      const result = await deleteAcademicYear(99999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACADEMIC_YEAR_NOT_FOUND');
      }
    });

    it('should cascade delete courses', async () => {
      // Create academic year
      const yearResult = await createAcademicYear('2024-2025');

      if (yearResult.success) {
        const academicYear = yearResult.data;

        // Create a course for this year
        await prisma.course.create({
          data: {
            courseId: 'test-course',
            academicYearId: academicYear.id,
            subjectCode: 'CS',
            courseNumber: '1101',
            title: 'Test Course',
            creditsMin: 3.0,
            creditsMax: 3.0,
          },
        });

        // Verify course exists
        const courseBefore = await prisma.course.count({
          where: { academicYearId: academicYear.id },
        });
        expect(courseBefore).toBe(1);

        // Delete academic year
        await deleteAcademicYear(academicYear.id);

        // Verify course was cascade deleted
        const courseAfter = await prisma.course.count({
          where: { academicYearId: academicYear.id },
        });
        expect(courseAfter).toBe(0);
      }
    });
  });
});
