import { useState, useEffect } from 'react';
import type { Course } from '../types/Course';
import type { PlannedCourse } from '../types/PlannedCourse';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Custom hook to batch fetch course details for all planned courses
 * Returns a Map for O(1) lookup by courseId
 */
export function useCourseDetails(plannedCourses: PlannedCourse[]) {
  const [courseDetailsMap, setCourseDetailsMap] = useState<Map<string, Course>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // Extract unique courseIds (filter out null/undefined)
        const courseIds = Array.from(
          new Set(
            plannedCourses
              .map((pc) => pc.courseId)
              .filter((id): id is string => id !== null && id !== undefined)
          )
        );

        if (courseIds.length === 0) {
          setCourseDetailsMap(new Map());
          setLoading(false);
          return;
        }

        // Batch fetch all course details in parallel
        const fetchPromises = courseIds.map(async (courseId) => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/courses/by-course-id/${courseId}`);
            if (!response.ok) {
              console.warn(`Failed to fetch course ${courseId}: ${response.status}`);
              return null;
            }
            const data = await response.json();
            return { courseId, course: data.data as Course };
          } catch (err) {
            console.error(`Error fetching course ${courseId}:`, err);
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);

        // Build Map from results (filter out failed fetches)
        const detailsMap = new Map<string, Course>();
        results.forEach((result) => {
          if (result && result.course) {
            detailsMap.set(result.courseId, result.course);
          }
        });

        setCourseDetailsMap(detailsMap);
      } catch (err) {
        console.error('Error batch fetching course details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch course details');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [plannedCourses]);

  return { courseDetailsMap, loading, error };
}
