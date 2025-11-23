import { describe, it, expect } from 'vitest';
import { prisma } from '../setup.js';

describe('Database Insert Integration Tests', () => {
  describe('Academic Year and Term Insertion', () => {
    it('should insert an academic year', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
          isCurrent: true,
        },
      });

      expect(academicYear).toBeDefined();
      expect(academicYear.id).toBeTypeOf('number');
      expect(academicYear.year).toBe('2024-2025');
      expect(academicYear.start).toBe(2024);
      expect(academicYear.end).toBe(2025);
      expect(academicYear.isCurrent).toBe(true);

      const found = await prisma.academicYear.findUnique({
        where: { year: '2024-2025' },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(academicYear.id);
      expect(found?.isCurrent).toBe(true);
    });

    it('should insert a term with academic year relation', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      expect(term).toBeDefined();
      expect(term.termId).toBe('1248');
      expect(term.academicYearId).toBe(academicYear.id);

      const found = await prisma.term.findUnique({
        where: { termId: '1248' },
        include: { academicYear: true },
      });

      expect(found).toBeDefined();
      expect(found?.academicYear.year).toBe('2024-2025');
    });
  });

  describe('Course Insertion', () => {
    it('should insert a course with all fields', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const course = await prisma.course.create({
        data: {
          courseId: '102715',
          academicYearId: academicYear.id,
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
          isCatalogCourse: true,
        },
      });

      expect(course).toBeDefined();
      expect(course.courseId).toBe('102715');
      expect(course.subjectCode).toBe('CS');
      expect(course.courseNumber).toBe('1101');
      expect(course.creditsMin).toBe(3.0);
      expect(course.attributes).toBeDefined();
      expect(course.requirements).toBeDefined();
    });

    it('should enforce unique constraint on academicYearId, subjectCode, courseNumber', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      await prisma.course.create({
        data: {
          courseId: '102715',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      await expect(
        prisma.course.create({
          data: {
            courseId: '102716', // Different courseId
            academicYearId: academicYear.id,
            subjectCode: 'CS',
            courseNumber: '1101', // Same combination
            title: 'Different Title',
            creditsMin: 3.0,
            creditsMax: 3.0,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Class Insertion', () => {
    it('should insert a class with all fields', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      const classData = await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          school: 'School of Engineering',
          creditsMin: 3.0,
          creditsMax: 3.0,
          description: 'Introduction to programming.',
          attributes: {
            axle: ['AXLE: Mathematics and Natural Sciences'],
          },
          requirements: {
            prerequisites: {
              rawText: 'Prerequisite: MATH 1300',
              courses: 'MATH 1300',
            },
          },
        },
      });

      expect(classData).toBeDefined();
      expect(classData.classId).toBe('102715-1248');
      expect(classData.termId).toBe('1248');
      expect(classData.subjectCode).toBe('CS');

      const found = await prisma.class.findUnique({
        where: { classId: '102715-1248' },
        include: { term: true },
      });

      expect(found).toBeDefined();
      expect(found?.term.name).toBe('Fall 2024');
    });

    it('should enforce unique constraint on termId, subjectCode, courseNumber, title', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      await expect(
        prisma.class.create({
          data: {
            classId: '102716-1248', // Different classId
            termId: term.termId,
            subjectCode: 'CS',
            courseNumber: '1101', // Same combination
            title: 'Programming and Problem Solving', // Same title - should violate constraint
            creditsMin: 3.0,
            creditsMax: 3.0,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Section Insertion', () => {
    it('should insert a section with all fields', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      const classData = await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      const section = await prisma.section.create({
        data: {
          sectionId: '102715-1248-001',
          termId: term.termId,
          classId: classData.classId,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [
            {
              name: 'John Doe',
              email: 'john.doe@vanderbilt.edu',
            },
          ],
          schedule: {
            days: ['Monday', 'Wednesday', 'Friday'],
            startTime: '09:00',
            endTime: '09:50',
            location: 'Featheringill Hall 134',
          },
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      expect(section).toBeDefined();
      expect(section.sectionId).toBe('102715-1248-001');
      expect(section.sectionNumber).toBe('001');
      expect(section.sectionType).toBe('LEC');
      expect(section.instructors).toBeDefined();
      expect(section.schedule).toBeDefined();

      const found = await prisma.section.findUnique({
        where: { sectionId: '102715-1248-001' },
        include: {
          term: true,
          class: true,
        },
      });

      expect(found).toBeDefined();
      expect(found?.term.name).toBe('Fall 2024');
      expect(found?.class.title).toBe('Programming and Problem Solving');
    });

    it('should allow multiple sections for the same class', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      const classData = await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      const section1 = await prisma.section.create({
        data: {
          sectionId: '102715-1248-001',
          termId: term.termId,
          classId: classData.classId,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [{ name: 'John Doe' }],
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      const section2 = await prisma.section.create({
        data: {
          sectionId: '102715-1248-002',
          termId: term.termId,
          classId: classData.classId,
          sectionNumber: '002',
          sectionType: 'LEC',
          instructors: [{ name: 'Jane Smith' }],
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      expect(section1.classId).toBe(section2.classId);

      const sections = await prisma.section.findMany({
        where: { classId: classData.classId },
      });

      expect(sections).toHaveLength(2);
    });
  });

  describe('Cascade Delete Tests', () => {
    it('should cascade delete terms when academic year is deleted', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      await prisma.academicYear.delete({
        where: { id: academicYear.id },
      });

      const term = await prisma.term.findUnique({
        where: { termId: '1248' },
      });

      expect(term).toBeNull();
    });

    it('should cascade delete sections when class is deleted', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      const classData = await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      await prisma.section.create({
        data: {
          sectionId: '102715-1248-001',
          termId: term.termId,
          classId: classData.classId,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [{ name: 'John Doe' }],
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      await prisma.class.delete({
        where: { classId: classData.classId },
      });

      const section = await prisma.section.findUnique({
        where: { sectionId: '102715-1248-001' },
      });

      expect(section).toBeNull();
    });
  });

  describe('Full Workflow Test', () => {
    it('should insert a complete academic structure', async () => {
      const academicYear = await prisma.academicYear.create({
        data: {
          year: '2024-2025',
          start: 2024,
          end: 2025,
          isCurrent: true,
        },
      });

      const term = await prisma.term.create({
        data: {
          termId: '1248',
          academicYearId: academicYear.id,
          name: 'Fall 2024',
        },
      });

      const course = await prisma.course.create({
        data: {
          courseId: '102715',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      const classData = await prisma.class.create({
        data: {
          classId: '102715-1248',
          termId: term.termId,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      const section = await prisma.section.create({
        data: {
          sectionId: '102715-1248-001',
          termId: term.termId,
          classId: classData.classId,
          sectionNumber: '001',
          sectionType: 'LEC',
          instructors: [{ name: 'John Doe' }],
          creditsMin: 3.0,
          creditsMax: 3.0,
        },
      });

      expect(academicYear.id).toBeDefined();
      expect(term.id).toBeDefined();
      expect(course.id).toBeDefined();
      expect(classData.id).toBeDefined();
      expect(section.id).toBeDefined();

      const allData = await prisma.academicYear.findUnique({
        where: { id: academicYear.id },
        include: {
          terms: {
            include: {
              classes: {
                include: {
                  sections: true,
                },
              },
            },
          },
          courses: true,
        },
      });

      expect(allData).toBeDefined();
      expect(allData?.terms).toHaveLength(1);
      expect(allData?.courses).toHaveLength(1);
      expect(allData?.terms[0].classes).toHaveLength(1);
      expect(allData?.terms[0].classes[0].sections).toHaveLength(1);
    });
  });
});
