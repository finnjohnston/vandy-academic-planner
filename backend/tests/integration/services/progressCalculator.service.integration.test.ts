import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../../src/config/prisma.js';
import { calculateProgramProgress } from '../../../src/api/services/progressCalculator.service.js';
import { aggregatePlanProgress } from '../../../src/api/services/planProgressAggregator.service.js';
import { autoAssignFulfillments } from '../../../src/api/services/fulfillmentAssigner.service.js';
import { ProgramRequirements } from '../../../src/api/types/program.types.js';

describe('progressCalculator.service integration', () => {
  let academicYear: { id: number };
  let school: { id: number };

  beforeEach(async () => {
    // Create base data
    academicYear = await prisma.academicYear.create({
      data: { year: '2024-2025', start: 2024, end: 2025 },
    });

    school = await prisma.school.create({
      data: { code: 'SOE', name: 'School of Engineering' },
    });
  });

  describe('calculateProgramProgress', () => {
    it('should calculate progress for empty plan', async () => {
      // Create program
      const csProgram = await prisma.program.create({
        data: {
          programId: 'cs_major',
          name: 'Computer Science Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'cs_core',
                title: 'CS Core',
                creditsRequired: 12,
                requirements: [
                  {
                    id: 'intro_courses',
                    title: 'Intro Courses',
                    description: 'Take CS 1101 and CS 2201',
                    creditsRequired: 6,
                    rule: {
                      type: 'take_courses',
                      courses: ['CS 1101', 'CS 2201'],
                    },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with no courses
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
        },
      });

      const planProgram = await prisma.planProgram.create({
        data: {
          planId: plan.id,
          programId: csProgram.id,
        },
      });

      // Calculate progress
      const progress = await calculateProgramProgress(planProgram.id);

      expect(progress.status).toBe('not_started');
      expect(progress.percentage).toBe(0);
      expect(progress.totalCreditsFulfilled).toBe(0);
      expect(progress.totalCreditsRequired).toBe(120);
      expect(progress.sectionProgress).toHaveLength(1);
      expect(progress.sectionProgress[0].status).toBe('not_started');
      expect(progress.sectionProgress[0].requirementProgress).toHaveLength(1);
    });

    it('should calculate progress for partially completed plan', async () => {
      // Create courses
      const cs1101 = await prisma.course.create({
        data: {
          courseId: 'CS 1101',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      const cs2201 = await prisma.course.create({
        data: {
          courseId: 'CS 2201',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      // Create program
      const csProgram = await prisma.program.create({
        data: {
          programId: 'cs_major',
          name: 'Computer Science Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'cs_core',
                title: 'CS Core',
                creditsRequired: 6,
                requirements: [
                  {
                    id: 'intro_courses',
                    title: 'Intro Courses',
                    description: 'Take CS 1101 and CS 2201',
                    creditsRequired: 6,
                    rule: {
                      type: 'take_courses',
                      courses: ['CS 1101', 'CS 2201'],
                    },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with one course
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
          plannedCourses: {
            create: [
              {
                courseId: cs1101.courseId,
                semesterNumber: 1,
                position: 0,
                credits: 3,
              },
            ],
          },
        },
      });

      const planProgram = await prisma.planProgram.create({
        data: {
          planId: plan.id,
          programId: csProgram.id,
        },
      });

      // Auto-assign fulfillments
      await autoAssignFulfillments(plan.id);

      // Calculate progress
      const progress = await calculateProgramProgress(planProgram.id);

      expect(progress.status).toBe('in_progress');
      expect(progress.totalCreditsFulfilled).toBe(3);
      expect(progress.percentage).toBe(2.5); // 3/120 = 2.5%

      const section = progress.sectionProgress[0];
      expect(section.status).toBe('in_progress');
      expect(section.creditsFulfilled).toBe(3);
      expect(section.percentage).toBe(50); // 3/6 = 50%

      const requirement = section.requirementProgress[0];
      expect(requirement.status).toBe('in_progress');
      expect(requirement.creditsFulfilled).toBe(3);
      expect(requirement.percentage).toBe(50); // 3/6 = 50%
      expect(requirement.ruleProgress.status).toBe('in_progress');
      expect(requirement.ruleProgress.percentage).toBe(50); // 1/2 courses
      expect(requirement.fulfillingCourses).toHaveLength(1);
      expect(requirement.fulfillingCourses[0].courseId).toBe('CS 1101');
    });

    it('should calculate progress for completed requirement', async () => {
      // Create courses
      const cs1101 = await prisma.course.create({
        data: {
          courseId: 'CS 1101',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      const cs2201 = await prisma.course.create({
        data: {
          courseId: 'CS 2201',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '2201',
          title: 'Data Structures',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      // Create program
      const csProgram = await prisma.program.create({
        data: {
          programId: 'cs_major',
          name: 'Computer Science Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'cs_core',
                title: 'CS Core',
                creditsRequired: 6,
                requirements: [
                  {
                    id: 'intro_courses',
                    title: 'Intro Courses',
                    description: 'Take CS 1101 and CS 2201',
                    creditsRequired: 6,
                    rule: {
                      type: 'take_courses',
                      courses: ['CS 1101', 'CS 2201'],
                    },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with both courses
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
          plannedCourses: {
            create: [
              {
                courseId: cs1101.courseId,
                semesterNumber: 1,
                position: 0,
                credits: 3,
              },
              {
                courseId: cs2201.courseId,
                semesterNumber: 1,
                position: 1,
                credits: 3,
              },
            ],
          },
        },
      });

      const planProgram = await prisma.planProgram.create({
        data: {
          planId: plan.id,
          programId: csProgram.id,
        },
      });

      // Auto-assign fulfillments
      await autoAssignFulfillments(plan.id);

      // Calculate progress
      const progress = await calculateProgramProgress(planProgram.id);

      expect(progress.status).toBe('in_progress');
      expect(progress.totalCreditsFulfilled).toBe(6);

      const requirement = progress.sectionProgress[0].requirementProgress[0];
      expect(requirement.status).toBe('completed');
      expect(requirement.creditsFulfilled).toBe(6);
      expect(requirement.percentage).toBe(100);
      expect(requirement.ruleProgress.status).toBe('completed');
      expect(requirement.ruleProgress.percentage).toBe(100);
      expect(requirement.fulfillingCourses).toHaveLength(2);
    });

    it('should calculate progress for take_from_list rule', async () => {
      // Create courses
      const math1300 = await prisma.course.create({
        data: {
          courseId: 'MATH 1300',
          academicYearId: academicYear.id,
          subjectCode: 'MATH',
          courseNumber: '1300',
          title: 'Calculus I',
          school: 'SOE',
          creditsMin: 4,
          creditsMax: 4,
        },
      });

      // Create program with take_from_list
      const mathProgram = await prisma.program.create({
        data: {
          programId: 'math_major',
          name: 'Mathematics Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'math_electives',
                title: 'Math Electives',
                creditsRequired: 8,
                requirements: [
                  {
                    id: 'elective_choice',
                    title: 'Choose 2 courses',
                    description: 'Take 2 from the list',
                    creditsRequired: 8,
                    rule: {
                      type: 'take_from_list',
                      count: 2,
                      countType: 'courses',
                      courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
                    },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with one course
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
          plannedCourses: {
            create: [
              {
                courseId: math1300.courseId,
                semesterNumber: 1,
                position: 0,
                credits: 4,
              },
            ],
          },
        },
      });

      const planProgram = await prisma.planProgram.create({
        data: {
          planId: plan.id,
          programId: mathProgram.id,
        },
      });

      // Auto-assign fulfillments
      await autoAssignFulfillments(plan.id);

      // Calculate progress
      const progress = await calculateProgramProgress(planProgram.id);

      const requirement = progress.sectionProgress[0].requirementProgress[0];
      expect(requirement.ruleProgress.type).toBe('take_from_list');
      expect(requirement.ruleProgress.percentage).toBe(50); // 1/2 courses
      expect(requirement.status).toBe('in_progress');
      if (requirement.ruleProgress.details.type === 'take_from_list') {
        expect(requirement.ruleProgress.details.fulfilled).toBe(1);
        expect(requirement.ruleProgress.details.required).toBe(2);
        expect(requirement.ruleProgress.details.takenCourses).toEqual(['MATH 1300']);
      }
    });

    it('should calculate progress for GROUP OR rule', async () => {
      // Create courses
      const cs1101 = await prisma.course.create({
        data: {
          courseId: 'CS 1101',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      // Create program with GROUP OR
      const program = await prisma.program.create({
        data: {
          programId: 'test_program',
          name: 'Test Program',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'test_section',
                title: 'Test Section',
                creditsRequired: 3,
                requirements: [
                  {
                    id: 'choice_requirement',
                    title: 'Choose Path',
                    description: 'Take CS or Math',
                    creditsRequired: 3,
                    rule: {
                      type: 'group',
                      operator: 'OR',
                      rules: [
                        { type: 'take_courses', courses: ['CS 1101'] },
                        { type: 'take_courses', courses: ['MATH 1300'] },
                      ],
                    },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with CS course
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
          plannedCourses: {
            create: [
              {
                courseId: cs1101.courseId,
                semesterNumber: 1,
                position: 0,
                credits: 3,
              },
            ],
          },
        },
      });

      const planProgram = await prisma.planProgram.create({
        data: {
          planId: plan.id,
          programId: program.id,
        },
      });

      // Auto-assign fulfillments
      await autoAssignFulfillments(plan.id);

      // Calculate progress
      const progress = await calculateProgramProgress(planProgram.id);

      const requirement = progress.sectionProgress[0].requirementProgress[0];
      expect(requirement.ruleProgress.type).toBe('group');
      expect(requirement.ruleProgress.status).toBe('completed');
      expect(requirement.ruleProgress.percentage).toBe(100); // Max of options
      if (requirement.ruleProgress.details.type === 'group') {
        expect(requirement.ruleProgress.details.operator).toBe('OR');
        expect(requirement.ruleProgress.details.activeOptionIndex).toBe(0); // First option chosen
        expect(requirement.ruleProgress.details.subRuleProgress[0].percentage).toBe(100);
        expect(requirement.ruleProgress.details.subRuleProgress[1].percentage).toBe(0);
      }
    });
  });

  describe('aggregatePlanProgress', () => {
    it('should aggregate progress across multiple programs', async () => {
      // Create courses
      const cs1101 = await prisma.course.create({
        data: {
          courseId: 'CS 1101',
          academicYearId: academicYear.id,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'SOE',
          creditsMin: 3,
          creditsMax: 3,
        },
      });

      const math1300 = await prisma.course.create({
        data: {
          courseId: 'MATH 1300',
          academicYearId: academicYear.id,
          subjectCode: 'MATH',
          courseNumber: '1300',
          title: 'Calculus I',
          school: 'SOE',
          creditsMin: 4,
          creditsMax: 4,
        },
      });

      // Create two programs
      const csProgram = await prisma.program.create({
        data: {
          programId: 'cs_major',
          name: 'Computer Science Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'cs_core',
                title: 'CS Core',
                creditsRequired: 3,
                requirements: [
                  {
                    id: 'intro',
                    title: 'Intro',
                    description: 'Take CS 1101',
                    creditsRequired: 3,
                    rule: { type: 'take_courses', courses: ['CS 1101'] },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      const mathProgram = await prisma.program.create({
        data: {
          programId: 'math_major',
          name: 'Mathematics Major',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [
              {
                id: 'math_core',
                title: 'Math Core',
                creditsRequired: 4,
                requirements: [
                  {
                    id: 'calc',
                    title: 'Calculus',
                    description: 'Take MATH 1300',
                    creditsRequired: 4,
                    rule: { type: 'take_courses', courses: ['MATH 1300'] },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      // Create plan with both courses
      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
          plannedCourses: {
            create: [
              {
                courseId: cs1101.courseId,
                semesterNumber: 1,
                position: 0,
                credits: 3,
              },
              {
                courseId: math1300.courseId,
                semesterNumber: 1,
                position: 1,
                credits: 4,
              },
            ],
          },
        },
      });

      // Add both programs to plan
      await prisma.planProgram.create({
        data: { planId: plan.id, programId: csProgram.id },
      });
      await prisma.planProgram.create({
        data: { planId: plan.id, programId: mathProgram.id },
      });

      // Auto-assign fulfillments
      await autoAssignFulfillments(plan.id);

      // Aggregate progress
      const overview = await aggregatePlanProgress(plan.id);

      expect(overview.planId).toBe(plan.id);
      expect(overview.totalPrograms).toBe(2);
      expect(overview.completedPrograms).toBe(0);
      expect(overview.overallStatus).toBe('in_progress');
      expect(overview.programs).toHaveLength(2);

      const csProgress = overview.programs.find((p) => p.programName === 'Computer Science Major');
      expect(csProgress).toBeDefined();
      expect(csProgress!.creditsFulfilled).toBe(3);
      expect(csProgress!.creditsRequired).toBe(120);
      expect(csProgress!.status).toBe('in_progress');

      const mathProgress = overview.programs.find((p) => p.programName === 'Mathematics Major');
      expect(mathProgress).toBeDefined();
      expect(mathProgress!.creditsFulfilled).toBe(4);
      expect(mathProgress!.creditsRequired).toBe(120);
      expect(mathProgress!.status).toBe('in_progress');
    });

    it('should show not_started for plan with no courses', async () => {
      const program = await prisma.program.create({
        data: {
          programId: 'test_program',
          name: 'Test Program',
          type: 'major',
          totalCredits: 120,
          academicYearId: academicYear.id,
          schoolId: school.id,
          requirements: {
            sections: [],
            constraints: [],
          } as ProgramRequirements,
        },
      });

      const plan = await prisma.plan.create({
        data: {
          name: 'My Plan',
          academicYearId: academicYear.id,
          schoolId: school.id,
        },
      });

      await prisma.planProgram.create({
        data: { planId: plan.id, programId: program.id },
      });

      const overview = await aggregatePlanProgress(plan.id);

      expect(overview.overallStatus).toBe('not_started');
      expect(overview.completedPrograms).toBe(0);
    });
  });
});
