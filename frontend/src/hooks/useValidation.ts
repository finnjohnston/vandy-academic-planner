import { useMemo } from 'react';
import type { PlannedCourse } from '../types/PlannedCourse';
import type { Course } from '../types/Course';
import type { ValidationMap } from '../types/Validation';
import { validatePlannedCourse } from '../utils/validationUtils';

/**
 * Custom hook to validate all planned courses against their prerequisites and corequisites
 * Returns a Map of validation results keyed by plannedCourse.id
 */
export function useValidation(
  plannedCourses: PlannedCourse[],
  courseDetailsMap: Map<string, Course>
): ValidationMap {
  return useMemo(() => {
    const validationMap: ValidationMap = new Map();

    for (const plannedCourse of plannedCourses) {
      // Skip validation for transfer credits (semester 0)
      if (plannedCourse.semesterNumber === 0) {
        validationMap.set(plannedCourse.id, { isValid: true, violations: [] });
        continue;
      }

      // Skip validation for courses without courseId (e.g., placeholders)
      if (!plannedCourse.courseId) {
        validationMap.set(plannedCourse.id, { isValid: true, violations: [] });
        continue;
      }

      // Get course details from map
      const courseDetails = courseDetailsMap.get(plannedCourse.courseId);

      // If no course details found, default to valid (benefit of the doubt)
      if (!courseDetails) {
        validationMap.set(plannedCourse.id, { isValid: true, violations: [] });
        continue;
      }

      // Validate the course
      const result = validatePlannedCourse(
        plannedCourse,
        courseDetails,
        plannedCourses,
        courseDetailsMap
      );

      validationMap.set(plannedCourse.id, result);
    }

    return validationMap;
  }, [plannedCourses, courseDetailsMap]);
}
