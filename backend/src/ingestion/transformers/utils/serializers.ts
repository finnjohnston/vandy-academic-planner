import { ParsedAttributes } from '../../parsers/types/core/parsed.attributes.type.js';
import { ParsedRequirements } from '../../parsers/types/core/parsed.requirements.type.js';
import { ParsedSchedule } from '../../parsers/types/core/parsed.schedule.type.js';

/**
 * Serializes ParsedAttributes to JSON format for database storage
 * Returns null if both axle and core are null/empty
 * @param attributes The parsed attributes object
 * @returns JSON-serializable object or null
 */
export function serializeAttributes(attributes: ParsedAttributes): any | null {
  if (!attributes.axle && !attributes.core) {
    return null;
  }
  
  const result: any = {};
  if (attributes.axle) result.axle = attributes.axle;
  if (attributes.core) result.core = attributes.core;
  
  return result;
}

/**
 * Serializes ParsedRequirements to JSON format for database storage
 * Returns null if there are no prerequisites or corequisites
 * @param requirements The parsed requirements object
 * @returns JSON-serializable object or null
 */
export function serializeRequirements(requirements: ParsedRequirements): any | null {
  const hasPrereqs = requirements.prerequisites.courses !== null;
  const hasCoreqs = requirements.corequisites.courses !== null;
  
  if (!hasPrereqs && !hasCoreqs) {
    return null;
  }
  
  return {
    prerequisites: {
      rawText: requirements.prerequisites.rawText,
      courses: requirements.prerequisites.courses,
    },
    corequisites: {
      rawText: requirements.corequisites.rawText,
      courses: requirements.corequisites.courses,
    },
  };
}

/**
 * Serializes ParsedSchedule to JSON format for database storage
 * Returns null if schedule is empty/invalid
 * @param schedule The parsed schedule object
 * @returns JSON-serializable object or null
 */
export function serializeSchedule(schedule: ParsedSchedule): any | null {
  if (schedule.days.length === 0 && !schedule.startTime) {
    return null;
  }
  
  return {
    days: schedule.days,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    raw: schedule.raw,
  };
}

/**
 * Serializes instructors array to JSON format
 * Returns the array as-is (Prisma will handle JSON conversion)
 * @param instructors Array of instructor names
 * @returns The instructors array
 */
export function serializeInstructors(instructors: string[]): any {
  return instructors;
}
