export interface PlannedCourse {
  id: number;
  planId: number;
  courseId?: string;
  classId?: string;
  semesterNumber: number;
  position: number;
  credits: number;
  subjectCode: string;
  courseNumber: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  class?: {
    termId: string;
    subjectCode: string;
    courseNumber: string;
    title: string;
  };
}
