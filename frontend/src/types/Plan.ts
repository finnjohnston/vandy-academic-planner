export interface Plan {
  id: number;
  name: string;
  schoolId: number | null;
  academicYearId: number;
  academicYear?: {
    id: number;
    year: string;
    start: number;
    end: number;
  } | null;
  school?: {
    id: number;
    code: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  currentSemester: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
