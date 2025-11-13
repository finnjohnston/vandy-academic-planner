import { describe, it, expect } from 'vitest';
import { transformClassForDb } from '../../../src/ingestion/transformers/index.js';
import { ParsedSemesterClass } from '../../../src/ingestion/parsers/types/main/parsed.class.type.js';

describe('transformClassForDb', () => {
  it('should transform a complete parsed class to database format', () => {
    const parsed: ParsedSemesterClass = {
      id: '12345',
      termId: '1040',
      subject: 'CS',
      abbreviation: '2201',
      name: 'Data Structures',
      details: {
        school: 'School of Engineering',
        credits: {
          min: 3.0,
          max: 3.0,
        },
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: CS 1101',
            courses: 'CS 1101',
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
        attributes: {
          axle: ['AXLE: Mathematics and Natural Sciences'],
          core: null,
        },
        description: 'Abstract data types; advanced procedural and data abstraction.',
      },
    };

    const result = transformClassForDb(parsed);

    expect(result).toEqual({
      classId: '12345',
      termId: '1040',
      subjectCode: 'CS',
      courseNumber: '2201',
      title: 'Data Structures',
      school: 'School of Engineering',
      creditsMin: 3.0,
      creditsMax: 3.0,
      description: 'Abstract data types; advanced procedural and data abstraction.',
      attributes: {
        axle: ['AXLE: Mathematics and Natural Sciences'],
      },
      requirements: {
        prerequisites: {
          rawText: 'Prerequisite: CS 1101',
          courses: 'CS 1101',
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      },
    });
  });

  it('should transform class with variable credits', () => {
    const parsed: ParsedSemesterClass = {
      id: '67890',
      termId: '1040',
      subject: 'CS',
      abbreviation: '3860',
      name: 'Independent Study',
      details: {
        school: 'School of Engineering',
        credits: {
          min: 1.0,
          max: 3.0,
        },
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
          axle: null,
          core: null,
        },
        description: 'Independent study under faculty supervision.',
      },
    };

    const result = transformClassForDb(parsed);

    expect(result.creditsMin).toBe(1.0);
    expect(result.creditsMax).toBe(3.0);
    expect(result.attributes).toBeNull();
    expect(result.requirements).toBeNull();
  });

  it('should handle null optional fields', () => {
    const parsed: ParsedSemesterClass = {
      id: '11111',
      termId: '1050',
      subject: 'TEST',
      abbreviation: '1000',
      name: 'Test Class',
      details: {
        school: null,
        credits: {
          min: 3.0,
          max: 3.0,
        },
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
          axle: null,
          core: null,
        },
        description: null,
      },
    };

    const result = transformClassForDb(parsed);

    expect(result.school).toBeNull();
    expect(result.description).toBeNull();
    expect(result.attributes).toBeNull();
    expect(result.requirements).toBeNull();
    expect(result.termId).toBe('1050');
  });

  it('should transform class with only core attributes', () => {
    const parsed: ParsedSemesterClass = {
      id: '22222',
      termId: '1040',
      subject: 'MATH',
      abbreviation: '1300',
      name: 'Calculus I',
      details: {
        school: 'College of Arts and Science',
        credits: {
          min: 4.0,
          max: 4.0,
        },
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
          axle: null,
          core: ['CORE: Quantitative Reasoning'],
        },
        description: 'Single-variable calculus.',
      },
    };

    const result = transformClassForDb(parsed);

    expect(result.attributes).toEqual({
      core: ['CORE: Quantitative Reasoning'],
    });
  });

  it('should transform class with complex prerequisites', () => {
    const parsed: ParsedSemesterClass = {
      id: '33333',
      termId: '1040',
      subject: 'PHYS',
      abbreviation: '2953L',
      name: 'Modern Physics Laboratory',
      details: {
        school: 'College of Arts and Science',
        credits: {
          min: 1.0,
          max: 1.0,
        },
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: (PHYS 2210 or PHYS 1501) and (PHYS 2255 or concurrent)',
            courses: {
              $and: [
                { $or: ['PHYS 2210', 'PHYS 1501'] },
                'PHYS 2255',
              ],
            },
          },
          corequisites: {
            rawText: null,
            courses: null,
          },
        },
        attributes: {
          axle: null,
          core: null,
        },
        description: 'Laboratory experiments in modern physics.',
      },
    };

    const result = transformClassForDb(parsed);

    expect(result.requirements).toEqual({
      prerequisites: {
        rawText: 'Prerequisite: (PHYS 2210 or PHYS 1501) and (PHYS 2255 or concurrent)',
        courses: {
          $and: [
            { $or: ['PHYS 2210', 'PHYS 1501'] },
            'PHYS 2255',
          ],
        },
      },
      corequisites: {
        rawText: null,
        courses: null,
      },
    });
  });

  it('should correctly rename fields from parsed to database format', () => {
    const parsed: ParsedSemesterClass = {
      id: 'class-id-123',
      termId: 'term-2024-fall',
      subject: 'HOD',
      abbreviation: '1100',
      name: 'Human and Organizational Development',
      details: {
        school: 'Peabody College',
        credits: {
          min: 3.0,
          max: 3.0,
        },
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
          axle: null,
          core: null,
        },
        description: 'Introduction to HOD.',
      },
    };

    const result = transformClassForDb(parsed);

    // Verify field renames
    expect(result.classId).toBe('class-id-123'); // id -> classId
    expect(result.termId).toBe('term-2024-fall'); // termId preserved
    expect(result.subjectCode).toBe('HOD'); // subject -> subjectCode
    expect(result.courseNumber).toBe('1100'); // abbreviation -> courseNumber
    expect(result.title).toBe('Human and Organizational Development'); // name -> title
  });
});
