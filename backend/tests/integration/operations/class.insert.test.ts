import { describe, it, expect, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../setup.js';
import {
  insertClass,
  insertClasses,
  getClassesForTerm,
  deleteStaleClasses,
} from '../../../src/ingestion/operations/class.insert.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { insertTerm } from '../../../src/ingestion/operations/term.insert.js';
import { DbClassInput } from '../../../src/ingestion/transformers/types/db.class.input.js';

describe('Class Insert Operations', () => {
  let academicYearId: number;
  let termId: string;
  let termId2: string;

  beforeEach(async () => {
    // Create academic year
    const yearResult = await createAcademicYear('2024-2025');
    if (yearResult.success) {
      academicYearId = yearResult.data.id;
    }

    // Create terms
    const term1Result = await insertTerm({
      termId: '1248',
      academicYearId,
      name: 'Fall 2024',
    });
    if (term1Result.success) {
      termId = term1Result.data.termId;
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

  describe('insertClass', () => {
    it('should insert a single class', async () => {
      const classData: DbClassInput = {
        classId: 'CLASS_001',
        termId,
        subjectCode: 'CS',
        courseNumber: '101',
        title: 'Introduction to Computer Science',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        description: 'An introduction to computer science.',
        attributes: { level: 'undergraduate' },
        requirements: { prerequisites: [] },
      };

      const result = await insertClass(classData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classId).toBe('CLASS_001');
        expect(result.data.subjectCode).toBe('CS');
        expect(result.data.courseNumber).toBe('101');
      }

      // Verify in database
      const found = await prisma.class.findUnique({
        where: { classId: 'CLASS_001' },
      });

      expect(found).toBeDefined();
      expect(found?.title).toBe('Introduction to Computer Science');
    });

    it('should upsert on unique constraint [termId, subjectCode, courseNumber]', async () => {
      const classData: DbClassInput = {
        classId: 'CLASS_001',
        termId,
        subjectCode: 'CS',
        courseNumber: '101',
        title: 'Introduction to Computer Science',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      };

      // Insert first time
      const result1 = await insertClass(classData);
      expect(result1.success).toBe(true);

      // Insert again with same termId, subject, course number but different classId
      const updatedData: DbClassInput = {
        classId: 'CLASS_001_UPDATED',
        termId,
        subjectCode: 'CS',
        courseNumber: '101',
        title: 'Intro to CS - Updated',
        school: 'Engineering',
        creditsMin: 4,
        creditsMax: 4,
        description: 'Updated description',
        attributes: null,
        requirements: null,
      };

      const result2 = await insertClass(updatedData);
      expect(result2.success).toBe(true);

      // Verify only one record exists with updated data
      const allClasses = await prisma.class.findMany({
        where: {
          termId,
          subjectCode: 'CS',
          courseNumber: '101',
        },
      });

      expect(allClasses).toHaveLength(1);
      expect(allClasses[0].classId).toBe('CLASS_001_UPDATED');
      expect(allClasses[0].title).toBe('Intro to CS - Updated');
      expect(allClasses[0].creditsMin).toBe(4);
    });

    it('should handle null optional fields', async () => {
      const classData: DbClassInput = {
        classId: 'CLASS_002',
        termId,
        subjectCode: 'MATH',
        courseNumber: '101',
        title: 'Calculus I',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      };

      const result = await insertClass(classData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.school).toBeNull();
        expect(result.data.description).toBeNull();
      }
    });
  });

  describe('insertClasses', () => {
    it('should insert multiple classes in batch', async () => {
      const classesData: DbClassInput[] = [
        {
          classId: 'CLASS_001',
          termId,
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
        {
          classId: 'CLASS_002',
          termId,
          subjectCode: 'CS',
          courseNumber: '102',
          title: 'Data Structures',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          classId: 'CLASS_003',
          termId,
          subjectCode: 'MATH',
          courseNumber: '101',
          title: 'Calculus I',
          school: null,
          creditsMin: 4,
          creditsMax: 4,
          description: null,
          attributes: null,
          requirements: null,
        },
      ];

      const result = await insertClasses(classesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }

      const count = await prisma.class.count({ where: { termId } });
      expect(count).toBe(3);
    });

    it('should handle large batch (50+ classes) with batching', async () => {
      const classesData: DbClassInput[] = [];

      for (let i = 0; i < 60; i++) {
        classesData.push({
          classId: `CLASS_${i}`,
          termId,
          subjectCode: 'CS',
          courseNumber: String(100 + i),
          title: `Class ${i}`,
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        });
      }

      const result = await insertClasses(classesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(60);
      }

      const count = await prisma.class.count({ where: { termId } });
      expect(count).toBe(60);
    });

    it('should allow same subject+course in different terms', async () => {
      const class1: DbClassInput = {
        classId: 'CLASS_001_TERM1',
        termId,
        subjectCode: 'CS',
        courseNumber: '101',
        title: 'CS 101 - Fall 2024',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      };

      const class2: DbClassInput = {
        classId: 'CLASS_001_TERM2',
        termId: termId2,
        subjectCode: 'CS',
        courseNumber: '101',
        title: 'CS 101 - Spring 2025',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      };

      const result = await insertClasses([class1, class2]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }

      // Verify both exist
      const term1Classes = await prisma.class.count({
        where: { termId, subjectCode: 'CS', courseNumber: '101' },
      });
      const term2Classes = await prisma.class.count({
        where: { termId: termId2, subjectCode: 'CS', courseNumber: '101' },
      });

      expect(term1Classes).toBe(1);
      expect(term2Classes).toBe(1);
    });
  });

  describe('getClassesForTerm', () => {
    beforeEach(async () => {
      await insertClasses([
        {
          classId: 'CLASS_001',
          termId,
          subjectCode: 'CS',
          courseNumber: '101',
          title: 'CS 101',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          classId: 'CLASS_002',
          termId,
          subjectCode: 'MATH',
          courseNumber: '101',
          title: 'MATH 101',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          classId: 'CLASS_003',
          termId: termId2,
          subjectCode: 'CS',
          courseNumber: '102',
          title: 'CS 102',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
      ]);
    });

    it('should get all classes for a specific term', async () => {
      const result = await getClassesForTerm(termId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((c) => c.classId)).toEqual(['CLASS_001', 'CLASS_002']);
      }
    });

    it('should return classes sorted by subject and course number', async () => {
      const result = await getClassesForTerm(termId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].subjectCode).toBe('CS');
        expect(result.data[1].subjectCode).toBe('MATH');
      }
    });

    it('should isolate classes by term', async () => {
      const term1Result = await getClassesForTerm(termId);
      const term2Result = await getClassesForTerm(termId2);

      expect(term1Result.success).toBe(true);
      expect(term2Result.success).toBe(true);

      if (term1Result.success && term2Result.success) {
        expect(term1Result.data).toHaveLength(2);
        expect(term2Result.data).toHaveLength(1);
        expect(term2Result.data[0].classId).toBe('CLASS_003');
      }
    });
  });

  describe('deleteStaleClasses', () => {
    beforeEach(async () => {
      await insertClasses([
        {
          classId: 'CLASS_001',
          termId,
          subjectCode: 'CS',
          courseNumber: '101',
          title: 'CS 101',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          classId: 'CLASS_002',
          termId,
          subjectCode: 'CS',
          courseNumber: '102',
          title: 'CS 102',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
        {
          classId: 'CLASS_003',
          termId,
          subjectCode: 'MATH',
          courseNumber: '101',
          title: 'MATH 101',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        },
      ]);
    });

    it('should delete classes not in current scrape', async () => {
      // Keep only CLASS_001 and CLASS_003
      const currentClassIds = ['CLASS_001', 'CLASS_003'];

      const result = await deleteStaleClasses(termId, currentClassIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1); // Deleted CLASS_002
      }

      // Verify deletion
      const remaining = await prisma.class.findMany({
        where: { termId },
        orderBy: { classId: 'asc' },
      });

      expect(remaining).toHaveLength(2);
      expect(remaining.map((c) => c.classId)).toEqual(['CLASS_001', 'CLASS_003']);
    });

    it('should delete all classes if current scrape is empty', async () => {
      const result = await deleteStaleClasses(termId, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3); // Deleted all 3 classes
      }

      const count = await prisma.class.count({ where: { termId } });
      expect(count).toBe(0);
    });

    it('should not delete any classes if all are in current scrape', async () => {
      const currentClassIds = ['CLASS_001', 'CLASS_002', 'CLASS_003'];

      const result = await deleteStaleClasses(termId, currentClassIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0); // No deletions
      }

      const count = await prisma.class.count({ where: { termId } });
      expect(count).toBe(3);
    });

    it('should only affect specified term', async () => {
      // Insert a class in term2
      await insertClass({
        classId: 'CLASS_004',
        termId: termId2,
        subjectCode: 'CS',
        courseNumber: '201',
        title: 'CS 201',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      // Delete all classes from term1
      await deleteStaleClasses(termId, []);

      // Verify term1 is empty
      const term1Count = await prisma.class.count({ where: { termId } });
      expect(term1Count).toBe(0);

      // Verify term2 is unaffected
      const term2Count = await prisma.class.count({ where: { termId: termId2 } });
      expect(term2Count).toBe(1);
    });

    it('should cascade delete related sections', async () => {
      // Insert sections for classes
      await prisma.section.createMany({
        data: [
          {
            sectionId: 'SEC_001',
            termId,
            classId: 'CLASS_001',
            sectionNumber: '001',
            sectionType: 'LEC',
            instructors: [],
            schedule: Prisma.JsonNull,
            creditsMin: 3,
            creditsMax: 3,
          },
          {
            sectionId: 'SEC_002',
            termId,
            classId: 'CLASS_002',
            sectionNumber: '001',
            sectionType: 'LEC',
            instructors: [],
            schedule: Prisma.JsonNull,
            creditsMin: 3,
            creditsMax: 3,
          },
        ],
      });

      // Delete CLASS_002
      await deleteStaleClasses(termId, ['CLASS_001', 'CLASS_003']);

      // Verify section for CLASS_002 was deleted
      const section002 = await prisma.section.findUnique({
        where: { sectionId: 'SEC_002' },
      });
      expect(section002).toBeNull();

      // Verify section for CLASS_001 still exists
      const section001 = await prisma.section.findUnique({
        where: { sectionId: 'SEC_001' },
      });
      expect(section001).toBeDefined();
    });
  });
});
