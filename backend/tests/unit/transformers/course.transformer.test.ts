import { describe, it, expect } from 'vitest';
import { transformCourseForDb } from '../../../src/ingestion/transformers/index.js';
import { ParsedCatalogCourse } from '../../../src/ingestion/parsers/types/main/parsed.course.type.js';

describe('transformCourseForDb', () => {
  it('should transform a complete parsed course to database format', () => {
    const parsed: ParsedCatalogCourse = {
      id: '102715',
      subject: 'CS',
      abbreviation: '1101',
      name: 'Programming and Problem Solving',
      details: {
        school: 'School of Engineering',
        credits: {
          min: 3.0,
          max: 3.0,
        },
        typicallyOffered: 'Fall, Spring',
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
        attributes: {
          axle: ['AXLE: Mathematics and Natural Sciences'],
          core: ['CORE: Quantitative Reasoning'],
        },
        description: 'Introduction to programming and algorithmic problem solving.',
      },
    };

    const result = transformCourseForDb(parsed, 2024);

    expect(result).toEqual({
      courseId: '102715',
      academicYearId: 2024,
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
    });
  });

  it('should transform course with variable credits', () => {
    const parsed: ParsedCatalogCourse = {
      id: '98765',
      subject: 'CS',
      abbreviation: '3860',
      name: 'Independent Study',
      details: {
        school: 'School of Engineering',
        credits: {
          min: 1.0,
          max: 3.0,
        },
        typicallyOffered: 'Fall, Spring, Summer',
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

    const result = transformCourseForDb(parsed, 2024);

    expect(result.creditsMin).toBe(1.0);
    expect(result.creditsMax).toBe(3.0);
    expect(result.attributes).toBeNull();
    expect(result.requirements).toBeNull();
  });

  it('should handle null optional fields', () => {
    const parsed: ParsedCatalogCourse = {
      id: '12345',
      subject: 'TEST',
      abbreviation: '1000',
      name: 'Test Course',
      details: {
        school: null,
        credits: {
          min: 3.0,
          max: 3.0,
        },
        typicallyOffered: null,
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

    const result = transformCourseForDb(parsed, 2025);

    expect(result.school).toBeNull();
    expect(result.typicallyOffered).toBeNull();
    expect(result.description).toBeNull();
    expect(result.attributes).toBeNull();
    expect(result.requirements).toBeNull();
    expect(result.academicYearId).toBe(2025);
  });

  it('should transform course with only axle attributes', () => {
    const parsed: ParsedCatalogCourse = {
      id: '11111',
      subject: 'BSCI',
      abbreviation: '1100',
      name: 'General Biology',
      details: {
        school: 'College of Arts and Science',
        credits: {
          min: 4.0,
          max: 4.0,
        },
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
          axle: ['AXLE: Lab Science', 'AXLE: Natural Sciences'],
          core: null,
        },
        description: 'Introduction to biological sciences.',
      },
    };

    const result = transformCourseForDb(parsed, 2024);

    expect(result.attributes).toEqual({
      axle: ['AXLE: Lab Science', 'AXLE: Natural Sciences'],
    });
  });

  it('should transform course with complex prerequisite logic', () => {
    const parsed: ParsedCatalogCourse = {
      id: '22222',
      subject: 'PHYS',
      abbreviation: '2210',
      name: 'Physics I',
      details: {
        school: 'College of Arts and Science',
        credits: {
          min: 3.0,
          max: 3.0,
        },
        typicallyOffered: 'Fall, Spring',
        requirements: {
          prerequisites: {
            rawText: 'Prerequisite: (MATH 1300 or MATH 1301) and (PHYS 1601 or PHYS 1501)',
            courses: {
              $and: [
                { $or: ['MATH 1300', 'MATH 1301'] },
                { $or: ['PHYS 1601', 'PHYS 1501'] },
              ],
            },
          },
          corequisites: {
            rawText: 'Corequisite: PHYS 2210L',
            courses: 'PHYS 2210L',
          },
        },
        attributes: {
          axle: null,
          core: null,
        },
        description: 'Calculus-based physics.',
      },
    };

    const result = transformCourseForDb(parsed, 2024);

    expect(result.requirements).toEqual({
      prerequisites: {
        rawText: 'Prerequisite: (MATH 1300 or MATH 1301) and (PHYS 1601 or PHYS 1501)',
        courses: {
          $and: [
            { $or: ['MATH 1300', 'MATH 1301'] },
            { $or: ['PHYS 1601', 'PHYS 1501'] },
          ],
        },
      },
      corequisites: {
        rawText: 'Corequisite: PHYS 2210L',
        courses: 'PHYS 2210L',
      },
    });
  });
});
