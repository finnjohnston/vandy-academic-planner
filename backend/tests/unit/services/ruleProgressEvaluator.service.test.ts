import { describe, it, expect } from 'vitest';
import { evaluateRuleProgress } from '../../../src/api/services/ruleProgressEvaluator.service.js';
import { Course } from '@prisma/client';
import {
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
  GroupRule,
} from '../../../src/api/types/program.types.js';

// Mock course objects
const mockCourseCS1101: Course = {
  id: 1,
  courseId: 'CS 1101',
  academicYearId: 869,
  subjectCode: 'CS',
  courseNumber: '1101',
  title: 'Programming and Problem Solving',
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

const mockCourseCS2201: Course = {
  ...mockCourseCS1101,
  id: 2,
  courseId: 'CS 2201',
  courseNumber: '2201',
  title: 'Data Structures',
};

const mockCourseMATH1300: Course = {
  ...mockCourseCS1101,
  id: 3,
  courseId: 'MATH 1300',
  subjectCode: 'MATH',
  courseNumber: '1300',
  title: 'Differential Calculus',
  creditsMin: 4,
  creditsMax: 4,
};

const mockCourseMATH1301: Course = {
  ...mockCourseMATH1300,
  id: 4,
  courseId: 'MATH 1301',
  courseNumber: '1301',
  title: 'Integral Calculus',
};

describe('ruleProgressEvaluator.service', () => {
  describe('take_courses Rule', () => {
    it('should show not_started when no courses taken', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['CS 1101', 'CS 2201'],
      };

      const progress = evaluateRuleProgress(rule, []);

      expect(progress.status).toBe('not_started');
      expect(progress.percentage).toBe(0);
      expect(progress.details.type).toBe('take_courses');
      if (progress.details.type === 'take_courses') {
        expect(progress.details.takenCourses).toEqual([]);
        expect(progress.details.missingCourses).toEqual(['CS 1101', 'CS 2201']);
        expect(progress.details.coursesRequired).toBe(2);
        expect(progress.details.coursesTaken).toBe(0);
      }
    });

    it('should show in_progress when some courses taken', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['CS 1101', 'CS 2201'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101]);

      expect(progress.status).toBe('in_progress');
      expect(progress.percentage).toBe(50);
      if (progress.details.type === 'take_courses') {
        expect(progress.details.takenCourses).toEqual(['CS 1101']);
        expect(progress.details.missingCourses).toEqual(['CS 2201']);
      }
    });

    it('should show completed when all courses taken', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['CS 1101', 'CS 2201'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101, mockCourseCS2201]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
      if (progress.details.type === 'take_courses') {
        expect(progress.details.takenCourses).toEqual(['CS 1101', 'CS 2201']);
        expect(progress.details.missingCourses).toEqual([]);
      }
    });

    it('should handle empty courses list', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: [],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
    });
  });

  describe('take_from_list Rule', () => {
    it('should calculate progress for course count requirement', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 2,
        countType: 'courses',
        courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseMATH1300]);

      expect(progress.status).toBe('in_progress');
      expect(progress.percentage).toBe(50);
      if (progress.details.type === 'take_from_list') {
        expect(progress.details.countType).toBe('courses');
        expect(progress.details.required).toBe(2);
        expect(progress.details.fulfilled).toBe(1);
        expect(progress.details.takenCourses).toEqual(['MATH 1300']);
      }
    });

    it('should calculate progress for credit count requirement', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 8,
        countType: 'credits',
        courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseMATH1300, mockCourseMATH1301]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
      if (progress.details.type === 'take_from_list') {
        expect(progress.details.countType).toBe('credits');
        expect(progress.details.fulfilled).toBe(8); // 4 + 4 credits
      }
    });

    it('should cap percentage at 100 for over-fulfillment', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 1,
        countType: 'courses',
        courses: ['MATH 1300', 'MATH 1301'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseMATH1300, mockCourseMATH1301]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100); // Capped, not 200
      if (progress.details.type === 'take_from_list') {
        expect(progress.details.fulfilled).toBe(2);
      }
    });

    it('should show not_started when no matching courses taken', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 2,
        countType: 'courses',
        courses: ['MATH 1300', 'MATH 1301'],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101]);

      expect(progress.status).toBe('not_started');
      expect(progress.percentage).toBe(0);
    });
  });

  describe('take_any_courses Rule', () => {
    it('should calculate progress for any filter', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 9,
        filter: { type: 'any' },
      };

      const progress = evaluateRuleProgress(rule, [
        mockCourseCS1101,
        mockCourseCS2201,
        mockCourseMATH1300,
      ]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBeGreaterThanOrEqual(100); // 3+3+4=10 >= 9
      if (progress.details.type === 'take_any_courses') {
        expect(progress.details.creditsFulfilled).toBe(10);
        expect(progress.details.matchingCourses).toHaveLength(3);
      }
    });

    it('should show in_progress when partially fulfilled', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 12,
        filter: { type: 'any' },
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101, mockCourseCS2201]);

      expect(progress.status).toBe('in_progress');
      expect(progress.percentage).toBe(50); // 6/12 = 50%
      if (progress.details.type === 'take_any_courses') {
        expect(progress.details.creditsFulfilled).toBe(6);
      }
    });

    it('should show not_started when no courses taken', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 9,
        filter: { type: 'any' },
      };

      const progress = evaluateRuleProgress(rule, []);

      expect(progress.status).toBe('not_started');
      expect(progress.percentage).toBe(0);
    });
  });

  describe('group Rule - AND operator', () => {
    it('should calculate average percentage for AND', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2201'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101]);

      expect(progress.status).toBe('in_progress');
      expect(progress.percentage).toBe(50); // (100 + 0) / 2
      if (progress.details.type === 'group') {
        expect(progress.details.operator).toBe('AND');
        expect(progress.details.subRuleProgress).toHaveLength(2);
        expect(progress.details.subRuleProgress[0].percentage).toBe(100);
        expect(progress.details.subRuleProgress[1].percentage).toBe(0);
      }
    });

    it('should show completed when all sub-rules completed', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2201'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101, mockCourseCS2201]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
    });

    it('should show not_started when no sub-rules started', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2201'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, []);

      expect(progress.status).toBe('not_started');
      expect(progress.percentage).toBe(0);
    });
  });

  describe('group Rule - OR operator', () => {
    it('should calculate maximum percentage for OR', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 1101', 'CS 2201'] },
          { type: 'take_courses', courses: ['MATH 1300'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseMATH1300]);

      expect(progress.status).toBe('completed'); // One option is 100% complete
      expect(progress.percentage).toBe(100); // max(0, 100)
      if (progress.details.type === 'group') {
        expect(progress.details.operator).toBe('OR');
        expect(progress.details.activeOptionIndex).toBe(1); // Second option has 100%
      }
    });

    it('should show completed when any sub-rule completed', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2201'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
    });

    it('should track active option index', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 1101', 'CS 2201'] },
          { type: 'take_courses', courses: ['MATH 1300', 'MATH 1301'] },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101, mockCourseMATH1300]);

      expect(progress.status).toBe('in_progress');
      expect(progress.percentage).toBe(50); // Both options at 50%
      if (progress.details.type === 'group') {
        expect(progress.details.activeOptionIndex).toBe(0); // First match wins
      }
    });
  });

  describe('Nested group rules', () => {
    it('should handle nested AND within OR', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          {
            type: 'group',
            operator: 'AND',
            rules: [
              { type: 'take_courses', courses: ['MATH 1300'] },
              { type: 'take_courses', courses: ['MATH 1301'] },
            ],
          },
          {
            type: 'take_courses',
            courses: ['CS 1101'],
          },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseMATH1300]);

      expect(progress.status).toBe('in_progress');
      // First option (AND): (100+0)/2 = 50%
      // Second option: 0%
      // Max = 50%
      expect(progress.percentage).toBe(50);
      if (progress.details.type === 'group') {
        expect(progress.details.activeOptionIndex).toBe(0);
      }
    });

    it('should handle deeply nested groups', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          {
            type: 'group',
            operator: 'OR',
            rules: [
              { type: 'take_courses', courses: ['MATH 1300'] },
              { type: 'take_courses', courses: ['MATH 1301'] },
            ],
          },
        ],
      };

      const progress = evaluateRuleProgress(rule, [mockCourseCS1101, mockCourseMATH1300]);

      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100); // (100 + 100) / 2
    });
  });
});
