import { describe, it, expect, vi } from 'vitest';
import {
  buildDoubleCountMap,
  canDoubleCount,
  checkEnforcementConstraints,
  validateRequirementConstraints,
  validateSectionConstraints,
  validateProgramConstraints,
} from '../../../src/api/services/constraint.service.js';
import { ProgramRequirements, Requirement } from '../../../src/api/types/program.types.js';
import { FulfillmentRecord } from '../../../src/api/types/constraint.types.js';

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
  },
}));

describe('constraint.service', () => {
  describe('double count map', () => {
    it('builds map from all constraint scopes and supports lookup', () => {
      const requirements: ProgramRequirements = {
        sections: [
          {
            id: 'section_a',
            title: 'Section A',
            creditsRequired: 3,
            requirements: [
              {
                id: 'req_a',
                title: 'Req A',
                description: 'Req A',
                creditsRequired: 3,
                rule: { type: 'take_courses', courses: ['CS 1101'] },
                constraintsStructured: [
                  {
                    id: 'allow_double_count_req_a',
                    type: 'allow_double_count',
                    courseId: 'CS 1101',
                    requirementIds: ['section_a.req_a'],
                  },
                ],
              },
            ],
          },
        ],
        constraintsStructured: [
          {
            id: 'allow_double_count_program',
            type: 'allow_double_count',
            courseId: 'CS 1101',
            requirementIds: ['section_a.req_b'],
          },
        ],
      };

      const map = buildDoubleCountMap(requirements);
      expect(map.size).toBe(1);
      expect(canDoubleCount('CS 1101', 'section_a.req_a', map)).toBe(true);
      expect(canDoubleCount('CS 1101', 'section_a.req_b', map)).toBe(true);
      expect(canDoubleCount('CS 1101', 'section_a.req_c', map)).toBe(false);
    });
  });

  describe('enforcement constraints', () => {
    const course = {
      id: 1,
      courseId: 'CS 1101',
      title: 'Programming',
      subjectCode: 'CS',
      courseNumber: '1101',
      attributes: null,
      academicYearId: 1,
      school: null,
      creditsMin: 3,
      creditsMax: 3,
      typicallyOffered: null,
      description: null,
      requirements: null,
      isCatalogCourse: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('rejects assignment when course is not in required sections', () => {
      const requirement: Requirement = {
        id: 'writing',
        title: 'Writing',
        description: 'Writing requirement',
        creditsRequired: 3,
        rule: { type: 'take_courses', courses: ['CS 1101'] },
        constraintsStructured: [
          {
            id: 'require_course_from_sections_or',
            type: 'require_course_from_sections',
            description: 'Must be from allowed section',
            allowedSectionIds: ['allowed'],
            operator: 'OR',
          },
        ],
      };

      const programRequirements: ProgramRequirements = {
        sections: [
          {
            id: 'restricted',
            title: 'Restricted',
            creditsRequired: 3,
            requirements: [requirement],
          },
          {
            id: 'allowed',
            title: 'Allowed',
            creditsRequired: 3,
            requirements: [],
          },
        ],
      };

      const fulfillments: FulfillmentRecord[] = [];
      const result = checkEnforcementConstraints(
        course,
        requirement,
        'restricted',
        fulfillments,
        programRequirements
      );

      expect(result.allowed).toBe(false);
    });

    it('allows assignment when course also fulfills an allowed section', () => {
      const requirement: Requirement = {
        id: 'writing',
        title: 'Writing',
        description: 'Writing requirement',
        creditsRequired: 3,
        rule: { type: 'take_courses', courses: ['CS 1101'] },
        constraintsStructured: [
          {
            id: 'require_course_from_sections_or',
            type: 'require_course_from_sections',
            description: 'Must be from allowed section',
            allowedSectionIds: ['allowed'],
            operator: 'OR',
          },
        ],
      };

      const programRequirements: ProgramRequirements = {
        sections: [
          {
            id: 'restricted',
            title: 'Restricted',
            creditsRequired: 3,
            requirements: [requirement],
          },
          {
            id: 'allowed',
            title: 'Allowed',
            creditsRequired: 3,
            requirements: [],
          },
        ],
      };

      const fulfillments: FulfillmentRecord[] = [
        {
          requirementId: 'allowed.core',
          sectionId: 'allowed',
          course: {
            id: 1,
            courseId: 'CS 1101',
            title: 'Programming',
            credits: 3,
            subjectCode: 'CS',
            courseNumber: '1101',
            attributes: null,
          },
          creditsApplied: 3,
        },
      ];

      const result = checkEnforcementConstraints(
        course,
        requirement,
        'restricted',
        fulfillments,
        programRequirements
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('validation constraints', () => {
    it('validates requirement constraints and ignores enforcement ones', () => {
      const requirement: Requirement = {
        id: 'req',
        title: 'Requirement',
        description: 'Requirement',
        creditsRequired: 6,
        rule: { type: 'take_any_courses', credits: 6, filter: { type: 'any' } },
        constraintsStructured: [
          {
            id: 'allow_double_count_ignore',
            type: 'allow_double_count',
            courseId: 'CS 1101',
            requirementIds: ['section.req'],
          },
          {
            id: 'min_course_count_lab',
            type: 'min_course_count',
            description: 'At least one lab',
            count: 1,
            filter: { type: 'course_number_suffix', suffixes: ['L'] },
          },
          {
            id: 'min_course_count_mns',
            type: 'min_course_count',
            description: 'At least one MNS attribute course',
            count: 1,
            filter: {
              type: 'attribute',
              attributes: ['AXLE: Math and Natural Sciences'],
              attributeType: 'axle',
            },
          },
          {
            id: 'max_course_count_cs',
            type: 'max_course_count',
            description: 'At most two CS courses',
            count: 2,
            filter: { type: 'subject_number', subjects: ['CS'] },
          },
          {
            id: 'max_credits_cs1101',
            type: 'max_credits_from_courses',
            description: 'Max 2 credits from CS 1101',
            maxCredits: 2,
            courseIds: ['CS 1101'],
          },
          {
            id: 'min_credits_phys_lab',
            type: 'min_credits_from_courses',
            description: 'Min 1 credit from PHYS 1601L',
            minCredits: 1,
            courseIds: ['PHYS 1601L'],
          },
          {
            id: 'course_number_range_cs',
            type: 'course_number_range',
            description: 'At least one CS course above 2000',
            subjectCode: 'CS',
            minNumber: 2000,
            minCount: 1,
            operator: 'above',
          },
        ],
      };

      const fulfillments: FulfillmentRecord[] = [
        {
          requirementId: 'section.req',
          sectionId: 'section',
          course: {
            id: 1,
            courseId: 'CS 1101',
            title: 'Programming',
            credits: 3,
            subjectCode: 'CS',
            courseNumber: '1101',
            attributes: {
              axle: ['AXLE: Math and Natural Sciences'],
              core: [],
            },
          },
          creditsApplied: 3,
        },
        {
          requirementId: 'section.req',
          sectionId: 'section',
          course: {
            id: 2,
            courseId: 'CS 2201',
            title: 'Data Structures',
            credits: 3,
            subjectCode: 'CS',
            courseNumber: '2201',
            attributes: null,
          },
          creditsApplied: 3,
        },
        {
          requirementId: 'section.req',
          sectionId: 'section',
          course: {
            id: 3,
            courseId: 'PHYS 1601L',
            title: 'Physics Lab',
            credits: 1,
            subjectCode: 'PHYS',
            courseNumber: '1601L',
            attributes: null,
          },
          creditsApplied: 1,
        },
      ];

      const context = {
        requirementId: 'section.req',
        sectionId: 'section',
        planProgramId: 1,
        allFulfillments: fulfillments,
      };

      const validation = validateRequirementConstraints(requirement, context);

      expect(validation.results).toHaveLength(6);
      expect(validation.allSatisfied).toBe(false);

      const labConstraint = validation.results.find(
        (r) => r.constraint.type === 'min_course_count'
      );
      const maxCourseConstraint = validation.results.find(
        (r) => r.constraint.type === 'max_course_count'
      );
      const maxCreditsConstraint = validation.results.find(
        (r) => r.constraint.type === 'max_credits_from_courses'
      );
      const minCreditsConstraint = validation.results.find(
        (r) => r.constraint.type === 'min_credits_from_courses'
      );
      const mnsConstraint = validation.results.find(
        (r) => r.constraint.type === 'min_course_count' &&
          (r.constraint as any).filter?.type === 'attribute'
      );
      const rangeConstraint = validation.results.find(
        (r) => r.constraint.type === 'course_number_range'
      );

      expect(labConstraint?.satisfied).toBe(true);
      expect(maxCourseConstraint?.satisfied).toBe(true);
      expect(maxCreditsConstraint?.satisfied).toBe(false);
      expect(minCreditsConstraint?.satisfied).toBe(true);
      expect(mnsConstraint?.satisfied).toBe(true);
      expect(rangeConstraint?.satisfied).toBe(true);
    });

    it('validates section and program constraints', () => {
      const section = {
        id: 'section',
        title: 'Section',
        creditsRequired: 3,
        requirements: [],
        constraintsStructured: [
          {
            id: 'max_course_count_section_cs',
            type: 'max_course_count',
            description: 'At most one CS course',
            count: 1,
            filter: { type: 'subject_number', subjects: ['CS'] },
          },
        ],
      };

      const programRequirements = {
        sections: [section],
      constraintsStructured: [
        {
          id: 'min_course_count_program_lab',
          type: 'min_course_count',
          description: 'At least one lab course',
          count: 1,
          filter: { type: 'course_number_suffix', suffixes: ['L'] },
        },
        ],
      };

      const fulfillments: FulfillmentRecord[] = [
        {
          requirementId: 'section.req',
          sectionId: 'section',
          course: {
            id: 1,
            courseId: 'CS 1101',
            title: 'Programming',
            credits: 3,
            subjectCode: 'CS',
            courseNumber: '1101',
            attributes: null,
          },
          creditsApplied: 3,
        },
        {
          requirementId: 'section.req',
          sectionId: 'section',
          course: {
            id: 2,
            courseId: 'PHYS 1601L',
            title: 'Physics Lab',
            credits: 1,
            subjectCode: 'PHYS',
            courseNumber: '1601L',
            attributes: null,
          },
          creditsApplied: 1,
        },
      ];

      const context = {
        requirementId: '',
        sectionId: 'section',
        planProgramId: 1,
        programRequirements,
        allFulfillments: fulfillments,
      };

      const sectionValidation = validateSectionConstraints(section as any, context);
      const programValidation = validateProgramConstraints(programRequirements as any, context);

      expect(sectionValidation.allSatisfied).toBe(true);
      expect(programValidation.allSatisfied).toBe(true);
    });
  });
});
