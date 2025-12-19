import type { Course } from './Course';

export interface DragData {
  source: 'search' | 'planned';
  course: Course;
  searchContext?: {
    type: 'year' | 'term';
    termId?: string;
  };
  plannedCourseId?: number;
  currentSemester?: number;
  currentPosition?: number;
}
