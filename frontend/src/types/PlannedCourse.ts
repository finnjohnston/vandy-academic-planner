export interface PlannedCourse {
  id: number;
  planId: number;
  courseId?: string;
  classId?: string;
  semesterNumber: number;
  credits: number;
  subjectCode: string;
  courseNumber: string;
  createdAt: string;
  updatedAt: string;
}
