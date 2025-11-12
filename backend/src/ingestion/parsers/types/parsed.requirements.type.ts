export type LogicalExpression = 
  | { $and: Array<string | LogicalExpression> }
  | { $or: Array<string | LogicalExpression> }
  | string;

export interface ParsedRequirements {
  prerequisites: {
    rawText: string | null;
    courses: LogicalExpression | null;
  };
  corequisites: {
    rawText: string | null;
    courses: LogicalExpression | null;
  };
}