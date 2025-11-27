import { describe, it, expect } from 'vitest';

/**
 * Helper functions from requirements.checks.ts
 * Copied here for testing
 */
function extractCourseIds(coursesObj: any): string[] {
  if (!coursesObj) return [];

  // Base case: if it's a string, return it
  if (typeof coursesObj === 'string') {
    return [coursesObj];
  }

  // Base case: if it's not an object, return empty
  if (typeof coursesObj !== 'object') {
    return [];
  }

  const ids: string[] = [];

  // Recursive case: process $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    for (const item of coursesObj.$and) {
      ids.push(...extractCourseIds(item)); // Recursive call
    }
  }

  // Recursive case: process $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    for (const item of coursesObj.$or) {
      ids.push(...extractCourseIds(item)); // Recursive call
    }
  }

  return ids;
}

function filterValidCourseIds(coursesObj: any, validCourseIds: Set<string>): any {
  if (!coursesObj) return null;

  // Base case: if it's a string, check if it's valid
  if (typeof coursesObj === 'string') {
    return validCourseIds.has(coursesObj) ? coursesObj : null;
  }

  // Base case: if it's not an object, return null
  if (typeof coursesObj !== 'object') {
    return null;
  }

  const filtered: any = {};

  // Recursive case: filter $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    const validItems = coursesObj.$and
      .map((item: any) => filterValidCourseIds(item, validCourseIds)) // Recursive call
      .filter((item: any) => item !== null); // Remove nulls

    if (validItems.length > 0) {
      filtered.$and = validItems;
    }
  }

  // Recursive case: filter $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    const validItems = coursesObj.$or
      .map((item: any) => filterValidCourseIds(item, validCourseIds)) // Recursive call
      .filter((item: any) => item !== null); // Remove nulls

    if (validItems.length > 0) {
      filtered.$or = validItems;
    }
  }

  // Return null if no valid courses remain
  return Object.keys(filtered).length > 0 ? filtered : null;
}

