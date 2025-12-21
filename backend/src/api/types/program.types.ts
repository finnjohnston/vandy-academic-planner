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

export type CourseFilter = {
  type: "placeholder";
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
