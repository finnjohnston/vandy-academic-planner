import { ProgramRequirements } from '../types/program.types.js';
import { Course } from '@prisma/client';
import { evaluateRule } from './ruleEvaluator.service.js';

export interface RequirementMatch {
  sectionId: string;
  requirementId: string;
  specificityScore: number;
}

/**
 * Finds all requirements in program that this course could fulfill
 * Returns matches sorted by specificity (highest first)
 */
export function findMatchingRequirements(
  course: Course,
  programRequirements: ProgramRequirements
): RequirementMatch[] {
  const matches: RequirementMatch[] = [];

  // Iterate through all sections and requirements
  for (const section of programRequirements.sections) {
    for (const requirement of section.requirements) {
      // Evaluate if course matches this requirement's rule
      const evaluation = evaluateRule(requirement.rule, course);

      if (evaluation.matches) {
        matches.push({
          sectionId: section.id,
          requirementId: requirement.id,
          specificityScore: evaluation.specificityScore,
        });
      }
    }
  }

  // Sort by specificity (highest first)
  matches.sort((a, b) => b.specificityScore - a.specificityScore);

  return matches;
}
