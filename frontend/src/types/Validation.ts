export type ViolationType =
  | 'prerequisite-not-taken'
  | 'prerequisite-wrong-semester'
  | 'corequisite-not-taken'
  | 'corequisite-wrong-semester'
  | 'mutual-corequisite-missing'
  | 'mutual-corequisite-different-semester'
  | 'wrong-term';

export interface Violation {
  type: ViolationType;
  message: string;
  relatedCourseId?: string;
  expectedSemester?: number;
  actualSemester?: number;
  expectedTermId?: string;
  actualTermId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: Violation[];
}

export type ValidationMap = Map<number, ValidationResult>;
