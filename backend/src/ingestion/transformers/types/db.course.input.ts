export interface DbCourseInput {
  courseId: string;
  academicYearId: number;

  subjectCode: string;
  courseNumber: string;
  title: string;

  school: string | null;
  creditsMin: number;
  creditsMax: number;
  typicallyOffered: string | null;
  description: string | null;
  attributes: any | null;
  requirements: any | null;
}
