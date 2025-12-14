export interface Course {
  id: number;
  courseId: string;
  subjectCode: string;
  courseNumber: string;
  title: string;
  creditsMin: number;
  creditsMax: number;
  academicYearId: number;
  school?: string;
  typicallyOffered?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  attributes?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
}
