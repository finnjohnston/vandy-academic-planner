import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import {
  insertSection,
  insertSections,
  getSectionsForTerm,
  getSectionsForClass,
  deleteStaleSections,
  DbSectionWithClass,
} from '../../../src/ingestion/operations/section.insert.js';
import { createAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';
import { insertTerm } from '../../../src/ingestion/operations/term.insert.js';
import { insertClass } from '../../../src/ingestion/operations/class.insert.js';

describe('Section Insert Operations', () => {
  let academicYearId: number;
  let termId: string;
  let classId1: string;
  let classId2: string;

  beforeEach(async () => {
    // Create academic year
    const yearResult = await createAcademicYear('2024-2025');
    if (yearResult.success) {
      academicYearId = yearResult.data.id;
    }

    // Create term
    const termResult = await insertTerm({
      termId: '1248',
      academicYearId,
      name: 'Fall 2024',
    });
    if (termResult.success) {
      termId = termResult.data.termId;
    }

    // Create classes
    const class1Result = await insertClass({
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
    });
    if (class1Result.success) {
      classId1 = class1Result.data.classId;
    }

    const class2Result = await insertClass({
      classId: 'CLASS_002',
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
    });
    if (class2Result.success) {
      classId2 = class2Result.data.classId;
    }
  });

  describe('insertSection', () => {
    it('should insert a single section with classId', async () => {
      const sectionData: DbSectionWithClass = {
        sectionId: 'SEC_001',
        termId,
        classId: classId1,
        sectionNumber: '001',
        sectionType: 'LEC',
        instructors: [{ name: 'Dr. Smith' }],
        schedule: { days: ['M', 'W', 'F'], time: '10:00-11:00' },
        creditsMin: 3,
        creditsMax: 3,
      };

      const result = await insertSection(sectionData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sectionId).toBe('SEC_001');
        expect(result.data.classId).toBe(classId1);
        expect(result.data.sectionNumber).toBe('001');
      }

      // Verify in database
      const found = await prisma.section.findUnique({
        where: {
          termId_sectionId: {
            termId,
            sectionId: 'SEC_001',
          },
        },
      });

      expect(found).toBeDefined();
      expect(found?.classId).toBe(classId1);
    });

    it('should upsert on unique constraint [termId, sectionId]', async () => {
      const sectionData: DbSectionWithClass = {
        sectionId: 'SEC_001',
        termId,
        classId: classId1,
        sectionNumber: '001',
        sectionType: 'LEC',
        instructors: [],
        schedule: null,
        creditsMin: 3,
        creditsMax: 3,
      };

      // Insert first time
      const result1 = await insertSection(sectionData);
      expect(result1.success).toBe(true);

      // Insert again with updated data
      const updatedData: DbSectionWithClass = {
        sectionId: 'SEC_001',
        termId,
        classId: classId1,
        sectionNumber: '002', // Changed
        sectionType: 'LAB', // Changed
        instructors: [{ name: 'Dr. Jones' }],
        schedule: { days: ['T', 'TH'] },
        creditsMin: 1,
        creditsMax: 1,
      };

      const result2 = await insertSection(updatedData);
      expect(result2.success).toBe(true);

      // Verify only one record exists with updated data
      const allSections = await prisma.section.findMany({
        where: { sectionId: 'SEC_001' },
      });

      expect(allSections).toHaveLength(1);
      expect(allSections[0].sectionNumber).toBe('002');
      expect(allSections[0].sectionType).toBe('LAB');
      expect(allSections[0].creditsMin).toBe(1);
    });

    it('should handle null schedule', async () => {
      const sectionData: DbSectionWithClass = {
        sectionId: 'SEC_002',
        termId,
        classId: classId1,
        sectionNumber: '001',
        sectionType: 'LEC',
        instructors: [],
        schedule: null,
        creditsMin: 3,
        creditsMax: 3,
      };

      const result = await insertSection(sectionData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schedule).toBeNull();
      }
    });

    it('should maintain foreign key relationships', async () => {
      const sectionData: DbSectionWithClass = {
        sectionId: 'SEC_003',
        termId,
        classId: classId1,
        sectionNumber: '001',
        sectionType: 'LEC',
        instructors: [],
        schedule: null,
        creditsMin: 3,
        creditsMax: 3,
      };

      const result = await insertSection(sectionData);
      expect(result.success).toBe(true);

      // Verify relationships
      const section = await prisma.section.findUnique({
        where: {
          termId_sectionId: {
            termId,
            sectionId: 'SEC_003',
          },
        },
        include: {
          term: true,
          class: true,
        },
      });

      expect(section).toBeDefined();
      expect(section?.term.termId).toBe(termId);
      expect(section?.class.classId).toBe(classId1);
    });

    it('should allow same sectionId across different terms', async () => {
      // Create a second term
      const term2Result = await insertTerm({
        termId: '1249',
        academicYearId,
        name: 'Spring 2025',
      });

      expect(term2Result.success).toBe(true);
      if (!term2Result.success) return;

      const term2Id = term2Result.data.termId;

      // Create a class for the second term
      const class3Result = await insertClass({
        classId: 'CLASS_003',
        termId: term2Id,
        subjectCode: 'MATH',
        courseNumber: '201',
        title: 'Advanced Calculus',
        school: null,
        creditsMin: 3,
        creditsMax: 3,
        description: null,
        attributes: null,
        requirements: null,
      });

      expect(class3Result.success).toBe(true);
      if (!class3Result.success) return;

      const class3Id = class3Result.data.classId;

      // Insert section with sectionId 'SHARED_001' in first term
      const section1Data: DbSectionWithClass = {
        sectionId: 'SHARED_001',
        termId,
        classId: classId1,
        sectionNumber: '001',
        sectionType: 'LEC',
        instructors: [{ name: 'Dr. Smith' }],
        schedule: { days: ['M', 'W', 'F'], time: '10:00-11:00' },
        creditsMin: 3,
        creditsMax: 3,
      };

      const result1 = await insertSection(section1Data);
      expect(result1.success).toBe(true);

      // Insert section with SAME sectionId 'SHARED_001' in second term (different class)
      const section2Data: DbSectionWithClass = {
        sectionId: 'SHARED_001', // Same sectionId
        termId: term2Id,
        classId: class3Id,
        sectionNumber: '002',
        sectionType: 'LAB',
        instructors: [{ name: 'Dr. Jones' }],
        schedule: { days: ['T', 'TH'], time: '14:00-15:00' },
        creditsMin: 4,
        creditsMax: 4,
      };

      const result2 = await insertSection(section2Data);
      expect(result2.success).toBe(true);

      // Verify both sections exist independently
      const allSections = await prisma.section.findMany({
        where: { sectionId: 'SHARED_001' },
        orderBy: { termId: 'asc' },
      });

      expect(allSections).toHaveLength(2);

      // Verify first term's section is unchanged
      const term1Section = await prisma.section.findUnique({
        where: {
          termId_sectionId: {
            termId,
            sectionId: 'SHARED_001',
          },
        },
      });

      expect(term1Section).toBeDefined();
      expect(term1Section?.classId).toBe(classId1);
      expect(term1Section?.sectionNumber).toBe('001');
      expect(term1Section?.sectionType).toBe('LEC');
      expect(term1Section?.creditsMin).toBe(3);

      // Verify second term's section is correct
      const term2Section = await prisma.section.findUnique({
        where: {
          termId_sectionId: {
            termId: term2Id,
            sectionId: 'SHARED_001',
          },
        },
      });

      expect(term2Section).toBeDefined();
      expect(term2Section?.classId).toBe(class3Id);
      expect(term2Section?.sectionNumber).toBe('002');
      expect(term2Section?.sectionType).toBe('LAB');
      expect(term2Section?.creditsMin).toBe(4);
    });
  });

  describe('insertSections', () => {
    it('should insert multiple sections in batch', async () => {
      const sectionsData: DbSectionWithClass[] = [
        {
          sectionId: 'SEC_001',
          termId,
          classId: classId1,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
        {
          sectionId: 'SEC_002',
          termId,
          classId: classId1,
          sectionNumber: '002',
          sectionType: 'LAB',
          instructors: [],
          schedule: null,
          creditsMin: 1,
          creditsMax: 1,
        },
        {
          sectionId: 'SEC_003',
          termId,
          classId: classId2,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 4,
          creditsMax: 4,
        },
      ];

      const result = await insertSections(sectionsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }

      const count = await prisma.section.count({ where: { termId } });
      expect(count).toBe(3);
    });

    it('should handle large batch (50+ sections) with batching', async () => {
      const sectionsData: DbSectionWithClass[] = [];

      for (let i = 0; i < 60; i++) {
        sectionsData.push({
          sectionId: `SEC_${i}`,
          termId,
          classId: classId1,
          sectionNumber: String(i).padStart(3, '0'),
          sectionType: i % 2 === 0 ? 'LEC' : 'LAB',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        });
      }

      const result = await insertSections(sectionsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(60);
      }

      const count = await prisma.section.count({ where: { classId: classId1 } });
      expect(count).toBe(60);
    });

    it('should handle sections for different classes', async () => {
      const sectionsData: DbSectionWithClass[] = [
        {
          sectionId: 'SEC_001',
          termId,
          classId: classId1,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
        {
          sectionId: 'SEC_002',
          termId,
          classId: classId2,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 4,
          creditsMax: 4,
        },
      ];

      const result = await insertSections(sectionsData);

      expect(result.success).toBe(true);

      const class1Sections = await prisma.section.count({ where: { classId: classId1 } });
      const class2Sections = await prisma.section.count({ where: { classId: classId2 } });

      expect(class1Sections).toBe(1);
      expect(class2Sections).toBe(1);
    });
  });

  describe('getSectionsForTerm', () => {
    beforeEach(async () => {
      await insertSections([
        {
          sectionId: 'SEC_001',
          termId,
          classId: classId1,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
        {
          sectionId: 'SEC_002',
          termId,
          classId: classId1,
          sectionNumber: '002',
          sectionType: 'LAB',
          instructors: [],
          schedule: null,
          creditsMin: 1,
          creditsMax: 1,
        },
        {
          sectionId: 'SEC_003',
          termId,
          classId: classId2,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 4,
          creditsMax: 4,
        },
      ]);
    });

    it('should get all sections for a specific term', async () => {
      const result = await getSectionsForTerm(termId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data.map((s) => s.sectionId)).toEqual(['SEC_001', 'SEC_002', 'SEC_003']);
      }
    });

    it('should return sections sorted by section number', async () => {
      const result = await getSectionsForTerm(termId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].sectionNumber).toBe('001');
        expect(result.data[1].sectionNumber).toBe('002');
      }
    });
  });

  describe('getSectionsForClass', () => {
    beforeEach(async () => {
      await insertSections([
        {
          sectionId: 'SEC_001',
          termId,
          classId: classId1,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
        {
          sectionId: 'SEC_002',
          termId,
          classId: classId1,
          sectionNumber: '002',
          sectionType: 'LAB',
          instructors: [],
          schedule: null,
          creditsMin: 1,
          creditsMax: 1,
        },
        {
          sectionId: 'SEC_003',
          termId,
          classId: classId2,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 4,
          creditsMax: 4,
        },
      ]);
    });

    it('should get all sections for a specific class', async () => {
      const result = await getSectionsForClass(classId1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((s) => s.sectionId)).toEqual(['SEC_001', 'SEC_002']);
      }
    });

    it('should isolate sections by class', async () => {
      const class1Result = await getSectionsForClass(classId1);
      const class2Result = await getSectionsForClass(classId2);

      expect(class1Result.success).toBe(true);
      expect(class2Result.success).toBe(true);

      if (class1Result.success && class2Result.success) {
        expect(class1Result.data).toHaveLength(2);
        expect(class2Result.data).toHaveLength(1);
        expect(class2Result.data[0].sectionId).toBe('SEC_003');
      }
    });
  });

  describe('deleteStaleSections', () => {
    beforeEach(async () => {
      await insertSections([
        {
          sectionId: 'SEC_001',
          termId,
          classId: classId1,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 3,
          creditsMax: 3,
        },
        {
          sectionId: 'SEC_002',
          termId,
          classId: classId1,
          sectionNumber: '002',
          sectionType: 'LAB',
          instructors: [],
          schedule: null,
          creditsMin: 1,
          creditsMax: 1,
        },
        {
          sectionId: 'SEC_003',
          termId,
          classId: classId2,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [],
          schedule: null,
          creditsMin: 4,
          creditsMax: 4,
        },
      ]);
    });

    it('should delete sections not in current scrape', async () => {
      // Keep only SEC_001 and SEC_003
      const currentSectionIds = ['SEC_001', 'SEC_003'];

      const result = await deleteStaleSections(termId, currentSectionIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1); // Deleted SEC_002
      }

      // Verify deletion
      const remaining = await prisma.section.findMany({
        where: { termId },
        orderBy: { sectionId: 'asc' },
      });

      expect(remaining).toHaveLength(2);
      expect(remaining.map((s) => s.sectionId)).toEqual(['SEC_001', 'SEC_003']);
    });

    it('should delete all sections if current scrape is empty', async () => {
      const result = await deleteStaleSections(termId, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3); // Deleted all 3 sections
      }

      const count = await prisma.section.count({ where: { termId } });
      expect(count).toBe(0);
    });

    it('should not delete any sections if all are in current scrape', async () => {
      const currentSectionIds = ['SEC_001', 'SEC_002', 'SEC_003'];

      const result = await deleteStaleSections(termId, currentSectionIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0); // No deletions
      }

      const count = await prisma.section.count({ where: { termId } });
      expect(count).toBe(3);
    });

    it('should only affect specified term', async () => {
      // Create another term with sections
      const term2Result = await insertTerm({
        termId: '1249',
        academicYearId,
        name: 'Spring 2025',
      });

      if (term2Result.success) {
        const class3Result = await insertClass({
          classId: 'CLASS_003',
          termId: term2Result.data.termId,
          subjectCode: 'CS',
          courseNumber: '201',
          title: 'Advanced CS',
          school: null,
          creditsMin: 3,
          creditsMax: 3,
          description: null,
          attributes: null,
          requirements: null,
        });

        if (class3Result.success) {
          await insertSection({
            sectionId: 'SEC_004',
            termId: term2Result.data.termId,
            classId: class3Result.data.classId,
            sectionNumber: '001',
            sectionType: 'LEC',
            instructors: [],
            schedule: null,
            creditsMin: 3,
            creditsMax: 3,
          });

          // Delete all sections from term1
          await deleteStaleSections(termId, []);

          // Verify term1 is empty
          const term1Count = await prisma.section.count({ where: { termId } });
          expect(term1Count).toBe(0);

          // Verify term2 is unaffected
          const term2Count = await prisma.section.count({
            where: { termId: term2Result.data.termId },
          });
          expect(term2Count).toBe(1);
        }
      }
    });
  });
});
