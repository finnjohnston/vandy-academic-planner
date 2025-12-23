import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import { autoAssignFulfillments } from '../../../src/api/services/fulfillmentAssigner.service.js';
import { ProgramRequirements } from '../../../src/api/types/program.types.js';

// Test data IDs
let academicYearId: number;
let schoolId: number;
const courseIds: Record<string, number> = {};
let planId: number;
let planProgramId: number;

// Test program with double counting
const testProgramRequirements: ProgramRequirements = {
  sections: [
    {
      id: 'general_degree_requirements',
      title: 'General degree requirements',
      creditsRequired: 6,
      requirements: [
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
      id: 'liberal_arts_core',
      title: 'Liberal Arts Core',
      creditsRequired: 12,
      requirements: [
        {
          id: '12_credits_liberal_arts_core',
          title: '12 credits from liberal arts core',
          description: 'Choose liberal arts courses including CS 1151',
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
  constraintsStructured: [
    {
      id: 'allow_double_count_cs1151',
      type: 'allow_double_count',
      courseId: 'CS 1151',
      requirementIds: [
        'general_degree_requirements.ethics',
        'liberal_arts_core.12_credits_liberal_arts_core',
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

  // Create school
  const school = await prisma.school.create({
    data: { name: 'School of Engineering', code: 'ENGR' },
  });
  schoolId = school.id;

  // Create courses
  const cs1151 = await prisma.course.create({
    data: {
      courseId: 'CS 1151',
      academicYearId,
      subjectCode: 'CS',
      courseNumber: '1151',
      title: 'Intro to Computer Science',
      school: 'School of Engineering',
      creditsMin: 3,
      creditsMax: 3,
      isCatalogCourse: true,
    },
  });
  courseIds['CS 1151'] = cs1151.id;

  const phil1100 = await prisma.course.create({
    data: {
      courseId: 'PHIL 1100',
      academicYearId,
      subjectCode: 'PHIL',
      courseNumber: '1100',
      title: 'Introduction to Philosophy',
      school: 'College of Arts and Science',
      creditsMin: 3,
      creditsMax: 3,
      isCatalogCourse: true,
    },
  });
  courseIds['PHIL 1100'] = phil1100.id;

  // Create program
  const program = await prisma.program.create({
    data: {
      programId: 'CS-MAJOR-TEST',
      name: 'Computer Science Major (Test)',
      type: 'Major',
      totalCredits: 120,
      schoolId,
      academicYearId,
      requirements: testProgramRequirements as any,
    },
  });

  // Create plan
  const plan = await prisma.plan.create({
    data: {
      name: 'Test Plan',
      academicYearId,
      schoolId,
    },
  });
  planId = plan.id;

  // Create plan-program association
  const planProgram = await prisma.planProgram.create({
    data: {
      planId,
      programId: program.id,
    },
  });
  planProgramId = planProgram.id;
}

// Helper to create planned courses
async function createPlannedCourses(courses: { courseId: string; semesterNumber: number }[]) {
  for (const courseData of courses) {
    await prisma.plannedCourse.create({
      data: {
        planId,
        courseId: courseData.courseId, // Use courseId string directly, not database ID
        semesterNumber: courseData.semesterNumber,
        credits: 3,
        position: 0,
      },
    });
  }
}

describe('fulfillmentAssigner.service - Double Counting Integration', () => {
  beforeEach(async () => {
    // Clear all data
    await prisma.requirementFulfillment.deleteMany({});
    await prisma.plannedCourse.deleteMany({});
    await prisma.planProgram.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.program.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.school.deleteMany({});
    await prisma.academicYear.deleteMany({});

    // Create fresh test data
    await createTestData();
  });

  it('should allow CS 1151 to double count for Ethics and Liberal Arts Core', async () => {
    // Add CS 1151 to plan
    await createPlannedCourses([{ courseId: 'CS 1151', semesterNumber: 1 }]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Verify that CS 1151 was assigned to BOTH requirements
    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId },
      include: { plannedCourse: { include: { course: true } } },
    });

    // Should have 2 fulfillments for CS 1151
    expect(fulfillments).toHaveLength(2);

    const cs1151Fulfillments = fulfillments.filter(
      (f) => f.plannedCourse.course.courseId === 'CS 1151'
    );
    expect(cs1151Fulfillments).toHaveLength(2);

    // Check that both requirements are fulfilled
    const requirementIds = cs1151Fulfillments.map((f) => f.requirementId).sort();
    expect(requirementIds).toContain('general_degree_requirements.ethics');
    expect(requirementIds).toContain('liberal_arts_core.12_credits_liberal_arts_core');
  });

  it('should not allow double counting when constraint not present', async () => {
    // Update program to remove double count constraint
    const program = await prisma.program.findFirst({
      where: { programId: 'CS-MAJOR-TEST' },
    });

    if (program) {
      const reqsWithoutDoubleCount: ProgramRequirements = {
        ...testProgramRequirements,
        constraintsStructured: [],
      };

      await prisma.program.update({
        where: { id: program.id },
        data: { requirements: reqsWithoutDoubleCount as any },
      });
    }

    // Add CS 1151 to plan
    await createPlannedCourses([{ courseId: 'CS 1151', semesterNumber: 1 }]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Verify that CS 1151 was assigned to only ONE requirement
    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId },
      include: { plannedCourse: { include: { course: true } } },
    });

    const cs1151Fulfillments = fulfillments.filter(
      (f) => f.plannedCourse.course.courseId === 'CS 1151'
    );

    // Should only have 1 fulfillment when double counting not allowed
    expect(cs1151Fulfillments).toHaveLength(1);
  });

  it('should handle multiple courses with one having double count', async () => {
    // Add both CS 1151 (double count) and PHIL 1100 (no double count)
    await createPlannedCourses([
      { courseId: 'CS 1151', semesterNumber: 1 },
      { courseId: 'PHIL 1100', semesterNumber: 1 },
    ]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Verify fulfillments
    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId },
      include: { plannedCourse: { include: { course: true } } },
    });

    // CS 1151 should have 2 fulfillments
    const cs1151Fulfillments = fulfillments.filter(
      (f) => f.plannedCourse.course.courseId === 'CS 1151'
    );
    expect(cs1151Fulfillments).toHaveLength(2);

    // PHIL 1100 should have 1 fulfillment
    const phil1100Fulfillments = fulfillments.filter(
      (f) => f.plannedCourse.course.courseId === 'PHIL 1100'
    );
    expect(phil1100Fulfillments).toHaveLength(1);

    // Total fulfillments should be 3
    expect(fulfillments).toHaveLength(3);
  });

  it('should respect enforcement constraints alongside double counting', async () => {
    // Create a program with both double counting AND enforcement constraint
    // Note: enforcement constraint is on section2 (processed second) requiring course to also be in section1
    const programWithEnforcement: ProgramRequirements = {
      sections: [
        {
          id: 'section1',
          title: 'Section 1',
          creditsRequired: 3,
          requirements: [
            {
              id: 'req1',
              title: 'Requirement 1',
              description: 'CS 1151',
              creditsRequired: 3,
              rule: {
                type: 'take_courses',
                courses: ['CS 1151'],
              },
            },
          ],
        },
        {
          id: 'section2',
          title: 'Section 2',
          creditsRequired: 3,
          requirements: [
            {
              id: 'req2',
              title: 'Requirement 2',
              description: 'Must also be in section1',
              creditsRequired: 3,
              rule: {
                type: 'take_courses',
                courses: ['CS 1151'],
              },
              constraintsStructured: [
                {
                  id: 'require_course_from_sections_section1',
                  type: 'require_course_from_sections',
                  description: 'Course must also be in section1',
                  allowedSectionIds: ['section1'],
                  operator: 'OR',
                },
              ],
            },
          ],
        },
      ],
      constraintsStructured: [
        {
          id: 'allow_double_count_cs1151',
          type: 'allow_double_count',
          courseId: 'CS 1151',
          requirementIds: ['section1.req1', 'section2.req2'],
        },
      ],
    };

    // Update program
    const program = await prisma.program.findFirst({
      where: { programId: 'CS-MAJOR-TEST' },
    });

    if (program) {
      await prisma.program.update({
        where: { id: program.id },
        data: { requirements: programWithEnforcement as any },
      });
    }

    // Add CS 1151
    await createPlannedCourses([{ courseId: 'CS 1151', semesterNumber: 1 }]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Verify both requirements are fulfilled
    const fulfillments = await prisma.requirementFulfillment.findMany({
      where: { planProgramId },
    });

    expect(fulfillments).toHaveLength(2);
    expect(fulfillments.map((f) => f.requirementId).sort()).toEqual([
      'section1.req1',
      'section2.req2',
    ]);
  });

  it('should allow courses to count across multiple programs (cross-program fulfillment)', async () => {
    // Create a second program (Mathematics) that also accepts PHIL 1100
    const mathProgramRequirements: ProgramRequirements = {
      sections: [
        {
          id: 'math_core',
          title: 'Mathematics Core',
          creditsRequired: 6,
          requirements: [
            {
              id: 'philosophy_elective',
              title: 'Philosophy Elective',
              description: 'Take PHIL 1100',
              creditsRequired: 3,
              rule: {
                type: 'take_courses',
                courses: ['PHIL 1100'],
              },
            },
          ],
        },
      ],
      constraintsStructured: [],
    };

    const mathProgram = await prisma.program.create({
      data: {
        programId: 'MATH-MAJOR-TEST',
        name: 'Mathematics Major (Test)',
        type: 'Major',
        totalCredits: 120,
        schoolId,
        academicYearId,
        requirements: mathProgramRequirements as any,
      },
    });

    // Add Mathematics program to the plan
    const mathPlanProgram = await prisma.planProgram.create({
      data: {
        planId,
        programId: mathProgram.id,
      },
    });

    // Update CS program to also accept PHIL 1100
    const program = await prisma.program.findFirst({
      where: { programId: 'CS-MAJOR-TEST' },
    });

    if (program) {
      const updatedRequirements: ProgramRequirements = {
        sections: [
          {
            id: 'general_degree_requirements',
            title: 'General degree requirements',
            creditsRequired: 6,
            requirements: [
              {
                id: 'philosophy',
                title: 'Philosophy',
                description: 'Take PHIL 1100',
                creditsRequired: 3,
                rule: {
                  type: 'take_courses',
                  courses: ['PHIL 1100'],
                },
              },
            ],
          },
        ],
        constraintsStructured: [],
      };

      await prisma.program.update({
        where: { id: program.id },
        data: { requirements: updatedRequirements as any },
      });
    }

    // Add PHIL 1100 to plan
    await createPlannedCourses([{ courseId: 'PHIL 1100', semesterNumber: 1 }]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Verify PHIL 1100 was assigned to BOTH programs
    const allFulfillments = await prisma.requirementFulfillment.findMany({
      where: {
        planProgramId: { in: [planProgramId, mathPlanProgram.id] },
      },
      include: {
        plannedCourse: { include: { course: true } },
      },
    });

    const phil1100Fulfillments = allFulfillments.filter(
      (f) => f.plannedCourse.course.courseId === 'PHIL 1100'
    );

    // Should have 2 fulfillments: one for CS program, one for Math program
    expect(phil1100Fulfillments).toHaveLength(2);

    // Check that each program has one fulfillment
    const csFulfillments = phil1100Fulfillments.filter(
      (f) => f.planProgramId === planProgramId
    );
    const mathFulfillments = phil1100Fulfillments.filter(
      (f) => f.planProgramId === mathPlanProgram.id
    );

    expect(csFulfillments).toHaveLength(1);
    expect(mathFulfillments).toHaveLength(1);

    // Verify requirement IDs
    expect(csFulfillments[0].requirementId).toBe('general_degree_requirements.philosophy');
    expect(mathFulfillments[0].requirementId).toBe('math_core.philosophy_elective');
  });
});