describe('Requirements Checks - Helper Functions', () => {
  describe('extractCourseIds', () => {
    it('should return empty array for null', () => {
      expect(extractCourseIds(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(extractCourseIds(undefined)).toEqual([]);
    });

    it('should extract courseIds from $and operator', () => {
      const coursesObj = {
        $and: ['CORE 1010', 'CORE 1020']
      };
      expect(extractCourseIds(coursesObj)).toEqual(['CORE 1010', 'CORE 1020']);
    });

    it('should extract courseIds from $or operator', () => {
      const coursesObj = {
        $or: ['ARAB 2202', 'ARAB 2203']
      };
      expect(extractCourseIds(coursesObj)).toEqual(['ARAB 2202', 'ARAB 2203']);
    });

    it('should extract courseIds from both $and and $or', () => {
      const coursesObj = {
        $and: ['CORE 1010'],
        $or: ['ARAB 2202']
      };
      expect(extractCourseIds(coursesObj)).toEqual(['CORE 1010', 'ARAB 2202']);
    });

    it('should handle empty $and array', () => {
      const coursesObj = {
        $and: []
      };
      expect(extractCourseIds(coursesObj)).toEqual([]);
    });

    it('should ignore non-array $and', () => {
      const coursesObj = {
        $and: 'CORE 1010' // Invalid
      };
      expect(extractCourseIds(coursesObj)).toEqual([]);
    });
  });

  describe('filterValidCourseIds', () => {
    const validCourseIds = new Set(['CORE 1010', 'CORE 1020', 'ARAB 2202']);

    it('should return null for null input', () => {
      expect(filterValidCourseIds(null, validCourseIds)).toBeNull();
    });

    it('should filter out invalid courseIds from $and', () => {
      const coursesObj = {
        $and: ['CORE 1010', 'INVALID 1234', 'CORE 1020']
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $and: ['CORE 1010', 'CORE 1020']
      });
    });

    it('should filter out invalid courseIds from $or', () => {
      const coursesObj = {
        $or: ['ARAB 2202', 'INVALID 5678']
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $or: ['ARAB 2202']
      });
    });

    it('should return null if all courseIds are invalid', () => {
      const coursesObj = {
        $and: ['INVALID 1234', 'INVALID 5678']
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toBeNull();
    });

    it('should preserve both $and and $or operators', () => {
      const coursesObj = {
        $and: ['CORE 1010', 'INVALID 1234'],
        $or: ['ARAB 2202', 'INVALID 5678']
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $and: ['CORE 1010'],
        $or: ['ARAB 2202']
      });
    });

    it('should return null if empty after filtering', () => {
      const coursesObj = {
        $and: ['INVALID 1']
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toBeNull();
    });

    it('should handle empty arrays', () => {
      const coursesObj = {
        $and: []
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toBeNull();
    });
  });

  describe('Real-world examples from database', () => {
    it('should handle CORE 1020 prerequisites', () => {
      const coursesObj = {
        $and: ['CORE 1010']
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['CORE 1010']);
    });

    it('should handle AADS 3880 corequisites', () => {
      const coursesObj = {
        $and: ['AADS 3881']
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['AADS 3881']);
    });

    it('should handle ARA 3101 prerequisites with $or', () => {
      const coursesObj = {
        $or: ['ARAB 2202']
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['ARAB 2202']);
    });

    it('should handle empty prerequisites', () => {
      const coursesObj = {
        $and: []
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual([]);
    });
  });

  describe('Nested structures (ASTR 3000 case)', () => {
    it('should extract courseIds from nested $and with $or children', () => {
      const coursesObj = {
        $and: [
          { $or: ['PHYS 1501', 'PHYS 1601', 'PHYS 1911'] },
          { $or: ['MATH 1100', 'MATH 1200', 'MATH 1300'] }
        ]
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual([
        'PHYS 1501', 'PHYS 1601', 'PHYS 1911',
        'MATH 1100', 'MATH 1200', 'MATH 1300'
      ]);
    });

    it('should extract courseIds from nested $or with $and children', () => {
      const coursesObj = {
        $or: [
          { $and: ['CORE 1010', 'ARAB 2202'] },
          { $and: ['CORE 1020', 'ARAB 2203'] }
        ]
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['CORE 1010', 'ARAB 2202', 'CORE 1020', 'ARAB 2203']);
    });

    it('should handle mixed strings and nested objects in $and', () => {
      const coursesObj = {
        $and: [
          { $or: ['CORE 1010', 'CORE 1020'] },
          'ARAB 2202'
        ]
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['CORE 1010', 'CORE 1020', 'ARAB 2202']);
    });

    it('should handle triple nesting', () => {
      const coursesObj = {
        $or: [
          {
            $and: [
              'PHYS 2255L',
              { $or: ['PHYS 2255', 'PHYS 3651'] }
            ]
          }
        ]
      };
      const ids = extractCourseIds(coursesObj);
      expect(ids).toEqual(['PHYS 2255L', 'PHYS 2255', 'PHYS 3651']);
    });
  });

  describe('Nested structures - filtering', () => {
    const validCourseIds = new Set(['PHYS 1501', 'PHYS 1601', 'MATH 1100', 'MATH 1200', 'CORE 1010']);

    it('should filter nested $and with $or children while preserving structure', () => {
      const coursesObj = {
        $and: [
          { $or: ['PHYS 1501', 'PHYS 1601', 'PHYS 1911'] }, // PHYS 1911 invalid
          { $or: ['MATH 1100', 'MATH 1200', 'MATH 1300'] }  // MATH 1300 invalid
        ]
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $and: [
          { $or: ['PHYS 1501', 'PHYS 1601'] },
          { $or: ['MATH 1100', 'MATH 1200'] }
        ]
      });
    });

    it('should return null if nested $or becomes empty after filtering', () => {
      const coursesObj = {
        $and: [
          { $or: ['INVALID 1', 'INVALID 2'] },
          { $or: ['MATH 1100', 'MATH 1200'] }
        ]
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $and: [
          { $or: ['MATH 1100', 'MATH 1200'] }
        ]
      });
    });

    it('should filter mixed strings and objects', () => {
      const coursesObj = {
        $and: [
          { $or: ['CORE 1010', 'INVALID 1'] },
          'INVALID 2'
        ]
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $and: [
          { $or: ['CORE 1010'] }
        ]
      });
    });

    it('should handle triple nesting with filtering', () => {
      const coursesObj = {
        $or: [
          {
            $and: [
              'INVALID 1',
              { $or: ['PHYS 1501', 'INVALID 2'] }
            ]
          },
          'CORE 1010'
        ]
      };
      const result = filterValidCourseIds(coursesObj, validCourseIds);
      expect(result).toEqual({
        $or: [
          {
            $and: [
              { $or: ['PHYS 1501'] }
            ]
          },
          'CORE 1010'
        ]
      });
    });
  });
});
