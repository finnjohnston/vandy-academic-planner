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
          constraints: [],
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
          constraints: [],
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
          constraints: [],
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
          constraints: [],
        },
      ],
      constraints: [],
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
          constraints: [],
        },
      ],
      constraints: [],
    },
  ],
  constraints: [],
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
          constraints: [],
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
          constraints: [],
        },
      ],
      constraints: [],
    },
  ],
  constraints: [],
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
});
