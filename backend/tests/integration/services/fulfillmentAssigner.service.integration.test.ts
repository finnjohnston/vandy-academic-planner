import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import { autoAssignFulfillments } from '../../../src/api/services/fulfillmentAssigner.service.js';
import { ProgramRequirements } from '../../../src/api/types/program.types.js';

// Test data IDs
let academicYearId: number;
let schoolEngineering: number;
let schoolArtsScience: number;
const courseIds: Record<string, number> = {};
const programIds: Record<string, number> = {};

// CS Major requirements (subset for testing)
const csMajorRequirements: ProgramRequirements = {
  sections: [
    {
      id: 'general_degree_requirements',
      title: 'General degree requirements',
      creditsRequired: 38,
      requirements: [
        {
          id: 'calculus',
          title: 'Calculus',
          description: 'Choose a calculus sequence',
          creditsRequired: 11,
          rule: {
            type: 'group',
            operator: 'OR',
            rules: [
              {
                type: 'take_courses',
                courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
              },
            ],
          },
        },
        {
          id: 'basic_science',
          title: 'Basic science',
          description: 'Choose 12 credits',
          creditsRequired: 12,
          rule: {
            type: 'take_from_list',
            count: 12,
            countType: 'credits',
            courses: ['PHYS 1601', 'PHYS 1601L', 'PHYS 1602', 'PHYS 1602L'],
          },
        },
        {
          id: 'introduction_to_engineering',
          title: 'Introduction to Engineering',
          description: 'Take the following courses',
          creditsRequired: 3,
          rule: {
            type: 'take_courses',
            courses: ['ES 1401', 'ES 1402', 'ES 1403'],
          },
        },
        {
          id: 'ethics',
          title: 'Ethics',
          description: 'Take CS 1151',
          creditsRequired: 3,
          rule: {
            type: 'take_courses',
            courses: ['CS 1151'],
          },
        },
      ],
    },
    {
      id: 'computer_science_major',
      title: 'Computer Science Major',
      creditsRequired: 44,
      requirements: [
        {
          id: 'computer_science_core',
          title: 'Computer Science Core',
          description: 'Take core CS courses',
          creditsRequired: 25,
          rule: {
            type: 'take_courses',
            courses: ['CS 1101', 'CS 2201', 'CS 2212'],
          },
        },
      ],
    },
  ],
};

const mathMajorRequirements: ProgramRequirements = {
  sections: [
    {
      id: 'mathematics_major',
      title: 'Mathematics major',
      creditsRequired: 29,
      requirements: [
        {
          id: 'calculus',
          title: 'Calculus',
          description: 'Choose a calculus sequence',
          creditsRequired: 11,
          rule: {
            type: 'group',
            operator: 'OR',
            rules: [
              {
                type: 'take_courses',
                courses: ['MATH 1300', 'MATH 1301', 'MATH 2300'],
              },
            ],
          },
        },
        {
          id: 'upper_level_mathematics',
          title: 'Upper level mathematics',
          description: 'MATH 2800 or above',
          creditsRequired: 12,
          rule: {
            type: 'take_any_courses',
            credits: 12,
            filter: { type: 'any' },
          },
        },
      ],
    },
  ],
};

