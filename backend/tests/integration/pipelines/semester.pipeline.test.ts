import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../setup.js';
import { ingestSemester } from '../../../src/ingestion/pipelines/semester.pipeline.js';

// Mock external dependencies
vi.mock('../../../src/ingestion/scrapers/functions.js', () => ({
  getTerms: vi.fn(),
  getAllClasses: vi.fn(),
  getAllSections: vi.fn(),
}));

vi.mock('../../../src/ingestion/parsers/parsers/main/class.parser.js', () => ({
  parseClass: vi.fn(),
}));

vi.mock('../../../src/ingestion/parsers/parsers/main/section.parser.js', () => ({
  parseSection: vi.fn(),
}));

import { getTerms, getAllClasses, getAllSections } from '../../../src/ingestion/scrapers/functions.js';
import { parseClass } from '../../../src/ingestion/parsers/parsers/main/class.parser.js';
import { parseSection } from '../../../src/ingestion/parsers/parsers/main/section.parser.js';
import { Term } from '../../../src/ingestion/scrapers/types/term.type.js';
import { SemesterClass } from '../../../src/ingestion/scrapers/types/class.type.js';
import { Section } from '../../../src/ingestion/scrapers/types/section.type.js';

describe('Semester Pipeline Integration Tests', () => {
  // Mock data
  const mockTerms: Term[] = [
    { id: '1246', title: 'Fall 2023' },
    { id: '1247', title: 'Spring 2024' },
    { id: '1248', title: 'Fall 2024' },
    { id: '1249', title: 'Spring 2025' },
  ];

  const mockClasses: SemesterClass[] = [
    {
      id: 'CLASS_001',
      termId: '1248',
      subject: 'CS',
      abbreviation: '101',
      name: 'Introduction to Computer Science',
      details: {
        school: 'Engineering',
        hours: '3 credit hours',
        grading: 'Standard',
        components: ['Lecture'],
        requirements: 'None',
        attributes: ['Core'],
        description: 'An intro to CS',
      },
    },
    {
      id: 'CLASS_002',
      termId: '1248',
      subject: 'MATH',
      abbreviation: '101',
      name: 'Calculus I',
      details: {
        school: 'Arts & Science',
        hours: '4 credit hours',
        grading: 'Standard',
        components: ['Lecture'],
        requirements: null,
        attributes: [],
        description: 'Intro to calculus',
      },
    },
  ];

  const mockSections: Section[] = [
    {
      id: 'SEC_001',
      term: '1248',
      class: {
        subject: 'CS',
        abbreviation: '101',
        name: 'Introduction to Computer Science',
      },
      number: '001',
      instructors: ['Dr. Smith'],
      type: 'LEC',
      schedule: 'MWF 10:00-11:00',
      hours: '3 credit hours',
    },
    {
      id: 'SEC_002',
      term: '1248',
      class: {
        subject: 'CS',
        abbreviation: '101',
        name: 'Introduction to Computer Science',
      },
      number: '002',
      instructors: ['Dr. Jones'],
      type: 'LAB',
      schedule: 'T 14:00-16:00',
      hours: '1 credit hour',
    },
    {
      id: 'SEC_003',
      term: '1248',
      class: {
        subject: 'MATH',
        abbreviation: '101',
        name: 'Calculus I',
      },
      number: '001',
      instructors: ['Dr. Brown'],
      type: 'LEC',
      schedule: 'MWF 09:00-10:00',
      hours: '4 credit hours',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations
    vi.mocked(getTerms).mockResolvedValue(mockTerms);
    vi.mocked(getAllClasses).mockResolvedValue(mockClasses);
    vi.mocked(getAllSections).mockResolvedValue(mockSections);

    // Mock parsers
    vi.mocked(parseClass).mockImplementation(async (cls) => ({
      id: cls.id,
      termId: cls.termId,
      subject: cls.subject,
      abbreviation: cls.abbreviation,
      name: cls.name,
      details: {
        school: cls.details.school,
        credits: { min: 3, max: 3 },
        description: cls.details.description,
        attributes: cls.details.attributes || [],
        requirements: cls.details.requirements || null,
      },
    }));

    vi.mocked(parseSection).mockImplementation((sec) => ({
      id: sec.id,
      term: sec.term,
      class: sec.class,
      number: sec.number,
      type: sec.type,
      instructors: sec.instructors,
      schedule: {
        days: ['M', 'W', 'F'],
        startTime: '10:00',
        endTime: '11:00',
        raw: sec.schedule,
      },
      credits: { min: 3, max: 3 },
    }));
  });

  describe('Complete Pipeline Flow', () => {
    it('should successfully ingest semester with default latest term', async () => {
      const result = await ingestSemester();

      expect(result.success).toBe(true);
      if (result.success) {
        const summary = result.data;

        // Verify term selection
        expect(summary.termId).toBe('1249'); // Spring 2025 is latest
        expect(summary.termName).toBe('Spring 2025');

        // Verify scraping
        expect(summary.classesScraped).toBe(2);
        expect(summary.sectionsScraped).toBe(3);

        // Verify parsing
        expect(summary.classesParsed).toBe(2);
        expect(summary.sectionsParsed).toBe(3);

        // Verify insertion
        expect(summary.classesUpserted).toBe(2);
        expect(summary.sectionsUpserted).toBe(3);

        // Verify no errors
        expect(summary.errors).toBe(0);
      }

      // Verify database state
      const termCount = await prisma.term.count();
      const classCount = await prisma.class.count();
      const sectionCount = await prisma.section.count();

      expect(termCount).toBe(1);
      expect(classCount).toBe(2);
      expect(sectionCount).toBe(3);
    });

    it('should successfully ingest specific term', async () => {
      const result = await ingestSemester('1248'); // Fall 2024

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.termId).toBe('1248');
        expect(result.data.termName).toBe('Fall 2024');
      }

      // Verify correct term was inserted
      const term = await prisma.term.findUnique({
        where: { termId: '1248' },
      });

      expect(term).toBeDefined();
      expect(term?.name).toBe('Fall 2024');
    });

    it('should create academic year and term record', async () => {
      const result = await ingestSemester('1248'); // Fall 2024

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.academicYearId).toBeGreaterThan(0);
      }

      // Verify academic year was created
      const academicYear = await prisma.academicYear.findFirst({
        where: { year: '2024-2025' },
      });

      expect(academicYear).toBeDefined();
      expect(academicYear?.start).toBe(2024);
      expect(academicYear?.end).toBe(2025);

      // Verify term is associated with academic year
      const term = await prisma.term.findUnique({
        where: { termId: '1248' },
      });

      expect(term?.academicYearId).toBe(academicYear?.id);
    });

    it('should map sections to correct classes via classId', async () => {
      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);

      // Get inserted classes
      const csClass = await prisma.class.findFirst({
        where: { subjectCode: 'CS', courseNumber: '101' },
      });

      const mathClass = await prisma.class.findFirst({
        where: { subjectCode: 'MATH', courseNumber: '101' },
      });

      expect(csClass).toBeDefined();
      expect(mathClass).toBeDefined();

      // Verify sections are mapped to correct classes
      const csSections = await prisma.section.findMany({
        where: { classId: csClass!.classId },
      });

      const mathSections = await prisma.section.findMany({
        where: { classId: mathClass!.classId },
      });

      expect(csSections).toHaveLength(2); // SEC_001, SEC_002
      expect(mathSections).toHaveLength(1); // SEC_003
    });
  });

  describe('Stale Data Cleanup', () => {
    it('should delete stale classes not in current scrape', async () => {
      // First run: insert initial data
      await ingestSemester('1248');

      // Verify initial data
      const initialClassCount = await prisma.class.count();
      expect(initialClassCount).toBe(2);

      // Second run: mock with only one class
      vi.mocked(getAllClasses).mockResolvedValue([mockClasses[0]]);
      vi.mocked(getAllSections).mockResolvedValue([mockSections[0], mockSections[1]]);

      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classesDeleted).toBe(1); // MATH 101 deleted
      }

      // Verify MATH class was deleted
      const finalClassCount = await prisma.class.count();
      expect(finalClassCount).toBe(1);

      const mathClass = await prisma.class.findFirst({
        where: { subjectCode: 'MATH' },
      });
      expect(mathClass).toBeNull();
    });

    it('should delete stale sections not in current scrape', async () => {
      // First run
      await ingestSemester('1248');

      const initialSectionCount = await prisma.section.count();
      expect(initialSectionCount).toBe(3);

      // Second run: mock with only two sections
      vi.mocked(getAllSections).mockResolvedValue([mockSections[0], mockSections[2]]);

      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sectionsDeleted).toBe(1); // SEC_002 deleted
      }

      // Verify section was deleted
      const finalSectionCount = await prisma.section.count();
      expect(finalSectionCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should return failure for no terms available', async () => {
      vi.mocked(getTerms).mockResolvedValue([]);

      const result = await ingestSemester();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_TERMS_FOUND');
      }
    });

    it('should return failure for invalid termId', async () => {
      const result = await ingestSemester('INVALID_TERM');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TERM_NOT_FOUND');
      }
    });

    it('should return failure when all classes fail to parse', async () => {
      vi.mocked(parseClass).mockRejectedValue(new Error('Parse failed'));

      const result = await ingestSemester('1248');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ALL_FAILED');
      }
    });

    it('should handle partial parse failures gracefully', async () => {
      // First class succeeds, second fails
      vi.mocked(parseClass)
        .mockResolvedValueOnce({
          id: 'CLASS_001',
          termId: '1248',
          subject: 'CS',
          abbreviation: '101',
          name: 'Intro to CS',
          details: {
            school: null,
            credits: { min: 3, max: 3 },
            description: null,
            attributes: [],
            requirements: null,
          },
        })
        .mockRejectedValueOnce(new Error('Parse failed'));

      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classesScraped).toBe(2);
        expect(result.data.classesParsed).toBe(1);
        expect(result.data.errors).toBeGreaterThan(0);
      }

      // Verify only successful class was inserted
      const classCount = await prisma.class.count();
      expect(classCount).toBe(1);
    });

    it('should handle no classes found gracefully', async () => {
      vi.mocked(getAllClasses).mockResolvedValue([]);
      vi.mocked(getAllSections).mockResolvedValue([]);

      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classesScraped).toBe(0);
        expect(result.data.classesUpserted).toBe(0);
        expect(result.data.sectionsUpserted).toBe(0);
      }
    });

    it('should handle section mapping errors when class not found', async () => {
      // Mock section for a class that doesn't exist
      const orphanSection: Section = {
        id: 'SEC_ORPHAN',
        term: '1248',
        class: {
          subject: 'NONEXISTENT',
          abbreviation: '999',
          name: 'Nonexistent Class',
        },
        number: '001',
        instructors: [],
        type: 'LEC',
        schedule: 'TBA',
        hours: '3 credit hours',
      };

      vi.mocked(getAllSections).mockResolvedValue([...mockSections, orphanSection]);

      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sectionsScraped).toBe(4);
        expect(result.data.sectionsParsed).toBe(4);
        expect(result.data.sectionsUpserted).toBe(3); // Orphan not inserted
        expect(result.data.errors).toBeGreaterThan(0);
      }
    });
  });

  describe('Academic Year Mapping', () => {
    it('should map Fall term to same year academic year', async () => {
      const result = await ingestSemester('1248'); // Fall 2024

      expect(result.success).toBe(true);

      const academicYear = await prisma.academicYear.findFirst({
        where: { year: '2024-2025' },
      });

      expect(academicYear).toBeDefined();
    });

    it('should map Spring term to previous year academic year', async () => {
      const result = await ingestSemester('1249'); // Spring 2025

      expect(result.success).toBe(true);

      const academicYear = await prisma.academicYear.findFirst({
        where: { year: '2024-2025' },
      });

      expect(academicYear).toBeDefined();
    });

    it('should reuse existing academic year', async () => {
      // Run twice for same academic year
      await ingestSemester('1248'); // Fall 2024 → 2024-2025
      await ingestSemester('1249'); // Spring 2025 → 2024-2025

      const academicYearCount = await prisma.academicYear.count({
        where: { year: '2024-2025' },
      });

      expect(academicYearCount).toBe(1); // Only one academic year created
    });
  });

  describe('Parallel Scraping', () => {
    it('should scrape classes and sections in parallel', async () => {
      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);

      // Verify both scrapers were called
      expect(getAllClasses).toHaveBeenCalledTimes(1);
      expect(getAllSections).toHaveBeenCalledTimes(1);

      // Verify they were called with the term object
      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1248', title: 'Fall 2024' }),
        expect.any(Function)
      );
      expect(getAllSections).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1248', title: 'Fall 2024' }),
        expect.any(Function)
      );
    });
  });

  describe('Summary Object', () => {
    it('should return accurate summary counts', async () => {
      const result = await ingestSemester('1248');

      expect(result.success).toBe(true);
      if (result.success) {
        const summary = result.data;

        expect(summary.termId).toBe('1248');
        expect(summary.termName).toBe('Fall 2024');
        expect(summary.academicYearId).toBeGreaterThan(0);

        expect(summary.classesScraped).toBe(2);
        expect(summary.classesParsed).toBe(2);
        expect(summary.classesUpserted).toBe(2);
        expect(summary.classesDeleted).toBe(0);

        expect(summary.sectionsScraped).toBe(3);
        expect(summary.sectionsParsed).toBe(3);
        expect(summary.sectionsUpserted).toBe(3);
        expect(summary.sectionsDeleted).toBe(0);

        expect(summary.errors).toBe(0);
        expect(summary.duration).toBeGreaterThan(0);
      }
    });
  });
});
