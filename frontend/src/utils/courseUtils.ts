/**
 * Check if a course identifier (e.g., "CS 1101") is in the user's plan
 * @param courseId - Course identifier string (e.g., "CS 1101")
 * @param plannedCourses - Array of planned courses from the plan
 * @returns true if course is in plan, false otherwise
 */
export const isCourseInPlan = (
  courseId: string,
  plannedCourses: any[]
): boolean => {
  if (!courseId || !plannedCourses) return false;

  // Normalize course ID: trim and handle spacing variations
  const normalized = courseId.trim().replace(/\s+/g, ' ').toUpperCase();

  return plannedCourses.some(pc => {
    // Check courseId field directly
    if (pc.courseId) {
      const plannedNormalized = pc.courseId.trim().replace(/\s+/g, ' ').toUpperCase();
      return plannedNormalized === normalized;
    }

    // Fallback: construct from subjectCode + courseNumber
    // Handle both flat structure (PlannedCourse) and nested structure (PlanData)
    const subjectCode = pc.subjectCode || pc.course?.subjectCode;
    const courseNumber = pc.courseNumber || pc.course?.courseNumber;

    if (subjectCode && courseNumber) {
      const constructed = `${subjectCode} ${courseNumber}`
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
      return constructed === normalized;
    }

    return false;
  });
};

/**
 * Extract all course IDs from a LogicalExpression structure
 * @param logic - The logical expression to extract from
 * @returns Array of course ID strings
 */
export const extractCourseIds = (logic: any): string[] => {
  if (typeof logic === 'string') {
    return [logic];
  }

  if (typeof logic === 'object' && logic !== null) {
    if (logic.$and && Array.isArray(logic.$and)) {
      return logic.$and.flatMap(extractCourseIds);
    }
    if (logic.$or && Array.isArray(logic.$or)) {
      return logic.$or.flatMap(extractCourseIds);
    }
  }

  return [];
};
