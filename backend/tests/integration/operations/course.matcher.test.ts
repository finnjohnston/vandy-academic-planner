import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import {
  findCourseForClass,
  matchClassesToCourses,
  updateClassCourseLinks,
  getLinkStatistics,
} from '../../../src/ingestion/operations/course.matcher.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { insertTerm } from '../../../src/ingestion/operations/term.insert.js';
import { insertCourse } from '../../../src/ingestion/operations/course.insert.js';
import { insertClass } from '../../../src/ingestion/operations/class.insert.js';

describe('Course Matcher Operations', () => {
  let academicYearId: number;
  let termId1: string;
  let termId2: string;

  beforeEach(async () => {
    // Create academic year
    const yearResult = await createAcademicYear('2024-2025');
    if (yearResult.success) {
      academicYearId = yearResult.data.id;
    }

    // Create two terms in the same academic year
    const term1Result = await insertTerm({
      termId: '1248',
      academicYearId,
      name: 'Fall 2024',
    });
    if (term1Result.success) {
      termId1 = term1Result.data.termId;
    }

    const term2Result = await insertTerm({
      termId: '1249',
      academicYearId,
      name: 'Spring 2025',
    });
    if (term2Result.success) {
      termId2 = term2Result.data.termId;
    }
  });

  describe('findCourseForClass', () => {
    it('should find course for class with exact subject and number match', async () => {
      // Create course
      const courseResult = await insertCourse({
        courseId: 'COURSE_CS_1101',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming and Problem Solving',
        school: 'School of Engineering',
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: 'Introduction to programming',
        attributes: null,
        requirements: null,
      });

      expect(courseResult.success).toBe(true);

      // Find course for class
      const courseId = await findCourseForClass(
        {
          subjectCode: 'CS',
          courseNumber: '1101',
        },
        termId1
      );

      expect(courseId).toBe('COURSE_CS_1101');
    });

    it('should find course for special topics with different title (CS 3891)', async () => {
      // Create CS 3891 catalog course
      const courseResult = await insertCourse({
        courseId: 'COURSE_CS_3891',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '3891',
        title: 'Special Topics in Computer Science',
        school: 'School of Engineering',
        creditsMin: 1,
        creditsMax: 3,
        typicallyOffered: null,
        description: 'Advanced topics in CS',
        attributes: null,
        requirements: null,
      });

      expect(courseResult.success).toBe(true);

      // Find course for class with different title
      const courseId = await findCourseForClass(
        {
          subjectCode: 'CS',
          courseNumber: '3891',
        },
        termId1
      );

      expect(courseId).toBe('COURSE_CS_3891');
    });

    it('should return null for orphan class (no matching course)', async () => {
      // Don't create any course

      const courseId = await findCourseForClass(
        {
          subjectCode: 'CS',
          courseNumber: '9999',
        },
        termId1
      );

      expect(courseId).toBeNull();
    });

    it('should match within same academic year only', async () => {
      // Create course in 2024-2025
      const courseResult = await insertCourse({
        courseId: 'COURSE_CS_1101',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      expect(courseResult.success).toBe(true);

      // Create another academic year
      const yearResult2 = await createAcademicYear('2025-2026');
      expect(yearResult2.success).toBe(true);

      const term3Result = await insertTerm({
        termId: '1250',
        academicYearId: yearResult2.success ? yearResult2.data.id : 0,
        name: 'Fall 2025',
      });
      expect(term3Result.success).toBe(true);

      // Try to find course from different academic year
      const courseId = await findCourseForClass(
        {
          subjectCode: 'CS',
          courseNumber: '1101',
        },
        '1250' // Fall 2025 term (different academic year)
      );

      // Should not find course from 2024-2025 when looking in 2025-2026
      expect(courseId).toBeNull();
    });
  });

  describe('matchClassesToCourses', () => {
    it('should match multiple classes to same course (CS 3891 special topics)', async () => {
      // Create CS 3891 catalog course
      await insertCourse({
        courseId: 'COURSE_CS_3891',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '3891',
        title: 'Special Topics in Computer Science',
        school: null,
        creditsMin: 1,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create multiple classes with different titles
      await insertClass({
        classId: 'CLASS_CS_3891_ML',
        termId: termId1,
        subjectCode: 'CS',
        courseNumber: '3891',
        title: 'Machine Learning',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_CS_3891_WEB',
        termId: termId1,
        subjectCode: 'CS',
        courseNumber: '3891',
        title: 'Web Development',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Match classes for term
      const matchResult = await matchClassesToCourses(termId1);

      expect(matchResult.success).toBe(true);
      if (matchResult.success) {
        expect(matchResult.data).toHaveLength(2);
        expect(matchResult.data[0].courseId).toBe('COURSE_CS_3891');
        expect(matchResult.data[1].courseId).toBe('COURSE_CS_3891');
      }
    });

    it('should handle mix of matched and orphan classes', async () => {
      // Create only one course
      await insertCourse({
        courseId: 'COURSE_CS_1101',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create two classes - one matching, one orphan
      await insertClass({
        classId: 'CLASS_CS_1101',
        termId: termId1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming and Problem Solving',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_MATH_9999',
        termId: termId1,
        subjectCode: 'MATH',
        courseNumber: '9999',
        title: 'Experimental Course',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Match classes
      const matchResult = await matchClassesToCourses(termId1);

      expect(matchResult.success).toBe(true);
      if (matchResult.success) {
        expect(matchResult.data).toHaveLength(2);

        const cs1101Match = matchResult.data.find((m) => m.classId === 'CLASS_CS_1101');
        const math9999Match = matchResult.data.find((m) => m.classId === 'CLASS_MATH_9999');

        expect(cs1101Match?.courseId).toBe('COURSE_CS_1101');
        expect(math9999Match?.courseId).toBeNull();
      }
    });

    it('should match classes across multiple terms in same academic year', async () => {
      // Create course
      await insertCourse({
        courseId: 'COURSE_CS_1101',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create classes in both terms
      await insertClass({
        classId: 'CLASS_CS_1101_FALL',
        termId: termId1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_CS_1101_SPRING',
        termId: termId2,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Match all classes by academic year
      const matchResult = await matchClassesToCourses(undefined, academicYearId);

      expect(matchResult.success).toBe(true);
      if (matchResult.success) {
        expect(matchResult.data).toHaveLength(2);
        expect(matchResult.data.every((m) => m.courseId === 'COURSE_CS_1101')).toBe(true);
      }
    });
  });

  describe('updateClassCourseLinks', () => {
    it('should update class records with courseId', async () => {
      // Create course first
      await insertCourse({
        courseId: 'COURSE_CS_1101',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create classes without courseId
      await insertClass({
        classId: 'CLASS_1',
        termId: termId1,
        courseId: null,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Update with courseId
      const matches = [
        {
          classId: 'CLASS_1',
          courseId: 'COURSE_CS_1101',
        },
      ];

      const updateResult = await updateClassCourseLinks(matches);

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.data).toBe(1);
      }

      // Verify in database
      const cls = await prisma.class.findUnique({
        where: { classId: 'CLASS_1' },
      });

      expect(cls?.courseId).toBe('COURSE_CS_1101');
    });

    it('should handle orphans by setting courseId to null', async () => {
      // Create course first
      await insertCourse({
        courseId: 'OLD_COURSE',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Old Course',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create class with that courseId
      await insertClass({
        classId: 'CLASS_1',
        termId: termId1,
        courseId: 'OLD_COURSE',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Update to remove link (orphan)
      const matches = [
        {
          classId: 'CLASS_1',
          courseId: null,
        },
      ];

      const updateResult = await updateClassCourseLinks(matches);

      expect(updateResult.success).toBe(true);

      // Verify in database
      const cls = await prisma.class.findUnique({
        where: { classId: 'CLASS_1' },
      });

      expect(cls?.courseId).toBeNull();
    });
  });

  describe('getLinkStatistics', () => {
    it('should return correct statistics for term', async () => {
      // Create courses first
      await insertCourse({
        courseId: 'COURSE_1',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertCourse({
        courseId: 'COURSE_2',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '2201',
        title: 'Data Structures',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create classes - some linked, some not
      await insertClass({
        classId: 'CLASS_1',
        termId: termId1,
        courseId: 'COURSE_1',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_2',
        termId: termId1,
        courseId: 'COURSE_2',
        subjectCode: 'CS',
        courseNumber: '2201',
        title: 'Data Structures',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_3',
        termId: termId1,
        courseId: null,
        subjectCode: 'CS',
        courseNumber: '9999',
        title: 'Orphan',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      const statsResult = await getLinkStatistics(termId1);

      expect(statsResult.success).toBe(true);
      if (statsResult.success) {
        expect(statsResult.data.totalClasses).toBe(3);
        expect(statsResult.data.matched).toBe(2);
        expect(statsResult.data.unmatched).toBe(1);
      }
    });
  });
});
