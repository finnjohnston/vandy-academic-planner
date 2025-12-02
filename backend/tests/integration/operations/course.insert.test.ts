import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import {
  insertCourses,
  insertCourse,
  getCourseCount,
  deleteCoursesForYear,
  getCoursesForYear,
} from '../../../src/ingestion/operations/course.insert.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { DbCourseInput } from '../../../src/ingestion/transformers/types/db.course.input.js';

describe('Course Insert Operations', () => {
  let academicYearId: number;

  beforeEach(async () => {
    // Create an academic year for testing
    const yearResult = await createAcademicYear('2024-2025');
    if (yearResult.success) {
      academicYearId = yearResult.data.id;
    }
  });

  describe('insertCourse', () => {
    it('should insert a single course', async () => {
      const courseData: DbCourseInput = {
        courseId: '102715',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming and Problem Solving',
        school: 'School of Engineering',
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: 'Fall, Spring',
        description: 'Introduction to programming and algorithmic problem solving.',
        attributes: {
          axle: ['AXLE: Mathematics and Natural Sciences'],
          core: ['CORE: Quantitative Reasoning'],
        },
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: MATH 1300',
            courses: 'MATH 1300',
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
      };

      const result = await insertCourse(courseData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.courseId).toBe('102715');
        expect(result.data.subjectCode).toBe('CS');
        expect(result.data.courseNumber).toBe('1101');
        expect(result.data.title).toBe('Programming and Problem Solving');
        expect(result.data.creditsMin).toBe(3.0);
        expect(result.data.isCatalogCourse).toBe(true);
      }

      // Verify it was actually inserted
      const found = await prisma.course.findUnique({
        where: {
          academicYearId_subjectCode_courseNumber: {
            academicYearId,
            subjectCode: 'CS',
            courseNumber: '1101',
          },
        },
      });

      expect(found).toBeDefined();
      expect(found?.title).toBe('Programming and Problem Solving');
    });

    it('should insert a course with minimal fields', async () => {
      const courseData: DbCourseInput = {
        courseId: '102716',
        academicYearId,
        subjectCode: 'MATH',
        courseNumber: '1300',
        title: 'Calculus I',
        school: null,
        creditsMin: 4.0,
        creditsMax: 4.0,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      };

      const result = await insertCourse(courseData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subjectCode).toBe('MATH');
        expect(result.data.courseNumber).toBe('1300');
        expect(result.data.school).toBeNull();
        expect(result.data.description).toBeNull();
      }
    });
  });

  describe('insertCourses (batch)', () => {
    it('should insert multiple courses', async () => {
      const coursesData: DbCourseInput[] = [
        {
          courseId: '102715',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: 'Fall, Spring',
          description: 'Introduction to programming.',
          attributes: null,
          requirements: null,
        },
        {
          courseId: '102716',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: 'Fall, Spring',
          description: 'Introduction to data structures.',
          attributes: null,
          requirements: null,
        },
        {
          courseId: '102717',
          academicYearId,
          subjectCode: 'MATH',
          courseNumber: '1300',
          title: 'Calculus I',
          school: 'College of Arts and Science',
          creditsMin: 4.0,
          creditsMax: 4.0,
          typicallyOffered: 'Fall, Spring',
          description: 'Single variable calculus.',
          attributes: null,
          requirements: null,
        },
      ];

      const result = await insertCourses(coursesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].subjectCode).toBe('CS');
        expect(result.data[1].courseNumber).toBe('2201');
        expect(result.data[2].subjectCode).toBe('MATH');
      }

      // Verify all were inserted
      const count = await prisma.course.count({
        where: { academicYearId },
      });
      expect(count).toBe(3);
    });

    it('should handle large batch inserts efficiently', async () => {
      // Create 100 courses
      const coursesData: DbCourseInput[] = Array.from({ length: 100 }, (_, i) => ({
        courseId: `course-${i}`,
        academicYearId,
        subjectCode: 'CS',
        courseNumber: `${1000 + i}`,
        title: `Test Course ${i}`,
        school: 'School of Engineering',
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      }));

      const result = await insertCourses(coursesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(100);
      }

      const count = await prisma.course.count({
        where: { academicYearId },
      });
      expect(count).toBe(100);
    });
  });

  describe('upsert behavior', () => {
    it('should update existing course instead of creating duplicate', async () => {
      const courseData: DbCourseInput = {
        courseId: '102715',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming and Problem Solving',
        school: 'School of Engineering',
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: 'Fall, Spring',
        description: 'Original description',
        attributes: null,
        requirements: null,
      };

      // Insert first time
      const firstResult = await insertCourse(courseData);
      expect(firstResult.success).toBe(true);

      let firstId: number | undefined;
      if (firstResult.success) {
        firstId = firstResult.data.id;
      }

      // Insert again with updated data
      const updatedCourseData: DbCourseInput = {
        ...courseData,
        title: 'Updated Programming Title',
        description: 'Updated description',
      };

      const secondResult = await insertCourse(updatedCourseData);
      expect(secondResult.success).toBe(true);

      if (secondResult.success) {
        // Should have same ID (updated, not inserted)
        expect(secondResult.data.id).toBe(firstId);
        expect(secondResult.data.title).toBe('Updated Programming Title');
        expect(secondResult.data.description).toBe('Updated description');
      }

      // Verify only one course exists
      const count = await prisma.course.count({
        where: {
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
        },
      });
      expect(count).toBe(1);
    });

    it('should handle batch upsert with mix of new and existing courses', async () => {
      // Insert initial courses
      const initialCourses: DbCourseInput[] = [
        {
          courseId: '102715',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: 'Original description',
          attributes: null,
          requirements: null,
        },
        {
          courseId: '102716',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: 'Original description',
          attributes: null,
          requirements: null,
        },
      ];

      await insertCourses(initialCourses);

      // Now upsert with some existing and some new
      const mixedCourses: DbCourseInput[] = [
        {
          ...initialCourses[0],
          title: 'Updated Programming Title',
        },
        {
          courseId: '102717',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '3250',
          title: 'Algorithms',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: 'New course',
          attributes: null,
          requirements: null,
        },
      ];

      const result = await insertCourses(mixedCourses);

      expect(result.success).toBe(true);

      // Verify total count (2 original + 1 new = 3)
      const count = await prisma.course.count({
        where: { academicYearId },
      });
      expect(count).toBe(3);

      // Verify the update happened
      const updated = await prisma.course.findUnique({
        where: {
          academicYearId_subjectCode_courseNumber: {
            academicYearId,
            subjectCode: 'CS',
            courseNumber: '1101',
          },
        },
      });
      expect(updated?.title).toBe('Updated Programming Title');
    });
  });

  describe('getCourseCount', () => {
    it('should return 0 when no courses exist', async () => {
      const result = await getCourseCount(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it('should return correct count after insertions', async () => {
      const coursesData: DbCourseInput[] = [
        {
          courseId: '102715',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          courseId: '102716',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
      ];

      await insertCourses(coursesData);

      const result = await getCourseCount(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2);
      }
    });
  });

  describe('getCoursesForYear', () => {
    it('should return empty array when no courses exist', async () => {
      const result = await getCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return courses ordered by subject and course number', async () => {
      const coursesData: DbCourseInput[] = [
        {
          courseId: '3',
          academicYearId,
          subjectCode: 'MATH',
          courseNumber: '1300',
          title: 'Calculus I',
          school: null,
          creditsMin: 4.0,
          creditsMax: 4.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          courseId: '1',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          courseId: '2',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
      ];

      await insertCourses(coursesData);

      const result = await getCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        // Should be ordered: CS 1101, CS 2201, MATH 1300
        expect(result.data[0].subjectCode).toBe('CS');
        expect(result.data[0].courseNumber).toBe('1101');
        expect(result.data[1].subjectCode).toBe('CS');
        expect(result.data[1].courseNumber).toBe('2201');
        expect(result.data[2].subjectCode).toBe('MATH');
        expect(result.data[2].courseNumber).toBe('1300');
      }
    });

    it('should only return courses for specified academic year', async () => {
      // Create second academic year
      const secondYearResult = await createAcademicYear('2025-2026');
      let secondYearId: number | undefined;
      if (secondYearResult.success) {
        secondYearId = secondYearResult.data.id;
      }

      // Insert courses for first year
      await insertCourse({
        courseId: '1',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming 2024',
        school: null,
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Insert courses for second year
      if (secondYearId) {
        await insertCourse({
          courseId: '2',
          academicYearId: secondYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming 2025',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        });
      }

      // Get courses for first year only
      const result = await getCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('Programming 2024');
      }
    });
  });

  describe('deleteCoursesForYear', () => {
    it('should delete all courses for academic year', async () => {
      // Insert some courses
      const coursesData: DbCourseInput[] = [
        {
          courseId: '1',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          courseId: '2',
          academicYearId,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        },
      ];

      await insertCourses(coursesData);

      // Verify they exist
      const countBefore = await getCourseCount(academicYearId);
      if (countBefore.success) {
        expect(countBefore.data).toBe(2);
      }

      // Delete them
      const result = await deleteCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2); // Number deleted
      }

      // Verify they're gone
      const countAfter = await getCourseCount(academicYearId);
      if (countAfter.success) {
        expect(countAfter.data).toBe(0);
      }
    });

    it('should only delete courses for specified year', async () => {
      // Create second academic year
      const secondYearResult = await createAcademicYear('2025-2026');
      let secondYearId: number | undefined;
      if (secondYearResult.success) {
        secondYearId = secondYearResult.data.id;
      }

      // Insert courses for both years
      await insertCourse({
        courseId: '1',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming 2024',
        school: null,
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      if (secondYearId) {
        await insertCourse({
          courseId: '2',
          academicYearId: secondYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming 2025',
          school: null,
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        });
      }

      // Delete only first year courses
      const result = await deleteCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }

      // Verify first year courses are gone
      const firstYearCount = await getCourseCount(academicYearId);
      if (firstYearCount.success) {
        expect(firstYearCount.data).toBe(0);
      }

      // Verify second year courses still exist
      if (secondYearId) {
        const secondYearCount = await getCourseCount(secondYearId);
        if (secondYearCount.success) {
          expect(secondYearCount.data).toBe(1);
        }
      }
    });

    it('should return 0 when no courses to delete', async () => {
      const result = await deleteCoursesForYear(academicYearId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  describe('academic year isolation', () => {
    it('should allow same course in different academic years', async () => {
      // Create second academic year
      const secondYearResult = await createAcademicYear('2025-2026');
      let secondYearId: number | undefined;
      if (secondYearResult.success) {
        secondYearId = secondYearResult.data.id;
      }

      // Insert CS 1101 for 2024-2025
      const first = await insertCourse({
        courseId: '102715-2024',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming and Problem Solving 2024',
        school: 'School of Engineering',
        creditsMin: 3.0,
        creditsMax: 3.0,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      expect(first.success).toBe(true);

      // Insert CS 1101 for 2025-2026 (same course, different year)
      if (secondYearId) {
        const second = await insertCourse({
          courseId: '102715-2025',
          academicYearId: secondYearId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving 2025',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
        });

        expect(second.success).toBe(true);
      }

      // Verify both exist independently
      const totalCourses = await prisma.course.count({
        where: {
          subjectCode: 'CS',
          courseNumber: '1101',
        },
      });

      expect(totalCourses).toBe(2);
    });
  });
});
