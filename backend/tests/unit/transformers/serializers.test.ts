import { describe, it, expect } from 'vitest';
import {
  serializeAttributes,
  serializeRequirements,
  serializeSchedule,
  serializeInstructors,
} from '../../../src/ingestion/transformers/utils/index.js';
import { ParsedAttributes } from '../../../src/ingestion/parsers/types/core/parsed.attributes.type.js';
import { ParsedRequirements } from '../../../src/ingestion/parsers/types/core/parsed.requirements.type.js';
import { ParsedSchedule } from '../../../src/ingestion/parsers/types/core/parsed.schedule.type.js';

describe('Serializers', () => {
  describe('serializeAttributes', () => {
    it('should serialize attributes with both axle and core', () => {
      const attributes: ParsedAttributes = {
        axle: ['AXLE: Mathematics and Natural Sciences'],
        core: ['CORE: Quantitative Reasoning'],
      };

      const result = serializeAttributes(attributes);

      expect(result).toEqual({
        axle: ['AXLE: Mathematics and Natural Sciences'],
        core: ['CORE: Quantitative Reasoning'],
      });
    });

    it('should serialize attributes with only axle', () => {
      const attributes: ParsedAttributes = {
        axle: ['AXLE: Mathematics and Natural Sciences', 'AXLE: Lab Science'],
        core: null,
      };

      const result = serializeAttributes(attributes);

      expect(result).toEqual({
        axle: ['AXLE: Mathematics and Natural Sciences', 'AXLE: Lab Science'],
      });
    });

    it('should serialize attributes with only core', () => {
      const attributes: ParsedAttributes = {
        axle: null,
        core: ['CORE: Quantitative Reasoning', 'CORE: Scientific Literacy'],
      };

      const result = serializeAttributes(attributes);

      expect(result).toEqual({
        core: ['CORE: Quantitative Reasoning', 'CORE: Scientific Literacy'],
      });
    });

    it('should return null when both axle and core are null', () => {
      const attributes: ParsedAttributes = {
        axle: null,
        core: null,
      };

      const result = serializeAttributes(attributes);

      expect(result).toBeNull();
    });

    it('should return null when both axle and core are empty arrays', () => {
      const attributes: ParsedAttributes = {
        axle: null,
        core: null,
      };

      const result = serializeAttributes(attributes);

      expect(result).toBeNull();
    });
  });

  describe('serializeRequirements', () => {
    it('should serialize requirements with prerequisites only', () => {
      const requirements: ParsedRequirements = {
        prerequisites: {
          rawText: 'Prerequisite: CS 1101',
          courses: 'CS 1101',
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      };

      const result = serializeRequirements(requirements);

      expect(result).toEqual({
        prerequisites: {
          rawText: 'Prerequisite: CS 1101',
          courses: 'CS 1101',
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      });
    });

    it('should serialize requirements with corequisites only', () => {
      const requirements: ParsedRequirements = {
        prerequisites: {
          rawText: null,
          courses: null,
        },
        corequisites: {
          rawText: 'Corequisite: PHYS 2210L',
          courses: 'PHYS 2210L',
        },
      };

      const result = serializeRequirements(requirements);

      expect(result).toEqual({
        prerequisites: {
          rawText: null,
          courses: null,
        },
        corequisites: {
          rawText: 'Corequisite: PHYS 2210L',
          courses: 'PHYS 2210L',
        },
      });
    });

    it('should serialize requirements with both prerequisites and corequisites', () => {
      const requirements: ParsedRequirements = {
        prerequisites: {
          rawText: 'Prerequisite: CS 1101 and MATH 1300',
          courses: { $and: ['CS 1101', 'MATH 1300'] },
        },
        corequisites: {
          rawText: 'Corequisite: CS 2201L',
          courses: 'CS 2201L',
        },
      };

      const result = serializeRequirements(requirements);

      expect(result).toEqual({
        prerequisites: {
          rawText: 'Prerequisite: CS 1101 and MATH 1300',
          courses: { $and: ['CS 1101', 'MATH 1300'] },
        },
        corequisites: {
          rawText: 'Corequisite: CS 2201L',
          courses: 'CS 2201L',
        },
      });
    });

    it('should serialize complex nested logical expressions', () => {
      const requirements: ParsedRequirements = {
        prerequisites: {
          rawText: 'Prerequisite: (CS 1101 or CS 1104) and MATH 1300',
          courses: {
            $and: [{ $or: ['CS 1101', 'CS 1104'] }, 'MATH 1300'],
          },
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      };

      const result = serializeRequirements(requirements);

      expect(result).toEqual({
        prerequisites: {
          rawText: 'Prerequisite: (CS 1101 or CS 1104) and MATH 1300',
          courses: {
            $and: [{ $or: ['CS 1101', 'CS 1104'] }, 'MATH 1300'],
          },
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      });
    });

    it('should return null when both prerequisites and corequisites are null', () => {
      const requirements: ParsedRequirements = {
        prerequisites: {
          rawText: null,
          courses: null,
        },
        corequisites: {
          rawText: null,
          courses: null,
        },
      };

      const result = serializeRequirements(requirements);

      expect(result).toBeNull();
    });
  });

  describe('serializeSchedule', () => {
    it('should serialize a valid schedule with all fields', () => {
      const schedule: ParsedSchedule = {
        days: ['M', 'W', 'F'],
        startTime: '10:00',
        endTime: '10:50',
        raw: 'MWF 10:00AM - 10:50AM',
      };

      const result = serializeSchedule(schedule);

      expect(result).toEqual({
        days: ['M', 'W', 'F'],
        startTime: '10:00',
        endTime: '10:50',
        raw: 'MWF 10:00AM - 10:50AM',
      });
    });

    it('should serialize schedule with TR days', () => {
      const schedule: ParsedSchedule = {
        days: ['T', 'R'],
        startTime: '14:00',
        endTime: '15:15',
        raw: 'TR 2:00PM - 3:15PM',
      };

      const result = serializeSchedule(schedule);

      expect(result).toEqual({
        days: ['T', 'R'],
        startTime: '14:00',
        endTime: '15:15',
        raw: 'TR 2:00PM - 3:15PM',
      });
    });

    it('should return null for empty schedule with no days and no start time', () => {
      const schedule: ParsedSchedule = {
        days: [],
        startTime: '',
        endTime: '',
        raw: 'By Arrangement',
      };

      const result = serializeSchedule(schedule);

      expect(result).toBeNull();
    });

    it('should serialize schedule with days but no time (edge case)', () => {
      const schedule: ParsedSchedule = {
        days: ['M', 'W'],
        startTime: '',
        endTime: '',
        raw: 'MW TBA',
      };

      const result = serializeSchedule(schedule);

      // Has days, so should not be null even without times
      expect(result).toEqual({
        days: ['M', 'W'],
        startTime: '',
        endTime: '',
        raw: 'MW TBA',
      });
    });

    it('should serialize schedule with single day', () => {
      const schedule: ParsedSchedule = {
        days: ['F'],
        startTime: '13:00',
        endTime: '15:50',
        raw: 'F 1:00PM - 3:50PM',
      };

      const result = serializeSchedule(schedule);

      expect(result).toEqual({
        days: ['F'],
        startTime: '13:00',
        endTime: '15:50',
        raw: 'F 1:00PM - 3:50PM',
      });
    });
  });

  describe('serializeInstructors', () => {
    it('should serialize array with single instructor', () => {
      const instructors = ['John Doe'];

      const result = serializeInstructors(instructors);

      expect(result).toEqual(['John Doe']);
    });

    it('should serialize array with multiple instructors', () => {
      const instructors = ['John Doe', 'Jane Smith', 'Bob Johnson'];

      const result = serializeInstructors(instructors);

      expect(result).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
    });

    it('should serialize empty array', () => {
      const instructors: string[] = [];

      const result = serializeInstructors(instructors);

      expect(result).toEqual([]);
    });

    it('should serialize array with staff placeholder', () => {
      const instructors = ['staff'];

      const result = serializeInstructors(instructors);

      expect(result).toEqual(['staff']);
    });
  });
});
