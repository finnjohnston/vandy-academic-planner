import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import { linkCoursesToClasses } from '../../../src/ingestion/pipelines/link.pipeline.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { insertTerm } from '../../../src/ingestion/operations/term.insert.js';
import { insertCourse } from '../../../src/ingestion/operations/course.insert.js';
import { insertClass } from '../../../src/ingestion/operations/class.insert.js';

describe('Link Pipeline', () => {
  let academicYearId: number;
  let termId1: string;
  let termId2: string;

  beforeEach(async () => {
    // Create academic year
    const yearResult = await createAcademicYear('2024-2025');
    if (yearResult.success) {
      academicYearId = yearResult.data.id;
    }

    // Create two terms
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

  describe('linkCoursesToClasses', () => {
    it('should link all classes in a specific term', async () => {
      // Create courses
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

      await insertCourse({
        courseId: 'COURSE_MATH_1101',
        academicYearId,
        subjectCode: 'MATH',
        courseNumber: '1101',
        title: 'Calculus',
        school: null,
        creditsMin: 4,
        creditsMax: 4,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create classes without courseId
      await insertClass({
        classId: 'CLASS_CS_1101',
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

      await insertClass({
        classId: 'CLASS_MATH_1101',
        termId: termId1,
        courseId: null,
        subjectCode: 'MATH',
        courseNumber: '1101',
        title: 'Calculus',
        school: null,
        creditsMin: 4,
        creditsMax: 4,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Run linking for specific term
      const result = await linkCoursesToClasses(termId1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.termsProcessed).toBe(1);
        expect(result.data.totalClasses).toBe(2);
        expect(result.data.matched).toBe(2);
        expect(result.data.unmatched).toBe(0);
        expect(result.data.updated).toBe(2);
      }

      // Verify in database
      const csClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101' },
        select: { courseId: true },
      });
      const mathClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_MATH_1101' },
        select: { courseId: true },
      });

      expect(csClass?.courseId).toBe('COURSE_CS_1101');
      expect(mathClass?.courseId).toBe('COURSE_MATH_1101');
    });

    it('should link all classes in an academic year', async () => {
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

      await insertClass({
        classId: 'CLASS_CS_1101_SPRING',
        termId: termId2,
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

      // Run linking for academic year
      const result = await linkCoursesToClasses(undefined, '2024-2025');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.termsProcessed).toBe(2);
        expect(result.data.totalClasses).toBe(2);
        expect(result.data.matched).toBe(2);
        expect(result.data.unmatched).toBe(0);
      }

      // Verify both classes linked
      const fallClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101_FALL' },
        select: { courseId: true },
      });
      const springClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101_SPRING' },
        select: { courseId: true },
      });

      expect(fallClass?.courseId).toBe('COURSE_CS_1101');
      expect(springClass?.courseId).toBe('COURSE_CS_1101');
    });

    it('should handle orphan classes (courseId remains null)', async () => {
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

      await insertClass({
        classId: 'CLASS_ORPHAN',
        termId: termId1,
        courseId: null,
        subjectCode: 'CS',
        courseNumber: '9999',
        title: 'Experimental',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Run linking
      const result = await linkCoursesToClasses(termId1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalClasses).toBe(2);
        expect(result.data.matched).toBe(1);
        expect(result.data.unmatched).toBe(1);
      }

      // Verify
      const csClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101' },
        select: { courseId: true },
      });
      const orphanClass = await prisma.class.findUnique({
        where: { classId: 'CLASS_ORPHAN' },
        select: { courseId: true },
      });

      expect(csClass?.courseId).toBe('COURSE_CS_1101');
      expect(orphanClass?.courseId).toBeNull();
    });

    it('should report correct statistics', async () => {
      // Create courses
      await insertCourse({
        courseId: 'COURSE_1',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Course 1',
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
        title: 'Course 2',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create 3 classes - 2 matching, 1 orphan
      await insertClass({
        classId: 'CLASS_1',
        termId: termId1,
        courseId: null,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Class 1',
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
        courseId: null,
        subjectCode: 'CS',
        courseNumber: '2201',
        title: 'Class 2',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      await insertClass({
        classId: 'CLASS_ORPHAN',
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

      // Run linking
      const result = await linkCoursesToClasses(termId1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          termsProcessed: 1,
          totalClasses: 3,
          matched: 2,
          unmatched: 1,
          updated: 3,
        });
      }
    });

    it('should re-link and update existing courseIds', async () => {
      // Create the correct course
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

      // Create a wrong course that the class is initially linked to
      await insertCourse({
        courseId: 'WRONG_COURSE_ID',
        academicYearId,
        subjectCode: 'WRONG',
        courseNumber: '9999',
        title: 'Wrong Course',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: null,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Create class linked to wrong courseId
      await insertClass({
        classId: 'CLASS_CS_1101',
        termId: termId1,
        courseId: 'WRONG_COURSE_ID',
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

      // Verify wrong courseId
      const classBefore = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101' },
        select: { courseId: true },
      });
      expect(classBefore?.courseId).toBe('WRONG_COURSE_ID');

      // Run linking to fix
      const result = await linkCoursesToClasses(termId1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updated).toBe(1);
      }

      // Verify corrected
      const classAfter = await prisma.class.findUnique({
        where: { classId: 'CLASS_CS_1101' },
        select: { courseId: true },
      });
      expect(classAfter?.courseId).toBe('COURSE_CS_1101');
    });
  });
});
