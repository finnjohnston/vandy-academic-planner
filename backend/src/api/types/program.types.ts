export type ProgramRequirements = {
  sections: Section[];
  constraints: string[];
};

export type Section = {
  id: string;
  title: string;
  creditsRequired: number;
  requirements: Requirement[];
  constraints: string[];
};

export type Requirement = {
  id: string;
  title: string;
  description: string;
  creditsRequired: number;
  rule: Rule;
  constraints: string[];
};

export type Rule =
  | GroupRule
  | TakeCoursesRule
  | TakeFromListRule
  | TakeAnyCoursesRule;

export type GroupRule = {
  type: "group";
  operator: "AND" | "OR";
  rules: Rule[];
};

export type TakeCoursesRule = {
  type: "take_courses";
  courses: string[];
};

export type TakeFromListRule = {
  type: "take_from_list";
  count: number;
  countType: "courses" | "credits";
  courses: string[];
};

export type TakeAnyCoursesRule = {
  type: "take_any_courses";
  credits: number;
  filter: CourseFilter;
};

// Filter Types (Phase 6 implementation)
export type CourseFilter =
  | PlaceholderFilter
  | SubjectNumberFilter
  | AttributeFilter
  | CourseListFilter
  | CourseNumberSuffixFilter
  | CompositeFilter;

export type PlaceholderFilter = {
  type: "placeholder";
};

export type SubjectNumberFilter = {
  type: "subject_number";
  subjects: string[];
  numbers?: NumberConstraint[];
  exclude?: string[];
};

export type NumberConstraint =
  | { type: "specific"; values: string[] }
  | { type: "range"; min: number; max?: number };

export type AttributeFilter = {
  type: "attribute";
  attributes: string[];
  attributeType?: "axle" | "core";
  exclude?: {
    subjects?: string[];
  };
};

export type CourseListFilter = {
  type: "course_list";
  courses: string[];
};

export type CourseNumberSuffixFilter = {
  type: "course_number_suffix";
  suffixes: string[];
  subjects?: string[];
  exclude?: string[];
};

export type CompositeFilter = {
  type: "composite";
  operator: "AND" | "OR";
  filters: CourseFilter[];
};

export type RuleType = "group" | "take_courses" | "take_from_list" | "take_any_courses";
export type OperatorType = "AND" | "OR";
export type CountType = "courses" | "credits";

export type ProgramSeedData = {
  programId: string;
  name: string;
  type: string;
  totalCredits: number;
  schoolId: number;
  academicYearId: number;
  requirements: ProgramRequirements;
};
