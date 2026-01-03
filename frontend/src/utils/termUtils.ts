/**
 * Calculate expected termId for a semester
 * Term ID format: (year - 1920)(5 for Fall, 0 for Spring)
 * Examples: "1055" = Fall 2025, "1060" = Spring 2026
 * - Odd semesters = Fall (5)
 * - Even semesters = Spring (0)
 * - Year = startYear + floor(semesterNumber / 2)
 */
export const calculateExpectedTermId = (
  semesterNumber: number,
  academicYearStart: number
): string => {
  const isOdd = semesterNumber % 2 === 1;
  const termCode = isOdd ? '5' : '0';
  const yearOffset = Math.floor(semesterNumber / 2);
  const calendarYear = academicYearStart + yearOffset;
  const yearCode = calendarYear - 1920;
  return `${yearCode}${termCode}`;
};

/**
 * Get human-readable semester name from termId
 * Term ID format: (year - 1920)(5 for Fall, 0 for Spring)
 * Examples: "1055" = Fall 2025, "1060" = Spring 2026
 */
export const getTermName = (termId: string): string => {
  if (!termId || termId.length < 3) return 'Unknown';
  const lastChar = termId.charAt(termId.length - 1);
  const yearCode = termId.substring(0, termId.length - 1);
  const year = parseInt(yearCode) + 1920;
  const season = lastChar === '5' ? 'Fall' : lastChar === '0' ? 'Spring' : 'Unknown';
  return `${season} ${year}`;
};
