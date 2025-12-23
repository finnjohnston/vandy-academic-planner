import { describe, it, expect } from 'vitest';
import {
  evaluateCourseFilter,
  calculateFilterSpecificity,
  validateFilter,
} from '../../../src/api/services/courseFilter.service.js';
import { Course } from '@prisma/client';
import { CourseFilter } from '../../../src/api/types/program.types.js';

// Mock course objects
const mockCourseCS3250: Course = {
  id: 1,
  courseId: 'CS 3250',
  academicYearId: 869,
  subjectCode: 'CS',
  courseNumber: '3250',
  title: 'Algorithms',
  school: 'School of Engineering',
  creditsMin: 3,
  creditsMax: 3,
  typicallyOffered: null,
  description: null,
  attributes: null,
  requirements: null,
  isCatalogCourse: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCourseCS3262: Course = {
  ...mockCourseCS3250,
  id: 2,
  courseId: 'CS 3262',
  courseNumber: '3262',
  title: 'Discrete Structures',
};

const mockCourseMATH3320: Course = {
  ...mockCourseCS3250,
  id: 3,
  courseId: 'MATH 3320',
  subjectCode: 'MATH',
  courseNumber: '3320',
  title: 'Abstract Algebra',
};

const mockCourseWithAxle: Course = {
  ...mockCourseCS3250,
  id: 4,
  courseId: 'PHIL 1100',
  subjectCode: 'PHIL',
  courseNumber: '1100',
  title: 'Introduction to Philosophy',
  attributes: {
    axle: ['AXLE: Humanities and the Creative Arts'],
    core: [],
  },
};

const mockCourseWithMNS: Course = {
  ...mockCourseCS3250,
  id: 5,
  courseId: 'PHYS 1601',
  subjectCode: 'PHYS',
  courseNumber: '1601',
  title: 'Introductory Physics',
  creditsMin: 4,
  creditsMax: 4,
  attributes: {
    axle: ['AXLE: Math and Natural Sciences'],
    core: [],
  },
};

const mockCourseWithLabSuffix: Course = {
  ...mockCourseCS3250,
  id: 6,
  courseId: 'PHYS 1601L',
  subjectCode: 'PHYS',
  courseNumber: '1601L',
  title: 'Introductory Physics Lab',
};

describe('courseFilter.service', () => {
  describe('PlaceholderFilter', () => {
    it('should match all courses', () => {
      const filter: CourseFilter = { type: 'placeholder' };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(true);
    });

    it('should have specificity of 10', () => {
      const filter: CourseFilter = { type: 'placeholder' };
      expect(calculateFilterSpecificity(filter)).toBe(10);
    });

    it('should always be valid', () => {
      const filter: CourseFilter = { type: 'placeholder' };
      expect(validateFilter(filter)).toBeNull();
    });
  });

  describe('SubjectNumberFilter', () => {
    it('should match courses by subject only', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS', 'MATH'],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(false);
    });

    it('should filter by number range', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'range', min: 3000 }],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3262, filter)).toBe(true);
    });

    it('should filter by number range with max', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'range', min: 3000, max: 3999 }],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
    });

    it('should exclude specific courses', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'range', min: 3000 }],
        exclude: ['CS 3262'],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3262, filter)).toBe(false);
    });

    it('should match specific numbers', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['MATH'],
        numbers: [{ type: 'specific', values: ['3320', '3620'] }],
      };
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
    });

    it('should calculate specificity correctly for subject only', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
      };
      expect(calculateFilterSpecificity(filter)).toBe(55); // 50 + 5 for single subject
    });

    it('should calculate higher specificity for range constraints', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'range', min: 3000 }],
      };
      expect(calculateFilterSpecificity(filter)).toBe(70); // 50 + 15 + 5
    });

    it('should calculate highest specificity for specific numbers', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'specific', values: ['3250'] }],
      };
      expect(calculateFilterSpecificity(filter)).toBe(80); // 50 + 25 + 5
    });

    it('should validate empty subjects', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: [],
      };
      expect(validateFilter(filter)).toBe('subject_number filter must have at least one subject');
    });

    it('should validate empty specific values', () => {
      const filter: CourseFilter = {
        type: 'subject_number',
        subjects: ['CS'],
        numbers: [{ type: 'specific', values: [] }],
      };
      expect(validateFilter(filter)).toBe(
        'specific number constraint must have at least one value'
      );
    });
  });

  describe('AttributeFilter', () => {
    it('should match courses by AXLE attribute', () => {
      const filter: CourseFilter = {
        type: 'attribute',
        attributes: ['AXLE: Humanities and the Creative Arts'],
        attributeType: 'axle',
      };
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(false);
    });

    it('should match courses with MNS attribute', () => {
      const filter: CourseFilter = {
        type: 'attribute',
        attributes: ['AXLE: Math and Natural Sciences'],
        attributeType: 'axle',
      };
      expect(evaluateCourseFilter(mockCourseWithMNS, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(false);
    });

    it('should exclude subjects', () => {
      const filter: CourseFilter = {
        type: 'attribute',
        attributes: ['AXLE: Humanities and the Creative Arts'],
        exclude: { subjects: ['PHIL'] },
      };
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(false);
    });

    it('should match multiple attributes', () => {
      const filter: CourseFilter = {
        type: 'attribute',
        attributes: [
          'AXLE: Humanities and the Creative Arts',
          'AXLE: Math and Natural Sciences',
        ],
      };
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithMNS, filter)).toBe(true);
    });

    it('should calculate specificity based on attribute count', () => {
      const singleAttr: CourseFilter = {
        type: 'attribute',
        attributes: ['AXLE: Humanities and the Creative Arts'],
      };
      expect(calculateFilterSpecificity(singleAttr)).toBe(40);

      const multipleAttrs: CourseFilter = {
        type: 'attribute',
        attributes: [
          'AXLE: Humanities and the Creative Arts',
          'AXLE: International Cultures',
          'AXLE: History and Culture of the United States',
        ],
      };
      expect(calculateFilterSpecificity(multipleAttrs)).toBeLessThan(40);
    });

    it('should add bonus for exclusions', () => {
      const withExclusion: CourseFilter = {
        type: 'attribute',
        attributes: ['AXLE: Humanities and the Creative Arts'],
        exclude: { subjects: ['CMST'] },
      };
      expect(calculateFilterSpecificity(withExclusion)).toBe(50); // 40 + 10
    });

    it('should validate empty attributes', () => {
      const filter: CourseFilter = {
        type: 'attribute',
        attributes: [],
      };
      expect(validateFilter(filter)).toBe('attribute filter must have at least one attribute');
    });
  });

  describe('CourseListFilter', () => {
    it('should match courses in list', () => {
      const filter: CourseFilter = {
        type: 'course_list',
        courses: ['CS 3250', 'MATH 3320'],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3262, filter)).toBe(false);
    });

    it('should have high specificity for small lists', () => {
      const filter: CourseFilter = {
        type: 'course_list',
        courses: ['CS 3250'],
      };
      expect(calculateFilterSpecificity(filter)).toBe(90); // 85 + 5
    });

    it('should have lower specificity for larger lists', () => {
      const filter: CourseFilter = {
        type: 'course_list',
        courses: ['CS 3250', 'CS 3251', 'CS 3252', 'CS 3253', 'CS 3254', 'CS 3255'],
      };
      expect(calculateFilterSpecificity(filter)).toBe(88); // 85 + 3 for list <= 10
    });

    it('should validate empty courses list', () => {
      const filter: CourseFilter = {
        type: 'course_list',
        courses: [],
      };
      expect(validateFilter(filter)).toBe('course_list filter must have at least one course');
    });
  });

  describe('CourseNumberSuffixFilter', () => {
    it('should match courses by suffix', () => {
      const filter: CourseFilter = {
        type: 'course_number_suffix',
        suffixes: ['L'],
      };
      expect(evaluateCourseFilter(mockCourseWithLabSuffix, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(false);
    });

    it('should filter by subject when provided', () => {
      const filter: CourseFilter = {
        type: 'course_number_suffix',
        suffixes: ['L'],
        subjects: ['PHYS'],
      };
      expect(evaluateCourseFilter(mockCourseWithLabSuffix, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(false);
    });

    it('should exclude specific courses', () => {
      const filter: CourseFilter = {
        type: 'course_number_suffix',
        suffixes: ['L'],
        exclude: ['PHYS 1601L'],
      };
      expect(evaluateCourseFilter(mockCourseWithLabSuffix, filter)).toBe(false);
    });

    it('should validate empty suffixes', () => {
      const filter: CourseFilter = {
        type: 'course_number_suffix',
        suffixes: [],
      };
      expect(validateFilter(filter)).toBe(
        'course_number_suffix filter must have at least one suffix'
      );
    });
  });

  describe('CompositeFilter', () => {
    it('should handle AND logic', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'AND',
        filters: [
          { type: 'subject_number', subjects: ['CS'] },
          { type: 'subject_number', subjects: ['CS'], numbers: [{ type: 'range', min: 3000 }] },
        ],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(false);
    });

    it('should handle OR logic', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'OR',
        filters: [
          { type: 'subject_number', subjects: ['CS'] },
          { type: 'subject_number', subjects: ['MATH'] },
        ],
      };
      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(false);
    });

    it('should calculate AND specificity as average of top 2', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'AND',
        filters: [
          { type: 'course_list', courses: ['CS 3250'] }, // 90
          { type: 'subject_number', subjects: ['CS'], numbers: [{ type: 'range', min: 3000 }] }, // 70
        ],
      };
      expect(calculateFilterSpecificity(filter)).toBe(80); // (90 + 70) / 2
    });

    it('should cap OR specificity at 70', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'OR',
        filters: [
          { type: 'course_list', courses: ['CS 3250'] }, // 90
          { type: 'subject_number', subjects: ['MATH'] }, // 55
        ],
      };
      expect(calculateFilterSpecificity(filter)).toBe(70); // capped from 90
    });

    it('should validate minimum number of filters', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'AND',
        filters: [{ type: 'placeholder' }],
      };
      expect(validateFilter(filter)).toBe('composite filter must have at least two sub-filters');
    });

    it('should recursively validate sub-filters', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'AND',
        filters: [
          { type: 'placeholder' },
          { type: 'subject_number', subjects: [] }, // Invalid
        ],
      };
      expect(validateFilter(filter)).toBe('subject_number filter must have at least one subject');
    });
  });

  describe('Complex nested filters', () => {
    it('should handle nested AND within OR', () => {
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'OR',
        filters: [
          {
            type: 'composite',
            operator: 'AND',
            filters: [
              { type: 'subject_number', subjects: ['CS'] },
              { type: 'subject_number', subjects: ['CS'], numbers: [{ type: 'range', min: 3000 }] },
            ],
          },
          { type: 'subject_number', subjects: ['MATH'] },
        ],
      };

      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseWithAxle, filter)).toBe(false);
    });

    it('should handle complex real-world filter', () => {
      // CS 3000+ except CS 3262, OR specific math courses
      const filter: CourseFilter = {
        type: 'composite',
        operator: 'OR',
        filters: [
          {
            type: 'subject_number',
            subjects: ['CS'],
            numbers: [{ type: 'range', min: 3000 }],
            exclude: ['CS 3262'],
          },
          {
            type: 'course_list',
            courses: ['MATH 3320', 'MATH 3620'],
          },
        ],
      };

      expect(evaluateCourseFilter(mockCourseCS3250, filter)).toBe(true);
      expect(evaluateCourseFilter(mockCourseCS3262, filter)).toBe(false); // Excluded
      expect(evaluateCourseFilter(mockCourseMATH3320, filter)).toBe(true);
    });
  });
});
