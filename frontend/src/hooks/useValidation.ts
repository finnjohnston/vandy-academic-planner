import { useMemo } from 'react';
import type { PlannedCourse } from '../types/PlannedCourse';
import type { Course } from '../types/Course';
import type { ValidationMap } from '../types/Validation';
import { validatePlannedCourse, validateTermPlacement } from '../utils/validationUtils';

/**
 * Custom hook to validate all planned courses against:
 * - Prerequisites and corequisites
 * - Term availability (checks if course is offered in that semester)
 * Returns a Map of validation results keyed by plannedCourse.id
 */
export function useValidation(
  plannedCourses: PlannedCourse[],
  courseDetailsMap: Map<string, Course>,
  academicYearStart: number,
  termAvailability: Map<number, Set<string>>,
  isLoadingTerms: boolean
): ValidationMap {
  return useMemo(() => {
    const validationMap: ValidationMap = new Map();

    for (const plannedCourse of plannedCourses) {
      // Skip validation for transfer credits (semester 0)
      if (plannedCourse.semesterNumber === 0) {
        validationMap.set(plannedCourse.id, { isValid: true, violations: [] });
        continue;
      }

      const violations = [];

      // Validate prerequisites and corequisites for courses with courseId
      if (plannedCourse.courseId) {
        const courseDetails = courseDetailsMap.get(plannedCourse.courseId);
        if (courseDetails) {
          const result = validatePlannedCourse(
            plannedCourse,
            courseDetails,
            plannedCourses,
            courseDetailsMap
          );
          violations.push(...result.violations);
        }
      }

      // Validate term placement for ALL courses (only if term data is loaded)
      if (!isLoadingTerms) {
        const termViolations = validateTermPlacement(
          plannedCourse,
          termAvailability
        );
        violations.push(...termViolations);
      }

      validationMap.set(plannedCourse.id, {
        isValid: violations.length === 0,
        violations,
      });
    }

    return validationMap;
  }, [plannedCourses, courseDetailsMap, academicYearStart, termAvailability, isLoadingTerms]);
}
