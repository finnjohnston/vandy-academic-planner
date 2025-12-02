export interface DbClassInput {
  classId: string;
  termId: string;
  courseId?: string | null;

  subjectCode: string;
  courseNumber: string;
  title: string;

  school: string | null;
  creditsMin: number;
  creditsMax: number;
  description: string | null;
  attributes: any | null;
  requirements: any | null;
}