// Helper to create test data
async function createTestData() {
  // Create academic year
  const academicYear = await prisma.academicYear.create({
    data: {
      year: '2025-2026',
      start: 2025,
      end: 2026,
      isCurrent: true,
    },
  });
  academicYearId = academicYear.id;

  // Create schools
  const engr = await prisma.school.create({
    data: { code: 'ENGR', name: 'School of Engineering' },
  });
  schoolEngineering = engr.id;

  const arts = await prisma.school.create({
    data: { code: 'AS', name: 'College of Arts and Science' },
  });
  schoolArtsScience = arts.id;

  // Create courses
  const courses = [
    { courseId: 'CS 1101', subject: 'CS', number: '1101', title: 'Programming', credits: 3 },
    { courseId: 'CS 2201', subject: 'CS', number: '2201', title: 'Data Structures', credits: 3 },
    { courseId: 'CS 2212', subject: 'CS', number: '2212', title: 'Discrete Structures', credits: 3 },
    { courseId: 'CS 1151', subject: 'CS', number: '1151', title: 'Ethics', credits: 3 },
    { courseId: 'MATH 1300', subject: 'MATH', number: '1300', title: 'Diff Calculus', credits: 4 },
    { courseId: 'MATH 1301', subject: 'MATH', number: '1301', title: 'Integral Calculus', credits: 4 },
    { courseId: 'MATH 2300', subject: 'MATH', number: '2300', title: 'Multivariable Calc', credits: 3 },
    { courseId: 'PHYS 1601', subject: 'PHYS', number: '1601', title: 'Physics I', credits: 4 },
    { courseId: 'PHYS 1601L', subject: 'PHYS', number: '1601L', title: 'Physics I Lab', credits: 1 },
    { courseId: 'ES 1401', subject: 'ES', number: '1401', title: 'Intro Eng Pt 1', credits: 1 },
    { courseId: 'ES 1402', subject: 'ES', number: '1402', title: 'Intro Eng Pt 2', credits: 1 },
    { courseId: 'ES 1403', subject: 'ES', number: '1403', title: 'Intro Eng Pt 3', credits: 1 },
  ];

  for (const c of courses) {
    const created = await prisma.course.create({
      data: {
        courseId: c.courseId,
        academicYearId,
        subjectCode: c.subject,
        courseNumber: c.number,
        title: c.title,
        school: 'School of Engineering',
        creditsMin: c.credits,
        creditsMax: c.credits,
        isCatalogCourse: true,
      },
    });
    courseIds[c.courseId] = created.id;
  }

  // Create programs
  const csProgram = await prisma.program.create({
    data: {
      programId: 'computer_science_major',
      name: 'Computer Science Major',
      type: 'major',
      totalCredits: 120,
      requirements: csMajorRequirements as any,
      academicYearId,
      schoolId: schoolEngineering,
    },
  });
  programIds.cs = csProgram.id;

  const mathProgram = await prisma.program.create({
    data: {
      programId: 'mathematics_major',
      name: 'Mathematics Major',
      type: 'major',
      totalCredits: 29,
      requirements: mathMajorRequirements as any,
      academicYearId,
      schoolId: schoolArtsScience,
    },
  });
  programIds.math = mathProgram.id;
}

