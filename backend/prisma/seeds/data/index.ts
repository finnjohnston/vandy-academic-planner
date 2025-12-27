import { ProgramSeedData, ProgramRequirements } from '../../../src/api/types/program.types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load JSON files
const computerScienceMajor = JSON.parse(
  readFileSync(join(__dirname, 'computer-science-major.json'), 'utf-8')
) as ProgramRequirements;

const economicsMinor = JSON.parse(
  readFileSync(join(__dirname, 'economics-minor.json'), 'utf-8')
) as ProgramRequirements;

const mathematicsMajor = JSON.parse(
  readFileSync(join(__dirname, 'mathematics-major.json'), 'utf-8')
) as ProgramRequirements;

const collegeCore = JSON.parse(
  readFileSync(join(__dirname, 'college-core.json'), 'utf-8')
) as ProgramRequirements;

export const programs: ProgramSeedData[] = [
  {
    programId: 'computer_science_major',
    name: 'Computer Science',
    type: 'major',
    totalCredits: 120,
    schoolId: 1,
    academicYearId: 869,
    requirements: computerScienceMajor
  },
  {
    programId: 'mathematics_major',
    name: 'Mathematics',
    type: 'major',
    totalCredits: 29,
    schoolId: 2,
    academicYearId: 869,
    requirements: mathematicsMajor
  },
  {
    programId: 'economics_minor',
    name: 'Economics',
    type: 'minor',
    totalCredits: 21,
    schoolId: 2,
    academicYearId: 869,
    requirements: economicsMinor
  },
  {
    programId: 'college_core',
    name: 'College Core',
    type: 'core',
    totalCredits: 83,
    schoolId: 2,
    academicYearId: 869,
    requirements: collegeCore
  }
];
