import { describe, it, expect } from 'vitest';
import { transformSectionForDb } from '../../../src/ingestion/transformers/index.js';
import { ParsedSection } from '../../../src/ingestion/parsers/types/main/parsed.section.type.js';

describe('transformSectionForDb', () => {
  it('should transform a complete parsed section to database format', () => {
    const parsed: ParsedSection = {
      id: 'section-12345',
      term: '1040',
      class: {
        subject: 'CS',
        abbreviation: '1101',
        name: 'Programming and Problem Solving',
      },
      number: '01',
      instructors: ['John Doe'],
      type: 'Lecture',
      schedule: {
        days: ['M', 'W', 'F'],
        startTime: '10:00',
        endTime: '10:50',
        raw: 'MWF 10:00AM - 10:50AM',
      },
      credits: {
        min: 3.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    expect(result).toEqual({
      sectionId: 'section-12345',
      termId: '1040',
      sectionNumber: '01',
      sectionType: 'Lecture',
      creditsMin: 3.0,
      creditsMax: 3.0,
      instructors: ['John Doe'],
      schedule: {
        days: ['M', 'W', 'F'],
        startTime: '10:00',
        endTime: '10:50',
        raw: 'MWF 10:00AM - 10:50AM',
      },
    });
  });

  it('should transform section with multiple instructors', () => {
    const parsed: ParsedSection = {
      id: 'section-67890',
      term: '1040',
      class: {
        subject: 'MATH',
        abbreviation: '1300',
        name: 'Calculus I',
      },
      number: '02',
      instructors: ['Jane Smith', 'Bob Johnson'],
      type: 'Lecture',
      schedule: {
        days: ['T', 'R'],
        startTime: '14:00',
        endTime: '15:15',
        raw: 'TR 2:00PM - 3:15PM',
      },
      credits: {
        min: 4.0,
        max: 4.0,
      },
    };

    const result = transformSectionForDb(parsed);

    expect(result.instructors).toEqual(['Jane Smith', 'Bob Johnson']);
  });

  it('should transform section with variable credits', () => {
    const parsed: ParsedSection = {
      id: 'section-111',
      term: '1040',
      class: {
        subject: 'MUSL',
        abbreviation: '1220',
        name: 'Private Instruction',
      },
      number: '03',
      instructors: ['Professor Music'],
      type: 'Private Instruction',
      schedule: {
        days: [],
        startTime: '',
        endTime: '',
        raw: 'By Arrangement',
      },
      credits: {
        min: 1.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    expect(result.creditsMin).toBe(1.0);
    expect(result.creditsMax).toBe(3.0);
    expect(result.schedule).toBeNull(); // Empty schedule should be null
  });

  it('should handle staff as instructor', () => {
    const parsed: ParsedSection = {
      id: 'section-222',
      term: '1040',
      class: {
        subject: 'CS',
        abbreviation: '3251',
        name: 'Intermediate Software Design',
      },
      number: '01',
      instructors: ['staff'],
      type: 'Lecture',
      schedule: {
        days: ['M', 'W', 'F'],
        startTime: '11:00',
        endTime: '11:50',
        raw: 'MWF 11:00AM - 11:50AM',
      },
      credits: {
        min: 3.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    expect(result.instructors).toEqual(['staff']);
  });

  it('should handle empty instructors array', () => {
    const parsed: ParsedSection = {
      id: 'section-333',
      term: '1040',
      class: {
        subject: 'TEST',
        abbreviation: '1000',
        name: 'Test Course',
      },
      number: '01',
      instructors: [],
      type: 'Lecture',
      schedule: {
        days: ['F'],
        startTime: '13:00',
        endTime: '15:50',
        raw: 'F 1:00PM - 3:50PM',
      },
      credits: {
        min: 3.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    expect(result.instructors).toEqual([]);
  });

  it('should not include classId or class object in result', () => {
    const parsed: ParsedSection = {
      id: 'section-444',
      term: '1040',
      class: {
        subject: 'CS',
        abbreviation: '2201',
        name: 'Data Structures',
      },
      number: '01',
      instructors: ['Dr. Computer'],
      type: 'Lecture',
      schedule: {
        days: ['M', 'W', 'F'],
        startTime: '09:00',
        endTime: '09:50',
        raw: 'MWF 9:00AM - 9:50AM',
      },
      credits: {
        min: 3.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    // classId should be added during DB insertion, not here
    expect(result).not.toHaveProperty('classId');

    // parsed.class information is discarded (only used for reference)
    expect(result).not.toHaveProperty('class');
  });

  it('should correctly rename fields from parsed to database format', () => {
    const parsed: ParsedSection = {
      id: 'yes-section-id',
      term: 'term-id-123',
      class: {
        subject: 'HOD',
        abbreviation: '1100',
        name: 'Human and Organizational Development',
      },
      number: '05',
      instructors: ['Prof. HOD'],
      type: 'Seminar',
      schedule: {
        days: ['W'],
        startTime: '16:00',
        endTime: '18:30',
        raw: 'W 4:00PM - 6:30PM',
      },
      credits: {
        min: 3.0,
        max: 3.0,
      },
    };

    const result = transformSectionForDb(parsed);

    // Verify field renames
    expect(result.sectionId).toBe('yes-section-id'); // id -> sectionId
    expect(result.termId).toBe('term-id-123'); // term -> termId
    expect(result.sectionNumber).toBe('05'); // number -> sectionNumber
    expect(result.sectionType).toBe('Seminar'); // type -> sectionType
  });

  it('should flatten credits from object to separate min/max fields', () => {
    const parsed: ParsedSection = {
      id: 'section-555',
      term: '1040',
      class: {
        subject: 'ART',
        abbreviation: '1000',
        name: 'Introduction to Art',
      },
      number: '01',
      instructors: ['Artist'],
      type: 'Studio',
      schedule: {
        days: ['T', 'R'],
        startTime: '10:00',
        endTime: '12:50',
        raw: 'TR 10:00AM - 12:50PM',
      },
      credits: {
        min: 2.0,
        max: 4.0,
      },
    };

    const result = transformSectionForDb(parsed);

    // Credits should be flattened
    expect(result.creditsMin).toBe(2.0);
    expect(result.creditsMax).toBe(4.0);
    expect(result).not.toHaveProperty('credits'); // No credits object
  });
});