describe('fulfillmentAssigner.service - Integration Tests', () => {
  beforeEach(async () => {
    // Note: setup.ts handles database cleanup
    await createTestData();
  });

  it('should create fulfillment for single program, single course', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1101',
        semesterNumber: 1,
        credits: 3,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(1);
    expect(fulfillments[0].requirementId).toBe('computer_science_major.computer_science_core');
    expect(fulfillments[0].creditsApplied).toBe(3);
  });

  it('should create multiple fulfillments for single program, multiple courses', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 1101', semesterNumber: 1, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 2201', semesterNumber: 1, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 2212', semesterNumber: 2, credits: 3 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: { requirementId: 'asc' },
    });

    expect(fulfillments).toHaveLength(3);
    expect(fulfillments.every(f => f.requirementId === 'computer_science_major.computer_science_core')).toBe(true);
  });

  it('should select highest specificity requirement when course matches multiple', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1300', semesterNumber: 1, credits: 4 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(1);
    expect(fulfillments[0].requirementId).toBe('general_degree_requirements.calculus');
  });

  it('should create fulfillments for multiple programs with same courses', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1300', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1301', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 2300', semesterNumber: 2, credits: 3 },
    });

    const csPlanProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    const mathPlanProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.math,
      },
    });

    await autoAssignFulfillments(plan.id);

    const csFulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: csPlanProgram.id },
    });

    const mathFulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: mathPlanProgram.id },
    });

    expect(csFulfillments).toHaveLength(3);
    expect(csFulfillments.every(f => f.requirementId === 'general_degree_requirements.calculus')).toBe(true);

    expect(mathFulfillments).toHaveLength(3);
    expect(mathFulfillments.every(f => f.requirementId === 'mathematics_major.calculus')).toBe(true);
  });

  it('should handle GROUP OR rule - all courses in option match independently', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1300', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1301', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 2300', semesterNumber: 2, credits: 3 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(3);
    expect(fulfillments.every(f => f.requirementId === 'general_degree_requirements.calculus')).toBe(true);
  });

  it('should handle take_from_list rule', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'PHYS 1601', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'PHYS 1601L', semesterNumber: 1, credits: 1 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(2);
    expect(fulfillments.every(f => f.requirementId === 'general_degree_requirements.basic_science')).toBe(true);
  });

  it('should handle take_any_courses with any filter', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolArtsScience,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1300', semesterNumber: 1, credits: 4 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.math,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(1);
    // MATH 1300 matches calculus (score 100) over upper_level_mathematics (score 10)
    expect(fulfillments[0].requirementId).toBe('mathematics_major.calculus');
  });

  it('should clear and re-assign fulfillments when called multiple times', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 1101', semesterNumber: 1, credits: 3 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    // First assignment
    await autoAssignFulfillments(plan.id);

    let fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(1);

    // Add another course
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 2201', semesterNumber: 1, credits: 3 },
    });

    // Second assignment
    await autoAssignFulfillments(plan.id);

    fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(2);
  });

  it('should handle course with no matches gracefully', async () => {
    // Create a course that doesn't match any requirement
    await prisma.course.create({
      data: {
        courseId: 'HIST 2100',
        academicYearId,
        subjectCode: 'HIST',
        courseNumber: '2100',
        title: 'US History',
        school: 'College of Arts and Science',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'HIST 2100', semesterNumber: 1, credits: 3 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(0);
  });

  it('should handle empty plan (no courses) gracefully', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(0);
  });

  it('should handle plan with no programs gracefully', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 1101', semesterNumber: 1, credits: 3 },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany();

    expect(fulfillments).toHaveLength(0);
  });

  it('should handle full course load with complex distribution', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    // Add all 12 provided courses
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 1101', semesterNumber: 1, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 2201', semesterNumber: 1, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 2212', semesterNumber: 2, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'CS 1151', semesterNumber: 1, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1300', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 1301', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'MATH 2300', semesterNumber: 2, credits: 3 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'PHYS 1601', semesterNumber: 1, credits: 4 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'PHYS 1601L', semesterNumber: 1, credits: 1 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'ES 1401', semesterNumber: 1, credits: 1 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'ES 1402', semesterNumber: 1, credits: 1 },
    });
    await prisma.plannedCourse.create({
      data: { planId: plan.id, courseId: 'ES 1403', semesterNumber: 1, credits: 1 },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: programIds.cs,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      include: {
        plannedCourse: {
          include: {
            course: true,
          },
        },
      },
    });

    expect(fulfillments).toHaveLength(12);

    // Verify distribution
    const csCoreCount = fulfillments.filter(f => f.requirementId === 'computer_science_major.computer_science_core').length;
    const ethicsCount = fulfillments.filter(f => f.requirementId === 'general_degree_requirements.ethics').length;
    const calculusCount = fulfillments.filter(f => f.requirementId === 'general_degree_requirements.calculus').length;
    const basicScienceCount = fulfillments.filter(f => f.requirementId === 'general_degree_requirements.basic_science').length;
    const introEngCount = fulfillments.filter(f => f.requirementId === 'general_degree_requirements.introduction_to_engineering').length;

    expect(csCoreCount).toBe(3); // CS 1101, 2201, 2212
    expect(ethicsCount).toBe(1); // CS 1151
    expect(calculusCount).toBe(3); // MATH 1300, 1301, 2300
    expect(basicScienceCount).toBe(2); // PHYS 1601, 1601L
    expect(introEngCount).toBe(3); // ES 1401, 1402, 1403
  });

  it('should allow double counting when configured', async () => {
    const programRequirements: ProgramRequirements = {
      sections: [
        {
          id: 'core',
          title: 'Core',
          creditsRequired: 6,
          requirements: [
            {
              id: 'ethics',
              title: 'Ethics',
              description: 'Take CS 1151',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1151'] },
            },
            {
              id: 'liberal_arts_core',
              title: 'Liberal Arts Core',
              description: 'Take CS 1151',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1151'] },
            },
          ],
        },
      ],
      constraintsStructured: [
        {
          id: 'allow_double_count_cs1151',
          type: 'allow_double_count',
          courseId: 'CS 1151',
          requirementIds: ['core.ethics', 'core.liberal_arts_core'],
        },
      ],
    };

    const program = await prisma.program.create({
      data: {
        programId: 'double_count_major',
        name: 'Double Count Major',
        type: 'major',
        totalCredits: 6,
        requirements: programRequirements as any,
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: 'Double Count Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: program.id,
      },
    });

    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1151',
        semesterNumber: 1,
        position: 0,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: { requirementId: 'asc' },
    });

    expect(fulfillments).toHaveLength(2);
    expect(fulfillments.map((f) => f.requirementId)).toEqual([
      'core.ethics',
      'core.liberal_arts_core',
    ]);
  });

  it('should enforce require_course_from_sections constraints', async () => {
    const programRequirements: ProgramRequirements = {
      sections: [
        {
          id: 'restricted',
          title: 'Restricted',
          creditsRequired: 3,
          requirements: [
            {
              id: 'writing',
              title: 'Writing',
              description: 'Any course, but must be from allowed section',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1101'] },
              constraintsStructured: [
                {
                  id: 'require_course_from_sections_allowed',
                  type: 'require_course_from_sections',
                  description: 'Must come from allowed section',
                  allowedSectionIds: ['allowed'],
                  operator: 'OR',
                },
              ],
            },
          ],
        },
        {
          id: 'allowed',
          title: 'Allowed',
          creditsRequired: 3,
          requirements: [
            {
              id: 'core',
              title: 'Core',
              description: 'Any course',
              creditsRequired: 3,
              rule: {
                type: 'take_any_courses',
                credits: 3,
                filter: { type: 'any' },
              },
            },
          ],
        },
      ],
    };

    const program = await prisma.program.create({
      data: {
        programId: 'enforcement_major',
        name: 'Enforcement Major',
        type: 'major',
        totalCredits: 6,
        requirements: programRequirements as any,
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: 'Enforcement Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: program.id,
      },
    });

    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1101',
        semesterNumber: 1,
        position: 0,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    expect(fulfillments).toHaveLength(1);
    expect(fulfillments[0].requirementId).toBe('allowed.core');
  });

  it('should enforce require_course_from_sections with AND operator', async () => {
    const programRequirements: ProgramRequirements = {
      sections: [
        {
          id: 'restricted',
          title: 'Restricted',
          creditsRequired: 3,
          requirements: [
            {
              id: 'writing',
              title: 'Writing',
              description: 'Must also be in both allowed sections',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1101'] },
              constraintsStructured: [
                {
                  id: 'require_course_from_sections_and',
                  type: 'require_course_from_sections',
                  description: 'Must be in both allowed sections',
                  allowedSectionIds: ['allowed_a', 'allowed_b'],
                  operator: 'AND',
                },
              ],
            },
          ],
        },
        {
          id: 'allowed_a',
          title: 'Allowed A',
          creditsRequired: 3,
          requirements: [
            {
              id: 'core',
              title: 'Core A',
              description: 'Take CS 1101',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1101'] },
            },
          ],
        },
        {
          id: 'allowed_b',
          title: 'Allowed B',
          creditsRequired: 3,
          requirements: [
            {
              id: 'core',
              title: 'Core B',
              description: 'Take CS 1101',
              creditsRequired: 3,
              rule: { type: 'take_courses', courses: ['CS 1101'] },
            },
          ],
        },
      ],
      constraintsStructured: [
        {
          id: 'allow_double_count_cs1101',
          type: 'allow_double_count',
          courseId: 'CS 1101',
          requirementIds: [
            'restricted.writing',
            'allowed_a.core',
            'allowed_b.core',
          ],
        },
      ],
    };

    const program = await prisma.program.create({
      data: {
        programId: 'enforcement_major_and',
        name: 'Enforcement Major AND',
        type: 'major',
        totalCredits: 9,
        requirements: programRequirements as any,
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: 'Enforcement Plan AND',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: program.id,
      },
    });

    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1101',
        semesterNumber: 1,
        position: 0,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: { requirementId: 'asc' },
    });

    expect(fulfillments).toHaveLength(3);
    expect(fulfillments.map((f) => f.requirementId)).toEqual([
      'allowed_a.core',
      'allowed_b.core',
      'restricted.writing',
    ]);
  });

  it('should prioritize unfilled requirements over filled ones', async () => {
    // Create a program with two requirements that both accept CS courses
    // One is a specific 3-credit requirement, the other is a broader 12-credit requirement
    const programRequirements: ProgramRequirements = {
      sections: [
        {
          id: 'core_requirements',
          title: 'Core Requirements',
          creditsRequired: 15,
          requirements: [
            {
              id: 'specific_cs_requirement',
              title: 'Specific CS Requirement',
              description: 'Take specific CS courses',
              creditsRequired: 3,
              rule: {
                type: 'take_from_list',
                count: 3,
                countType: 'credits',
                courses: ['CS 1101', 'CS 2201', 'CS 2212', 'CS 1151'],
              },
            },
            {
              id: 'broader_cs_core',
              title: 'Broader CS Core',
              description: 'Take any CS courses',
              creditsRequired: 12,
              rule: {
                type: 'take_any_courses',
                credits: 12,
                filter: {
                  type: 'any',
                },
              },
            },
          ],
        },
      ],
    };

    const program = await prisma.program.create({
      data: {
        programId: 'prioritization_test_major',
        name: 'Prioritization Test Major',
        type: 'major',
        totalCredits: 15,
        requirements: programRequirements as any,
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: 'Prioritization Test Plan',
        academicYearId,
        schoolId: schoolEngineering,
      },
    });

    const planProgram = await prisma.planProgram.create({
      data: {
        planId: plan.id,
        programId: program.id,
      },
    });

    // Add first CS course - should fill the specific requirement (more specific)
    const course1 = await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1101',
        semesterNumber: 1,
        position: 0,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    let fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
    });

    // First course should go to the specific requirement (higher specificity)
    expect(fulfillments).toHaveLength(1);
    expect(fulfillments[0].requirementId).toBe('core_requirements.specific_cs_requirement');
    expect(fulfillments[0].creditsApplied).toBe(3);

    // Add second CS course - should go to broader requirement (specific one is now full)
    const course2 = await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 2201',
        semesterNumber: 1,
        position: 1,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: [{ plannedCourseId: 'asc' }],
    });

    // Should have 2 fulfillments now
    expect(fulfillments).toHaveLength(2);

    // First course still assigned to specific requirement
    expect(fulfillments[0].requirementId).toBe('core_requirements.specific_cs_requirement');
    expect(fulfillments[0].plannedCourseId).toBe(course1.id);

    // Second course should go to broader requirement (not overflow the specific one)
    expect(fulfillments[1].requirementId).toBe('core_requirements.broader_cs_core');
    expect(fulfillments[1].plannedCourseId).toBe(course2.id);
    expect(fulfillments[1].creditsApplied).toBe(3);

    // Add third and fourth CS courses - should also go to broader requirement
    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 2212',
        semesterNumber: 2,
        position: 0,
        credits: 3,
      },
    });

    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1151',
        semesterNumber: 2,
        position: 1,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: [{ requirementId: 'asc' }],
    });

    // Should have 4 fulfillments total
    expect(fulfillments).toHaveLength(4);

    // Count by requirement
    const specificCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.specific_cs_requirement'
    ).length;
    const broaderCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.broader_cs_core'
    ).length;

    // Specific requirement should have exactly 1 course (3/3 credits)
    expect(specificCount).toBe(1);

    // Broader requirement should have 3 courses (9/12 credits)
    expect(broaderCount).toBe(3);

    // Verify broader requirement is not yet full (9 < 12)
    const broaderCredits = fulfillments
      .filter((f) => f.requirementId === 'core_requirements.broader_cs_core')
      .reduce((sum, f) => sum + f.creditsApplied, 0);
    expect(broaderCredits).toBe(9);

    // Add fifth CS course - should still go to broader requirement
    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 1101', // Reusing course ID for test
        semesterNumber: 3,
        position: 0,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: [{ requirementId: 'asc' }],
    });

    // Should have 5 fulfillments total
    expect(fulfillments).toHaveLength(5);

    const finalSpecificCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.specific_cs_requirement'
    ).length;
    const finalBroaderCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.broader_cs_core'
    ).length;

    // Specific requirement should still have exactly 1 course
    expect(finalSpecificCount).toBe(1);

    // Broader requirement should now have 4 courses (12/12 credits - full)
    expect(finalBroaderCount).toBe(4);

    // Add sixth CS course - now BOTH requirements are full, should overflow to specific (higher specificity)
    await prisma.plannedCourse.create({
      data: {
        planId: plan.id,
        courseId: 'CS 2201', // Reusing course ID for test
        semesterNumber: 3,
        position: 1,
        credits: 3,
      },
    });

    await autoAssignFulfillments(plan.id);

    fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId: planProgram.id },
      orderBy: [{ requirementId: 'asc' }],
    });

    // Should have 6 fulfillments total
    expect(fulfillments).toHaveLength(6);

    const overflowSpecificCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.specific_cs_requirement'
    ).length;
    const overflowBroaderCount = fulfillments.filter(
      (f) => f.requirementId === 'core_requirements.broader_cs_core'
    ).length;

    // When all requirements are full, overflow should go to most specific
    // So specific requirement should now have 2 courses (overflow)
    expect(overflowSpecificCount).toBe(2);

    // Broader requirement should still have 4 courses
    expect(overflowBroaderCount).toBe(4);
  });
});
