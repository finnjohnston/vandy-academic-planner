import { describe, it, expect } from 'vitest';
import { findMatchingRequirements } from '../../../src/api/services/requirementMatcher.service.js';
import { Course } from '@prisma/client';
import { ProgramRequirements } from '../../../src/api/types/program.types.js';

// Mock course objects
const mockCourseCS1101: Course = {
  id: 1,
  courseId: 'CS 1101',
  academicYearId: 869,
  subjectCode: 'CS',
  courseNumber: '1101',
  title: 'Programming and Problem Solving',
  school: 'School of Engineering',
  creditsMin: 3,
  creditsMax: 3,
  typicallyOffered: null,
  description: null,
  attributes: null,
  requirements: null,
  isCatalogCourse: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCourseMATH1300: Course = {
  ...mockCourseCS1101,
  id: 2,
  courseId: 'MATH 1300',
  subjectCode: 'MATH',
  courseNumber: '1300',
  title: 'Differential Calculus',
  creditsMin: 4,
  creditsMax: 4,
};

const mockCourseHIST2100: Course = {
  ...mockCourseCS1101,
  id: 3,
  courseId: 'HIST 2100',
  subjectCode: 'HIST',
  courseNumber: '2100',
  title: 'US History',
};

// Mock program requirements
const mockProgramRequirements: ProgramRequirements = {
  sections: [
    {
      id: 'general_requirements',
      title: 'General Requirements',
      creditsRequired: 20,
      requirements: [
        {
          id: 'calculus',
          title: 'Calculus',
          description: 'Take calculus courses',
          creditsRequired: 11,
          rule: {
            type: 'take_courses',
            courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
          },
          constraints: [],
        },
        {
          id: 'math_elective',
          title: 'Math Elective',
          description: 'Choose a math course',
          creditsRequired: 3,
          rule: {
            type: 'take_from_list',
            count: 1,
            countType: 'courses',
            courses: ['MATH 1300', 'MATH 2410', 'MATH 3000'],
          },
          constraints: [],
        },
      ],
      constraints: [],
    },
    {
      id: 'cs_core',
      title: 'CS Core',
      creditsRequired: 25,
      requirements: [
        {
          id: 'cs_intro',
          title: 'CS Intro',
          description: 'Take intro CS',
          creditsRequired: 3,
          rule: {
            type: 'take_courses',
            courses: ['CS 1101'],
          },
          constraints: [],
        },
      ],
      constraints: [],
    },
  ],
  constraints: [],
};

describe('requirementMatcher.service', () => {
  describe('findMatchingRequirements', () => {
    it('should return multiple matches sorted by specificity (highest first)', () => {
      const matches = findMatchingRequirements(mockCourseMATH1300, mockProgramRequirements);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        sectionId: 'general_requirements',
        requirementId: 'calculus',
        specificityScore: 100,
      });
      expect(matches[1]).toEqual({
        sectionId: 'general_requirements',
        requirementId: 'math_elective',
        specificityScore: 80,
      });
    });

    it('should return single match when only one requirement matches', () => {
      const matches = findMatchingRequirements(mockCourseCS1101, mockProgramRequirements);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        sectionId: 'cs_core',
        requirementId: 'cs_intro',
        specificityScore: 100,
      });
    });

    it('should return empty array when no requirements match', () => {
      const matches = findMatchingRequirements(mockCourseHIST2100, mockProgramRequirements);

      expect(matches).toHaveLength(0);
      expect(matches).toEqual([]);
    });

    it('should find matches from multiple sections', () => {
      const programWithMultipleSections: ProgramRequirements = {
        sections: [
          {
            id: 'section_a',
            title: 'Section A',
            creditsRequired: 10,
            requirements: [
              {
                id: 'req_a1',
                title: 'Requirement A1',
                description: 'Test',
                creditsRequired: 3,
                rule: {
                  type: 'take_courses',
                  courses: ['CS 1101'],
                },
                constraints: [],
              },
            ],
            constraints: [],
          },
          {
            id: 'section_b',
            title: 'Section B',
            creditsRequired: 10,
            requirements: [
              {
                id: 'req_b1',
                title: 'Requirement B1',
                description: 'Test',
                creditsRequired: 3,
                rule: {
                  type: 'take_from_list',
                  count: 1,
                  countType: 'courses',
                  courses: ['CS 1101', 'CS 2201'],
                },
                constraints: [],
              },
            ],
            constraints: [],
          },
        ],
        constraints: [],
      };

      const matches = findMatchingRequirements(mockCourseCS1101, programWithMultipleSections);

      expect(matches).toHaveLength(2);
      expect(matches[0].sectionId).toBe('section_a');
      expect(matches[0].requirementId).toBe('req_a1');
      expect(matches[0].specificityScore).toBe(100);
      expect(matches[1].sectionId).toBe('section_b');
      expect(matches[1].requirementId).toBe('req_b1');
      expect(matches[1].specificityScore).toBe(80);
    });

    it('should return empty array for empty program requirements', () => {
      const emptyProgram: ProgramRequirements = {
        sections: [],
        constraints: [],
      };

      const matches = findMatchingRequirements(mockCourseCS1101, emptyProgram);

      expect(matches).toHaveLength(0);
      expect(matches).toEqual([]);
    });

    it('should return empty array for section with no requirements', () => {
      const programWithEmptySection: ProgramRequirements = {
        sections: [
          {
            id: 'empty_section',
            title: 'Empty Section',
            creditsRequired: 0,
            requirements: [],
            constraints: [],
          },
        ],
        constraints: [],
      };

      const matches = findMatchingRequirements(mockCourseCS1101, programWithEmptySection);

      expect(matches).toHaveLength(0);
      expect(matches).toEqual([]);
    });

    it('should maintain stable sort for requirements with equal scores', () => {
      const programWithEqualScores: ProgramRequirements = {
        sections: [
          {
            id: 'test_section',
            title: 'Test Section',
            creditsRequired: 10,
            requirements: [
              {
                id: 'req_1',
                title: 'Requirement 1',
                description: 'First',
                creditsRequired: 3,
                rule: {
                  type: 'take_courses',
                  courses: ['CS 1101'],
                },
                constraints: [],
              },
              {
                id: 'req_2',
                title: 'Requirement 2',
                description: 'Second',
                creditsRequired: 3,
                rule: {
                  type: 'take_courses',
                  courses: ['CS 1101'],
                },
                constraints: [],
              },
            ],
            constraints: [],
          },
        ],
        constraints: [],
      };

      const matches = findMatchingRequirements(mockCourseCS1101, programWithEqualScores);

      expect(matches).toHaveLength(2);
      expect(matches[0].requirementId).toBe('req_1');
      expect(matches[1].requirementId).toBe('req_2');
      expect(matches[0].specificityScore).toBe(100);
      expect(matches[1].specificityScore).toBe(100);
    });

    it('should handle complex nested GROUP OR rules', () => {
      const programWithGroupRules: ProgramRequirements = {
        sections: [
          {
            id: 'math_section',
            title: 'Math Section',
            creditsRequired: 11,
            requirements: [
              {
                id: 'calculus_sequence',
                title: 'Calculus Sequence',
                description: 'Choose a sequence',
                creditsRequired: 11,
                rule: {
                  type: 'group',
                  operator: 'OR',
                  rules: [
                    {
                      type: 'take_courses',
                      courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
                    },
                    {
                      type: 'take_courses',
                      courses: ['MATH 1300', 'MATH 1301', 'MATH 2310'],
                    },
                  ],
                },
                constraints: [],
              },
            ],
            constraints: [],
          },
        ],
        constraints: [],
      };

      const matches = findMatchingRequirements(mockCourseMATH1300, programWithGroupRules);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        sectionId: 'math_section',
        requirementId: 'calculus_sequence',
        specificityScore: 100,
      });
    });
  });
});
