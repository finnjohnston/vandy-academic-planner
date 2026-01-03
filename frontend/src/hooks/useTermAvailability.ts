import { useEffect, useState, useRef } from 'react';

interface Term {
  id: number;
  termId: string;
  academicYearId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface SemesterInfo {
  semesterNumber: number;
  year: number;
  season: 'Fall' | 'Spring';
}

/**
 * Hook to fetch and manage term availability data for validation
 * Maps semester numbers to their termIds by matching semester info with term names
 * Returns a Map of semesterNumber -> Set of available course codes
 */
export function useTermAvailability(
  academicYearStart: number,
  maxSemesterNumber: number
): { data: Map<number, Set<string>>; isLoading: boolean } {
  const [termAvailability, setTermAvailability] = useState<Map<number, Set<string>>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedRef = useRef({ year: 0, maxSem: 0 });

  useEffect(() => {
    // Check if we need to fetch
    const needsFetch =
      maxSemesterNumber > 0 &&
      (academicYearStart !== lastFetchedRef.current.year ||
       maxSemesterNumber > lastFetchedRef.current.maxSem);

    if (!needsFetch) return;

    const fetchTermAvailability = async () => {
      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

        // Fetch all terms
        const termsResponse = await fetch(`${baseUrl}/api/terms`);

        if (!termsResponse.ok) {
          throw new Error('Failed to fetch terms');
        }

        const termsData = await termsResponse.json();
        const terms: Term[] = termsData.data || [];

        // Build map of term name to termId
        const termNameToId = new Map<string, string>();
        terms.forEach((term) => {
          termNameToId.set(term.name, term.termId);
        });

        // Calculate semester info for each semester number
        const semesterInfos: SemesterInfo[] = [];
        for (let semesterNum = 1; semesterNum <= maxSemesterNumber; semesterNum++) {
          const isOdd = semesterNum % 2 === 1;
          const season = isOdd ? 'Fall' : 'Spring';
          const yearOffset = Math.floor(semesterNum / 2);
          const year = academicYearStart + yearOffset;

          semesterInfos.push({ semesterNumber: semesterNum, year, season });
        }

        // Fetch available courses for each semester
        const termDataMap = new Map<number, Set<string>>();

        const fetchPromises = semesterInfos.map(async ({ semesterNumber, year, season }) => {
          const termName = `${year} ${season}`;
          const termId = termNameToId.get(termName);

          if (!termId) {
            // Term data doesn't exist for this semester, skip it
            return { semesterNumber, courses: [] };
          }

          try {
            const response = await fetch(
              `${baseUrl}/api/classes/term/${termId}/available-courses`
            );

            if (!response.ok) {
              return { semesterNumber, courses: [] };
            }

            const data = await response.json();
            const courses = data.data || [];

            return {
              semesterNumber,
              courses: courses.map(
                (c: { subjectCode: string; courseNumber: string }) =>
                  `${c.subjectCode} ${c.courseNumber}`
              ),
            };
          } catch (error) {
            console.error(`Error fetching courses for semester ${semesterNumber}:`, error);
            return { semesterNumber, courses: [] };
          }
        });

        const results = await Promise.all(fetchPromises);

        // Build the map
        results.forEach(({ semesterNumber, courses }) => {
          if (courses.length > 0) {
            termDataMap.set(semesterNumber, new Set(courses));
          }
        });

        setTermAvailability(termDataMap);
        lastFetchedRef.current = { year: academicYearStart, maxSem: maxSemesterNumber };
      } catch (error) {
        console.error('Error fetching term availability:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTermAvailability();
  }, [academicYearStart, maxSemesterNumber]);

  return { data: termAvailability, isLoading };
}
