export interface DbSectionInput {
  sectionId: string;
  termId: string;
  classId: string;

  sectionNumber: string;
  sectionType: string;

  instructors: any;
  schedule: any | null;
  creditsMin: number;
  creditsMax: number;
}
