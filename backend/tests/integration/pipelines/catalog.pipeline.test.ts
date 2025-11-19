import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../setup.js';
import { ingestCatalog } from '../../../src/ingestion/pipelines/catalog.pipeline.js';
import { CatalogCourse } from '../../../src/ingestion/scrapers/types/course.type.js';
import { ParsedCatalogCourse } from '../../../src/ingestion/parsers/types/main/parsed.course.type.js';

// Mock the scrapers and parsers
vi.mock('../../../src/ingestion/scrapers/functions.js', () => ({
  getAllCourses: vi.fn(),
}));

vi.mock('../../../src/ingestion/parsers/parsers/main/course.parser.js', () => ({
  parseCourse: vi.fn(),
}));

import { getAllCourses } from '../../../src/ingestion/scrapers/functions.js';
import { parseCourse } from '../../../src/ingestion/parsers/parsers/main/course.parser.js';

describe('Catalog Pipeline Integration Tests', () => {
  // Test data fixtures
  const mockScrapedCourses: CatalogCourse[] = [
    {
      id: '102715',
      subject: 'CS',
      abbreviation: '1101',
      name: 'Programming and Problem Solving',
      details: {
        school: 'School of Engineering',
        hours: '3.000 Credit hours',
        grading: 'Graded',
        components: ['Lecture'],
        typicallyOffered: 'Fall, Spring',
        requirements: 'Prerequisite: MATH 1300',
        attributes: ['Core Requirement'],
        description: 'Introduction to programming and algorithmic problem solving.',
      },
    },
    {
      id: '102716',
      subject: 'CS',
      abbreviation: '2201',
      name: 'Data Structures',
      details: {
        school: 'School of Engineering',
        hours: '3.000 Credit hours',
        grading: 'Graded',
        components: ['Lecture'],
        typicallyOffered: 'Fall, Spring',
        requirements: 'Prerequisite: CS 1101',
        attributes: [],
        description: 'Introduction to data structures and algorithms.',
      },
    },
    {
      id: '102717',
      subject: 'MATH',
      abbreviation: '1300',
      name: 'Calculus I',
      details: {
        school: 'College of Arts and Science',
        hours: '4.000 Credit hours',
        grading: 'Graded',
        components: ['Lecture'],
        typicallyOffered: 'Fall, Spring',
        requirements: null,
        attributes: ['AXLE: Mathematics and Natural Sciences'],
        description: 'Single variable differential and integral calculus.',
      },
    },
  ];

  const mockParsedCourses: ParsedCatalogCourse[] = [
    {
      id: '102715',
      subject: 'CS',
      abbreviation: '1101',
      name: 'Programming and Problem Solving',
      details: {
        school: 'School of Engineering',
        credits: { min: 3, max: 3 },
        typicallyOffered: 'Fall, Spring',
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: MATH 1300',
            courses: { $or: ['MATH 1300'] },
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
        attributes: {
          core: ['Core Requirement'],
          axle: null,
        },
        description: 'Introduction to programming and algorithmic problem solving.',
      },
    },
    {
      id: '102716',
      subject: 'CS',
      abbreviation: '2201',
      name: 'Data Structures',
      details: {
        school: 'School of Engineering',
        credits: { min: 3, max: 3 },
        typicallyOffered: 'Fall, Spring',
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: CS 1101',
            courses: { $or: ['CS 1101'] },
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
        attributes: {
          core: null,
          axle: null,
        },
        description: 'Introduction to data structures and algorithms.',
      },
    },
    {
      id: '102717',
      subject: 'MATH',
      abbreviation: '1300',
      name: 'Calculus I',
      details: {
        school: 'College of Arts and Science',
        credits: { min: 4, max: 4 },
        typicallyOffered: 'Fall, Spring',
        requirements: {
          prerequisites: {
            rawText: null,
            courses: null,
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
        attributes: {
          core: null,
          axle: ['AXLE: Mathematics and Natural Sciences'],
        },
        description: 'Single variable differential and integral calculus.',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Pipeline Flow', () => {
    it('should successfully ingest entire catalog on first run', async () => {
      // Mock scrapers and parsers
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      // Run pipeline
      const result = await ingestCatalog('2024-2025', 2024, 2025);

      // Verify success
      expect(result.success).toBe(true);

      if (result.success) {
        const summary = result.data;

        // Check summary
        expect(summary.academicYear).toBe('2024-2025');
        expect(summary.scraped).toBe(3);
        expect(summary.parsed).toBe(3);
        expect(summary.upserted).toBe(3);
        expect(summary.deleted).toBe(0);
        expect(summary.errors).toBe(0);
        expect(summary.duration).toBeGreaterThan(0);

        // Verify academic year was created
        const academicYear = await prisma.academicYear.findUnique({
          where: { year: '2024-2025' },
        });
        expect(academicYear).toBeDefined();
        expect(academicYear?.isCurrent).toBe(true);

        // Verify courses were inserted
        const courses = await prisma.course.findMany({
          where: { academicYearId: summary.academicYearId },
          orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
        });

        expect(courses).toHaveLength(3);

        // Verify CS 1101
        expect(courses[0].courseId).toBe('102715');
        expect(courses[0].subjectCode).toBe('CS');
        expect(courses[0].courseNumber).toBe('1101');
        expect(courses[0].title).toBe('Programming and Problem Solving');
        expect(courses[0].creditsMin).toBe(3);
        expect(courses[0].creditsMax).toBe(3);
        expect(courses[0].isCatalogCourse).toBe(true);

        // Verify CS 2201
        expect(courses[1].subjectCode).toBe('CS');
        expect(courses[1].courseNumber).toBe('2201');

        // Verify MATH 1300
        expect(courses[2].subjectCode).toBe('MATH');
        expect(courses[2].courseNumber).toBe('1300');
        expect(courses[2].creditsMin).toBe(4);
      }
    });

    it('should update courses when re-running with same data (upsert)', async () => {
      // First run
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const firstRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(firstRun.success).toBe(true);

      // Get course IDs from first run
      const coursesAfterFirst = await prisma.course.findMany({
        where: { academicYearId: firstRun.success ? firstRun.data.academicYearId : 0 },
      });
      const firstRunIds = coursesAfterFirst.map(c => c.id).sort();

      // Second run with updated course data
      const updatedParsedCourses = mockParsedCourses.map(c =>
        c.subject === 'CS' && c.abbreviation === '1101'
          ? {
              ...c,
              name: 'UPDATED Programming Title',
              details: {
                ...c.details,
                description: 'UPDATED description',
              },
            }
          : c
      );

      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = updatedParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const secondRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(secondRun.success).toBe(true);

      if (secondRun.success) {
        // Should have same academic year
        expect(secondRun.data.academicYearId).toBe(
          firstRun.success ? firstRun.data.academicYearId : 0
        );

        // Should still have 3 courses (no duplicates)
        expect(secondRun.data.upserted).toBe(3);
        expect(secondRun.data.deleted).toBe(0);

        const coursesAfterSecond = await prisma.course.findMany({
          where: { academicYearId: secondRun.data.academicYearId },
        });
        expect(coursesAfterSecond).toHaveLength(3);

        // Should have same IDs (updated, not recreated)
        const secondRunIds = coursesAfterSecond.map(c => c.id).sort();
        expect(secondRunIds).toEqual(firstRunIds);

        // Verify update happened
        const updatedCourse = coursesAfterSecond.find(
          c => c.subjectCode === 'CS' && c.courseNumber === '1101'
        );
        expect(updatedCourse?.title).toBe('UPDATED Programming Title');
        expect(updatedCourse?.description).toBe('UPDATED description');
      }
    });

    it('should handle new courses added to catalog', async () => {
      // First run with 3 courses
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const firstRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(firstRun.success).toBe(true);

      // Second run with 4 courses (added CS 3250)
      const newScrapedCourse: CatalogCourse = {
        id: '102718',
        subject: 'CS',
        abbreviation: '3250',
        name: 'Algorithms',
        details: {
          school: 'School of Engineering',
          hours: '3.000 Credit hours',
          grading: 'Graded',
          components: ['Lecture'],
          typicallyOffered: 'Fall, Spring',
          requirements: 'Prerequisite: CS 2201',
          attributes: [],
          description: 'Design and analysis of algorithms.',
        },
      };

      const newParsedCourse: ParsedCatalogCourse = {
        id: '102718',
        subject: 'CS',
        abbreviation: '3250',
        name: 'Algorithms',
        details: {
          school: 'School of Engineering',
          credits: { min: 3, max: 3 },
          typicallyOffered: 'Fall, Spring',
          requirements: {
            prerequisites: {
              rawText: 'Prerequisite: CS 2201',
              courses: { $or: ['CS 2201'] },
            },
            corequisites: {
              rawText: null,
              courses: null,
            },
          },
          attributes: { core: null, axle: null },
          description: 'Design and analysis of algorithms.',
        },
      };

      vi.mocked(getAllCourses).mockResolvedValue([
        ...mockScrapedCourses,
        newScrapedCourse,
      ]);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = [...mockParsedCourses, newParsedCourse].find(
          p => p.id === course.id
        );
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const secondRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(secondRun.success).toBe(true);

      if (secondRun.success) {
        // Should have 4 courses now
        expect(secondRun.data.scraped).toBe(4);
        expect(secondRun.data.parsed).toBe(4);
        expect(secondRun.data.upserted).toBe(4);
        expect(secondRun.data.deleted).toBe(0);

        const courses = await prisma.course.findMany({
          where: { academicYearId: secondRun.data.academicYearId },
        });
        expect(courses).toHaveLength(4);

        // Verify new course was added
        const newCourse = courses.find(
          c => c.subjectCode === 'CS' && c.courseNumber === '3250'
        );
        expect(newCourse).toBeDefined();
        expect(newCourse?.title).toBe('Algorithms');
      }
    });

    it('should hard delete courses removed from catalog', async () => {
      // First run with 3 courses
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const firstRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(firstRun.success).toBe(true);

      // Verify 3 courses exist
      const coursesAfterFirst = await prisma.course.findMany({
        where: { academicYearId: firstRun.success ? firstRun.data.academicYearId : 0 },
      });
      expect(coursesAfterFirst).toHaveLength(3);

      // Second run with only 2 courses (removed MATH 1300)
      const reducedScrapedCourses = mockScrapedCourses.filter(
        c => !(c.subject === 'MATH' && c.abbreviation === '1300')
      );
      const reducedParsedCourses = mockParsedCourses.filter(
        c => !(c.subject === 'MATH' && c.abbreviation === '1300')
      );

      vi.mocked(getAllCourses).mockResolvedValue(reducedScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = reducedParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const secondRun = await ingestCatalog('2024-2025', 2024, 2025);
      expect(secondRun.success).toBe(true);

      if (secondRun.success) {
        // Should have scraped 2, deleted 1
        expect(secondRun.data.scraped).toBe(2);
        expect(secondRun.data.parsed).toBe(2);
        expect(secondRun.data.upserted).toBe(2);
        expect(secondRun.data.deleted).toBe(1); // ← Hard delete happened

        const coursesAfterSecond = await prisma.course.findMany({
          where: { academicYearId: secondRun.data.academicYearId },
        });
        expect(coursesAfterSecond).toHaveLength(2);

        // Verify MATH 1300 was deleted
        const mathCourse = coursesAfterSecond.find(
          c => c.subjectCode === 'MATH' && c.courseNumber === '1300'
        );
        expect(mathCourse).toBeUndefined();

        // Verify CS courses still exist
        const csCourses = coursesAfterSecond.filter(c => c.subjectCode === 'CS');
        expect(csCourses).toHaveLength(2);
      }
    });
  });

  describe('Error Handling', () => {
    it('should skip failed parses and continue with successful ones', async () => {
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);

      // Mock parser to fail for CS 2201
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        if (course.subject === 'CS' && course.abbreviation === '2201') {
          throw new Error('Gemini API timeout');
        }
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const result = await ingestCatalog('2024-2025', 2024, 2025);

      expect(result.success).toBe(true);

      if (result.success) {
        const summary = result.data;

        // Should have scraped 3, parsed 2, with 1 error
        expect(summary.scraped).toBe(3);
        expect(summary.parsed).toBe(2); // CS 2201 failed
        expect(summary.upserted).toBe(2); // Only 2 inserted
        expect(summary.errors).toBe(1); // 1 parse error

        // Verify only 2 courses in database
        const courses = await prisma.course.findMany({
          where: { academicYearId: summary.academicYearId },
        });
        expect(courses).toHaveLength(2);

        // Verify CS 2201 is NOT in database
        const failedCourse = courses.find(
          c => c.subjectCode === 'CS' && c.courseNumber === '2201'
        );
        expect(failedCourse).toBeUndefined();

        // Verify CS 1101 and MATH 1300 ARE in database
        const cs1101 = courses.find(
          c => c.subjectCode === 'CS' && c.courseNumber === '1101'
        );
        expect(cs1101).toBeDefined();

        const math1300 = courses.find(
          c => c.subjectCode === 'MATH' && c.courseNumber === '1300'
        );
        expect(math1300).toBeDefined();
      }
    });

    it('should fail pipeline when all courses fail to parse', async () => {
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);

      // Mock parser to fail for all courses
      vi.mocked(parseCourse).mockRejectedValue(new Error('All parsers failed'));

      const result = await ingestCatalog('2024-2025', 2024, 2025);

      // Pipeline should fail
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.message).toContain('All courses failed to parse');
        expect(result.error.code).toBe('PARSE_ALL_FAILED');
      }

      // Verify academic year was created
      const academicYear = await prisma.academicYear.findUnique({
        where: { year: '2024-2025' },
      });
      expect(academicYear).toBeDefined();

      // Verify NO courses were inserted
      const courses = await prisma.course.findMany({
        where: { academicYearId: academicYear?.id },
      });
      expect(courses).toHaveLength(0);
    });

    it('should track multiple parse errors correctly', async () => {
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);

      // Mock parser to fail for 2 out of 3 courses
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        if (course.subject === 'CS') {
          throw new Error('CS courses failed to parse');
        }
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const result = await ingestCatalog('2024-2025', 2024, 2025);

      expect(result.success).toBe(true);

      if (result.success) {
        const summary = result.data;

        // Should have 2 errors (CS 1101 and CS 2201)
        expect(summary.scraped).toBe(3);
        expect(summary.parsed).toBe(1); // Only MATH 1300
        expect(summary.upserted).toBe(1);
        expect(summary.errors).toBe(2); // Both CS courses failed

        // Verify only MATH 1300 in database
        const courses = await prisma.course.findMany({
          where: { academicYearId: summary.academicYearId },
        });
        expect(courses).toHaveLength(1);
        expect(courses[0].subjectCode).toBe('MATH');
      }
    });

    it('should handle empty catalog gracefully', async () => {
      vi.mocked(getAllCourses).mockResolvedValue([]);

      const result = await ingestCatalog('2024-2025', 2024, 2025);

      expect(result.success).toBe(true);

      if (result.success) {
        const summary = result.data;

        expect(summary.scraped).toBe(0);
        expect(summary.parsed).toBe(0);
        expect(summary.upserted).toBe(0);
        expect(summary.deleted).toBe(0);
        expect(summary.errors).toBe(0);

        // Verify no courses in database
        const courses = await prisma.course.findMany({
          where: { academicYearId: summary.academicYearId },
        });
        expect(courses).toHaveLength(0);
      }
    });
  });

  describe('Academic Year Isolation', () => {
    it('should maintain separate catalogs for different years', async () => {
      // Ingest catalog for 2024-2025
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const firstYear = await ingestCatalog('2024-2025', 2024, 2025);
      expect(firstYear.success).toBe(true);

      // Ingest catalog for 2025-2026 (with different courseIds)
      const newYearCourses = mockScrapedCourses.slice(0, 2).map(course => ({
        ...course,
        id: `${course.id}-2025`, // Different courseId for new year
      }));
      vi.mocked(getAllCourses).mockResolvedValue(newYearCourses);

      // Update parser to handle new courseIds
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const baseParsed = mockParsedCourses.find(p => course.id.startsWith(p.id));
        if (!baseParsed) throw new Error('Mock parse failed');
        return {
          ...baseParsed,
          id: course.id, // Use the new courseId
        };
      });

      const secondYear = await ingestCatalog('2025-2026', 2025, 2026);
      expect(secondYear.success).toBe(true);

      if (firstYear.success && secondYear.success) {
        // Verify first year still has 3 courses
        const firstYearCourses = await prisma.course.findMany({
          where: { academicYearId: firstYear.data.academicYearId },
        });
        expect(firstYearCourses).toHaveLength(3);

        // Verify second year has 2 courses
        const secondYearCourses = await prisma.course.findMany({
          where: { academicYearId: secondYear.data.academicYearId },
        });
        expect(secondYearCourses).toHaveLength(2);

        // Verify they have different academic year IDs
        expect(firstYear.data.academicYearId).not.toBe(secondYear.data.academicYearId);
      }
    });

    it('should not delete courses from other academic years', async () => {
      // Create catalog for 2024-2025 with 3 courses
      vi.mocked(getAllCourses).mockResolvedValue(mockScrapedCourses);
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const parsed = mockParsedCourses.find(p => p.id === course.id);
        if (!parsed) throw new Error('Mock parse failed');
        return parsed;
      });

      const firstYear = await ingestCatalog('2024-2025', 2024, 2025);
      expect(firstYear.success).toBe(true);

      // Create catalog for 2025-2026 with only 1 course (different courseId)
      const reducedCourses = mockScrapedCourses.slice(0, 1).map(course => ({
        ...course,
        id: `${course.id}-2025`,
      }));
      vi.mocked(getAllCourses).mockResolvedValue(reducedCourses);

      // Update parser to handle new courseIds
      vi.mocked(parseCourse).mockImplementation(async (course: CatalogCourse) => {
        const baseParsed = mockParsedCourses.find(p => course.id.startsWith(p.id));
        if (!baseParsed) throw new Error('Mock parse failed');
        return {
          ...baseParsed,
          id: course.id,
        };
      });

      const secondYear = await ingestCatalog('2025-2026', 2025, 2026);
      expect(secondYear.success).toBe(true);

      if (firstYear.success && secondYear.success) {
        // First year should still have 3 courses (not affected by second year)
        const firstYearCourses = await prisma.course.findMany({
          where: { academicYearId: firstYear.data.academicYearId },
        });
        expect(firstYearCourses).toHaveLength(3);

        // Second year should have 1 course
        const secondYearCourses = await prisma.course.findMany({
          where: { academicYearId: secondYear.data.academicYearId },
        });
        expect(secondYearCourses).toHaveLength(1);
      }
    });
  });
});
