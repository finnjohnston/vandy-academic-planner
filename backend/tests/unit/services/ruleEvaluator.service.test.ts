import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../../../src/api/services/ruleEvaluator.service.js';
import { Course } from '@prisma/client';
import {
  TakeCoursesRule,
  TakeFromListRule,
  TakeAnyCoursesRule,
  GroupRule,
} from '../../../src/api/types/program.types.js';

// Mock course objects for testing
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

const mockCourseMATH1300: Course = {
  ...mockCourseCS1101,
  id: 2,
  courseId: 'MATH 1300',
  subjectCode: 'MATH',
  courseNumber: '1300',
  title: 'Differential Calculus',
  creditsMin: 4,
  creditsMax: 4,
};

const mockCoursePHYS1601: Course = {
  ...mockCourseCS1101,
  id: 3,
  courseId: 'PHYS 1601',
  subjectCode: 'PHYS',
  courseNumber: '1601',
  title: 'General Physics I',
  creditsMin: 4,
  creditsMax: 4,
};

const mockCourseHIST2100: Course = {
  ...mockCourseCS1101,
  id: 4,
  courseId: 'HIST 2100',
  subjectCode: 'HIST',
  courseNumber: '2100',
  title: 'US History',
};

describe('ruleEvaluator.service', () => {
  describe('take_courses Rule', () => {
    it('should match when course is in required list', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['CS 1101', 'CS 2201'],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100);
    });

    it('should not match when course is not in required list', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['CS 1101', 'CS 2201'],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should match when course is in list with multiple math courses', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100);
    });

    it('should not match when courses array is empty', () => {
      const rule: TakeCoursesRule = {
        type: 'take_courses',
        courses: [],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });

  describe('take_from_list Rule', () => {
    it('should match when course is in options list', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 1,
        countType: 'courses',
        courses: ['PHYS 1601', 'PHYS 1602', 'CHEM 1601'],
      };

      const result = evaluateRule(rule, mockCoursePHYS1601);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(80);
    });

    it('should not match when course is not in options', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 1,
        countType: 'courses',
        courses: ['PHYS 1601', 'PHYS 1602'],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should match when course is single option in list', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 1,
        countType: 'courses',
        courses: ['CS 1101'],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(80);
    });

    it('should not match when options array is empty', () => {
      const rule: TakeFromListRule = {
        type: 'take_from_list',
        count: 1,
        countType: 'courses',
        courses: [],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });

  describe('take_any_courses Rule', () => {
    it('should match with any filter (Phase 4)', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 3,
        filter: { type: 'any' },
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(10);
    });

    it('should match different courses with any filter', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 3,
        filter: { type: 'any' },
      };

      const resultCS = evaluateRule(rule, mockCourseCS1101);
      const resultMATH = evaluateRule(rule, mockCourseMATH1300);
      const resultHIST = evaluateRule(rule, mockCourseHIST2100);

      expect(resultCS.matches).toBe(true);
      expect(resultCS.specificityScore).toBe(10);
      expect(resultMATH.matches).toBe(true);
      expect(resultMATH.specificityScore).toBe(10);
      expect(resultHIST.matches).toBe(true);
      expect(resultHIST.specificityScore).toBe(10);
    });

    it('should not match with non-any filter type', () => {
      const rule: TakeAnyCoursesRule = {
        type: 'take_any_courses',
        credits: 3,
        filter: { type: 'attribute' } as any,
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });

  describe('Group Rule - AND operator', () => {
    it('should match when all sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 1101'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100);
    });

    it('should not match when only some sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2201'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should not match when no sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 2201'] },
          { type: 'take_courses', courses: ['CS 2212'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should return minimum score when sub-rules have mixed specificity', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['MATH 1300'] },
          { type: 'take_from_list', count: 1, countType: 'courses', courses: ['MATH 1300', 'MATH 1301'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(80); // Minimum of 100 and 80
    });

    it('should match when rules array is empty (vacuous truth)', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      // Empty AND is vacuously true (all zero conditions are satisfied)
      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(Infinity); // Math.min of empty array
    });
  });

  describe('Group Rule - OR operator', () => {
    it('should match when one sub-rule matches', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 2201'] },
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_courses', courses: ['CS 2212'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100);
    });

    it('should return maximum score when multiple sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['MATH 1300'] },
          { type: 'take_from_list', count: 1, countType: 'courses', courses: ['MATH 1300', 'MATH 1301'] },
          { type: 'take_any_courses', credits: 3, filter: { type: 'any' } },
        ],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100); // Maximum of 100, 80, and 10
    });

    it('should not match when no sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 2201'] },
          { type: 'take_courses', courses: ['CS 2212'] },
        ],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should return maximum score when all sub-rules match', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          { type: 'take_from_list', count: 1, countType: 'courses', courses: ['CS 1101', 'CS 2201'] },
          { type: 'take_any_courses', credits: 3, filter: { type: 'any' } },
        ],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(true);
      expect(result.specificityScore).toBe(100); // Maximum of 100, 80, and 10
    });

    it('should not match when rules array is empty', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [],
      };

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });

  describe('Nested Group Rules', () => {
    it('should handle nested AND within OR (calculus requirement structure)', () => {
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
              { type: 'take_courses', courses: ['MATH 2300'] },
            ],
          },
        ],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      // MATH 1300 only matches the first sub-rule, not all three
      // So the AND group returns false, and the OR group has no matches
      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });

    it('should handle nested OR within AND', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'AND',
        rules: [
          { type: 'take_courses', courses: ['CS 1101'] },
          {
            type: 'group',
            operator: 'OR',
            rules: [
              { type: 'take_courses', courses: ['MATH 2410'] },
              { type: 'take_courses', courses: ['MATH 2600'] },
            ],
          },
        ],
      };

      const resultMatch = evaluateRule(rule, mockCourseCS1101);

      expect(resultMatch.matches).toBe(false); // AND requires both, but inner OR doesn't match
      expect(resultMatch.specificityScore).toBe(0);
    });

    it('should handle three levels deep nesting', () => {
      const rule: GroupRule = {
        type: 'group',
        operator: 'OR',
        rules: [
          {
            type: 'group',
            operator: 'AND',
            rules: [
              { type: 'take_courses', courses: ['MATH 1300'] },
              {
                type: 'group',
                operator: 'OR',
                rules: [
                  { type: 'take_courses', courses: ['MATH 1301'] },
                  { type: 'take_courses', courses: ['MATH 1400'] },
                ],
              },
            ],
          },
        ],
      };

      const result = evaluateRule(rule, mockCourseMATH1300);

      // MATH 1300 matches first sub-rule (score 100)
      // But inner OR doesn't match (MATH 1300 != MATH 1301 or MATH 1400)
      // So AND fails because not all sub-rules match
      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid rule type', () => {
      const rule = {
        type: 'invalid_type',
      } as any;

      const result = evaluateRule(rule, mockCourseCS1101);

      expect(result.matches).toBe(false);
      expect(result.specificityScore).toBe(0);
    });
  });
});
