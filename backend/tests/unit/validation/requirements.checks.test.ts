import { describe, it, expect } from 'vitest';

/**
 * Helper functions from requirements.checks.ts
 * Copied here for testing
 */
function extractCourseIds(coursesObj: any): string[] {
  if (!coursesObj) return [];

  const ids: string[] = [];

  // Handle $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    ids.push(...coursesObj.$and);
  }

  // Handle $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    ids.push(...coursesObj.$or);
  }

  return ids;
}

function filterValidCourseIds(coursesObj: any, validCourseIds: Set<string>): any {
  if (!coursesObj) return null;

  const filtered: any = {};

  // Filter $and operator
  if (coursesObj.$and && Array.isArray(coursesObj.$and)) {
    const validIds = coursesObj.$and.filter((id: string) => validCourseIds.has(id));
    if (validIds.length > 0) {
      filtered.$and = validIds;
    }
  }

  // Filter $or operator
  if (coursesObj.$or && Array.isArray(coursesObj.$or)) {
    const validIds = coursesObj.$or.filter((id: string) => validCourseIds.has(id));
    if (validIds.length > 0) {
      filtered.$or = validIds;
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
});
