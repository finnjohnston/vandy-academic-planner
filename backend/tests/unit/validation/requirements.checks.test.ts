import { describe, it, expect } from 'vitest';
import {
  filterInvalidCourses,
  normalizeGroup,
} from '../../../src/ingestion/validation/checks/requirements.checks.js';

describe('Requirements Checks - Helper Functions', () => {
  describe('normalizeGroup', () => {
    it('should return null for empty array', () => {
      expect(normalizeGroup('$and', [])).toBeNull();
      expect(normalizeGroup('$or', [])).toBeNull();
    });

    it('should unwrap single item', () => {
      expect(normalizeGroup('$and', ['CS 1101'])).toBe('CS 1101');
      expect(normalizeGroup('$or', ['MATH 1200'])).toBe('MATH 1200');
    });

    it('should unwrap single nested object', () => {
      const nested = { $or: ['CS 1101', 'CS 1102'] };
      expect(normalizeGroup('$and', [nested])).toEqual(nested);
    });

    it('should preserve structure for multiple items', () => {
      expect(normalizeGroup('$and', ['CS 1101', 'CS 1102'])).toEqual({
        $and: ['CS 1101', 'CS 1102'],
      });
      expect(normalizeGroup('$or', ['MATH 1200', 'MATH 1300'])).toEqual({
        $or: ['MATH 1200', 'MATH 1300'],
      });
    });
  });

  describe('filterInvalidCourses', () => {
    const validCourseIds = new Set([
      'CS 1101',
      'CS 1102',
      'MATH 1200',
      'MATH 1300',
      'PHYS 1501',
      'PHYS 1601',
    ]);

    describe('Base cases', () => {
      it('should return null for null input', () => {
        expect(filterInvalidCourses(null, validCourseIds)).toBeNull();
      });

      it('should return valid course code', () => {
        expect(filterInvalidCourses('CS 1101', validCourseIds)).toBe('CS 1101');
      });

      it('should return null for invalid course code', () => {
        expect(filterInvalidCourses('INVALID 1234', validCourseIds)).toBeNull();
      });

      it('should return null for non-object/non-string', () => {
        expect(filterInvalidCourses(123, validCourseIds)).toBeNull();
        expect(filterInvalidCourses(true, validCourseIds)).toBeNull();
      });
    });

    describe('Edge Case 1: Empty after filtering', () => {
      it('should return null when all courses in $and are invalid', () => {
        const coursesObj = {
          $and: ['INVALID 1', 'INVALID 2'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBeNull();
      });

      it('should return null when all courses in $or are invalid', () => {
        const coursesObj = {
          $or: ['INVALID 1', 'INVALID 2'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBeNull();
      });
    });

    describe('Edge Case 2: Single item remaining (unwraps)', () => {
      it('should unwrap $and with one valid and one invalid course', () => {
        const coursesObj = {
          $and: ['CS 1101', 'INVALID 1'],
        };
        // After filtering: ['CS 1101'], which gets unwrapped to 'CS 1101'
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBe('CS 1101');
      });

      it('should unwrap $or with one valid and one invalid course', () => {
        const coursesObj = {
          $or: ['MATH 1200', 'INVALID 1'],
        };
        // After filtering: ['MATH 1200'], which gets unwrapped to 'MATH 1200'
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBe('MATH 1200');
      });

      it('should unwrap when only one course exists and is valid', () => {
        const coursesObj = {
          $and: ['CS 1101'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBe('CS 1101');
      });
    });

    describe('Edge Case 3: Multiple items remain', () => {
      it('should preserve $and structure with multiple valid courses', () => {
        const coursesObj = {
          $and: ['CS 1101', 'CS 1102'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['CS 1101', 'CS 1102'],
        });
      });

      it('should filter invalid and preserve structure with remaining valid courses', () => {
        const coursesObj = {
          $and: ['CS 1101', 'INVALID 1', 'CS 1102'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['CS 1101', 'CS 1102'],
        });
      });
    });

    describe('Edge Case 4: Nested structure with some invalid', () => {
      it('should filter invalid courses from nested $or while preserving structure', () => {
        const coursesObj = {
          $and: [
            'CS 1101',
            { $or: ['MATH 1200', 'INVALID 1', 'MATH 1300'] },
          ],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: [
            'CS 1101',
            { $or: ['MATH 1200', 'MATH 1300'] },
          ],
        });
      });

      it('should handle complex nested structures', () => {
        const coursesObj = {
          $and: [
            { $or: ['PHYS 1501', 'PHYS 1601', 'INVALID 1'] },
            { $or: ['MATH 1200', 'MATH 1300', 'INVALID 2'] },
          ],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: [
            { $or: ['PHYS 1501', 'PHYS 1601'] },
            { $or: ['MATH 1200', 'MATH 1300'] },
          ],
        });
      });
    });

    describe('Edge Case 5: Nested becomes single item (unwraps)', () => {
      it('should unwrap nested $or when it becomes single item after filtering', () => {
        const coursesObj = {
          $and: [
            'CS 1101',
            { $or: ['MATH 1200', 'INVALID 1'] },
          ],
        };
        // After filtering: $and: ['CS 1101', 'MATH 1200'] (unwrapped $or)
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['CS 1101', 'MATH 1200'],
        });
      });

      it('should recursively unwrap multiple levels', () => {
        const coursesObj = {
          $and: [
            { $or: ['CS 1101', 'INVALID 1'] },
            { $or: ['MATH 1200', 'INVALID 2'] },
          ],
        };
        // After filtering: $and: ['CS 1101', 'MATH 1200'] (both $or unwrapped)
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['CS 1101', 'MATH 1200'],
        });
      });

      it('should fully unwrap when outer group also becomes single item', () => {
        const coursesObj = {
          $and: [
            'INVALID 1',
            { $or: ['CS 1101', 'INVALID 2'] },
          ],
        };
        // After filtering: $and: ['CS 1101'], which unwraps to 'CS 1101'
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBe('CS 1101');
      });
    });

    describe('Edge Case 6: All courses valid (no changes)', () => {
      it('should return unchanged when all courses are valid', () => {
        const coursesObj = {
          $and: ['CS 1101', 'CS 1102'],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['CS 1101', 'CS 1102'],
        });
      });

      it('should preserve complex nested structure when all valid', () => {
        const coursesObj = {
          $and: [
            { $or: ['PHYS 1501', 'PHYS 1601'] },
            { $or: ['MATH 1200', 'MATH 1300'] },
          ],
        };
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual(coursesObj);
      });
    });

    describe('Real-world examples', () => {
      it('should handle PHYS 2210 prerequisites example', () => {
        const coursesObj = {
          $and: [
            { $or: ['PHYS 1502', 'PHYS 1602', 'PHYS 1912'] },
            { $or: ['MATH 1201', 'MATH 1301'] },
          ],
        };
        const validIds = new Set(['PHYS 1502', 'PHYS 1602', 'MATH 1201']);

        // PHYS 1912 and MATH 1301 are invalid
        expect(filterInvalidCourses(coursesObj, validIds)).toEqual({
          $and: [
            { $or: ['PHYS 1502', 'PHYS 1602'] },
            'MATH 1201', // unwrapped from single-item $or
          ],
        });
      });

      it('should handle PHYS 2953L complex prerequisites', () => {
        const coursesObj = {
          $or: [
            { $and: ['PHYS 2255L', { $or: ['PHYS 2255', 'PHYS 3651'] }] },
            { $and: ['PHYS 1912', { $or: ['PHYS 2255', 'PHYS 3651'] }] },
            { $or: ['PHYS 2250W', 'PHYS 2260W'] },
          ],
        };
        const validIds = new Set(['PHYS 2255L', 'PHYS 2255', 'PHYS 2250W']);

        // PHYS 3651, PHYS 1912, PHYS 2260W are invalid
        // Second $and becomes ['PHYS 2255'] after filtering, which unwraps to 'PHYS 2255'
        expect(filterInvalidCourses(coursesObj, validIds)).toEqual({
          $or: [
            { $and: ['PHYS 2255L', 'PHYS 2255'] }, // nested $or unwrapped
            'PHYS 2255', // second $and unwrapped (PHYS 1912 removed)
            'PHYS 2250W', // third $or unwrapped
          ],
        });
      });

      it('should handle case where entire nested group becomes invalid', () => {
        const coursesObj = {
          $and: [
            'CS 1101',
            { $or: ['INVALID 1', 'INVALID 2'] },
          ],
        };
        // Nested $or becomes null, so only CS 1101 remains, which unwraps
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toBe('CS 1101');
      });
    });

    describe('Triple nesting', () => {
      it('should handle triple-nested structures', () => {
        const coursesObj = {
          $or: [
            {
              $and: [
                'PHYS 1501',
                { $or: ['MATH 1200', 'INVALID 1'] },
              ],
            },
            'INVALID 2',
          ],
        };
        // After filtering: $or unwraps to $and, nested $or unwraps to 'MATH 1200'
        expect(filterInvalidCourses(coursesObj, validCourseIds)).toEqual({
          $and: ['PHYS 1501', 'MATH 1200'],
        });
      });
    });
  });
});
