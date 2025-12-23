import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup.js';
import { autoAssignFulfillments } from '../../../src/api/services/fulfillmentAssigner.service.js';
import { calculateProgramProgress } from '../../../src/api/services/progressCalculator.service.js';
import { ProgramRequirements } from '../../../src/api/types/program.types.js';

// Test data IDs
let academicYearId: number;
let schoolId: number;
let planId: number;
let planProgramId: number;

// Program with validation constraints
const testProgramRequirements: ProgramRequirements = {
  sections: [
    {
      id: 'section1',
      title: 'Section 1',
      creditsRequired: 15,
      requirements: [
        {
          id: 'req_with_lab',
          title: 'Requirement with lab constraint',
          description: 'Choose courses including at least one lab',
          creditsRequired: 12,
          rule: {
            type: 'take_any_courses',
            credits: 12,
            filter: { type: 'any' },
          },
          constraintsStructured: [
            {
              id: 'min_course_count_lab',
              type: 'min_course_count',
              description: 'At least one lab course required',
              count: 1,
              filter: {
                type: 'course_number_suffix',
                suffixes: ['L'],
              },
            },
          ],
        },
        {
          id: 'req_with_credit_max',
          title: 'Requirement with credit maximum',
          description: 'CS courses with max credits from CS 3860',
          creditsRequired: 15,
          rule: {
            type: 'take_any_courses',
            credits: 15,
            filter: {
              type: 'subject_number',
              subjects: ['CS'],
            },
          },
          constraintsStructured: [
            {
              id: 'max_credits_cs3860',
              type: 'max_credits_from_courses',
              description: 'Maximum 6 credits from CS 3860',
              maxCredits: 6,
              courseIds: ['CS 3860'],
            },
          ],
        },
      ],
    },
    {
      id: 'section2',
      title: 'Section 2',
      creditsRequired: 9,
      requirements: [
        {
          id: 'req_with_number_range',
          title: 'Requirement with number range',
          description: 'ECON courses with at least one above 3015',
          creditsRequired: 9,
          rule: {
            type: 'take_any_courses',
            credits: 9,
            filter: {
              type: 'subject_number',
              subjects: ['ECON'],
            },
          },
          constraintsStructured: [
            {
              id: 'course_number_range_econ_above_3015',
              type: 'course_number_range',
              description: 'At least one course above ECON 3015',
              subjectCode: 'ECON',
              minNumber: 3015,
              minCount: 1,
              operator: 'above',
            },
          ],
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

  // Create school
  const school = await prisma.school.create({
    data: { name: 'School of Engineering', code: 'ENGR' },
  });
  schoolId = school.id;

  // Create courses
  await prisma.course.createMany({
    data: [
      {
        courseId: 'PHYS 1601',
        academicYearId,
        subjectCode: 'PHYS',
        courseNumber: '1601',
        title: 'Introductory Physics',
        school: 'School of Engineering',
        creditsMin: 4,
        creditsMax: 4,
        isCatalogCourse: true,
      },
      {
        courseId: 'PHYS 1601L',
        academicYearId,
        subjectCode: 'PHYS',
        courseNumber: '1601L',
        title: 'Introductory Physics Lab',
        school: 'School of Engineering',
        creditsMin: 1,
        creditsMax: 1,
        isCatalogCourse: true,
      },
      {
        courseId: 'CHEM 1601',
        academicYearId,
        subjectCode: 'CHEM',
        courseNumber: '1601',
        title: 'General Chemistry',
        school: 'School of Engineering',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
      {
        courseId: 'CS 3250',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '3250',
        title: 'Algorithms',
        school: 'School of Engineering',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
      {
        courseId: 'CS 3860',
        academicYearId,
        subjectCode: 'CS',
        courseNumber: '3860',
        title: 'Independent Study',
        school: 'School of Engineering',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
      {
        courseId: 'ECON 2010',
        academicYearId,
        subjectCode: 'ECON',
        courseNumber: '2010',
        title: 'Principles of Economics',
        school: 'College of Arts and Science',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
      {
        courseId: 'ECON 3020',
        academicYearId,
        subjectCode: 'ECON',
        courseNumber: '3020',
        title: 'Intermediate Economics',
        school: 'College of Arts and Science',
        creditsMin: 3,
        creditsMax: 3,
        isCatalogCourse: true,
      },
    ],
  });

  // Create program
  const program = await prisma.program.create({
    data: {
      programId: 'TEST-PROGRAM',
      name: 'Test Program',
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
async function createPlannedCourses(courseIds: string[]) {
  for (let i = 0; i < courseIds.length; i++) {
    await prisma.plannedCourse.create({
      data: {
        planId,
        courseId: courseIds[i],
        semesterNumber: 1,
        credits: 3,
        position: i,
      },
    });
  }
}

describe('constraint.validation.integration', () => {
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

  it('should include constraint validation in progress response when constraints satisfied', async () => {
    // Add courses that satisfy all constraints
    await createPlannedCourses([
      'PHYS 1601',   // No lab suffix
      'PHYS 1601L',  // Has lab suffix - satisfies min_course_count
      'CS 3250',     // Not CS 3860
      'CS 3860',     // 3 credits from CS 3860 - within max
      'ECON 3020',   // Above ECON 3015 - satisfies course_number_range
    ]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Calculate progress
    const progress = await calculateProgramProgress(planProgramId);

    // Find the requirement with lab constraint
    const reqWithLab = progress.sectionProgress[0].requirementProgress.find(
      (r) => r.requirementId === 'section1.req_with_lab'
    );

    // Verify constraint validation is present and satisfied
    expect(reqWithLab?.constraintValidation).toBeDefined();
    expect(reqWithLab?.constraintValidation?.allSatisfied).toBe(true);
    expect(reqWithLab?.constraintValidation?.results).toHaveLength(1);
    expect(reqWithLab?.constraintValidation?.results[0].satisfied).toBe(true);
    expect(reqWithLab?.constraintValidation?.results[0].constraint.type).toBe('min_course_count');

    // Find the requirement with credit maximum constraint
    const reqWithCreditMax = progress.sectionProgress[0].requirementProgress.find(
      (r) => r.requirementId === 'section1.req_with_credit_max'
    );

    expect(reqWithCreditMax?.constraintValidation).toBeDefined();
    expect(reqWithCreditMax?.constraintValidation?.allSatisfied).toBe(true);
    expect(reqWithCreditMax?.constraintValidation?.results[0].satisfied).toBe(true);
    expect(reqWithCreditMax?.constraintValidation?.results[0].constraint.type).toBe(
      'max_credits_from_courses'
    );

    // Find the requirement with number range constraint
    const reqWithNumberRange = progress.sectionProgress[1].requirementProgress.find(
      (r) => r.requirementId === 'section2.req_with_number_range'
    );

    expect(reqWithNumberRange?.constraintValidation).toBeDefined();
    expect(reqWithNumberRange?.constraintValidation?.allSatisfied).toBe(true);
    expect(reqWithNumberRange?.constraintValidation?.results[0].satisfied).toBe(true);
    expect(reqWithNumberRange?.constraintValidation?.results[0].constraint.type).toBe(
      'course_number_range'
    );
  });

  it('should report constraint violations when not satisfied', async () => {
    // Add courses that violate constraints
    await createPlannedCourses([
      'PHYS 1601',  // No lab suffix - violates min_course_count
      'CHEM 1601',  // No lab suffix
      'ECON 2010',  // Not above ECON 3015 - violates course_number_range
    ]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Calculate progress
    const progress = await calculateProgramProgress(planProgramId);

    // Find the requirement with lab constraint
    const reqWithLab = progress.sectionProgress[0].requirementProgress.find(
      (r) => r.requirementId === 'section1.req_with_lab'
    );

    // Verify constraint is NOT satisfied
    expect(reqWithLab?.constraintValidation).toBeDefined();
    expect(reqWithLab?.constraintValidation?.allSatisfied).toBe(false);
    expect(reqWithLab?.constraintValidation?.results[0].satisfied).toBe(false);

    // Find the requirement with number range constraint
    const reqWithNumberRange = progress.sectionProgress[1].requirementProgress.find(
      (r) => r.requirementId === 'section2.req_with_number_range'
    );

    expect(reqWithNumberRange?.constraintValidation).toBeDefined();
    expect(reqWithNumberRange?.constraintValidation?.allSatisfied).toBe(false);
    expect(reqWithNumberRange?.constraintValidation?.results[0].satisfied).toBe(false);
  });

  it('should handle max credits constraint violation', async () => {
    // Add too many credits from CS 3860
    await createPlannedCourses([
      'CS 3860', // 3 credits
      'CS 3860', // Another 3 credits (using same course twice via multiple planned courses)
      'CS 3860', // Another 3 credits (total = 9, exceeds max of 6)
    ]);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Calculate progress
    const progress = await calculateProgramProgress(planProgramId);

    // Find the requirement with credit maximum constraint
    const reqWithCreditMax = progress.sectionProgress[0].requirementProgress.find(
      (r) => r.requirementId === 'section1.req_with_credit_max'
    );

    // Verify constraint is NOT satisfied
    expect(reqWithCreditMax?.constraintValidation).toBeDefined();
    expect(reqWithCreditMax?.constraintValidation?.allSatisfied).toBe(false);
    expect(reqWithCreditMax?.constraintValidation?.results[0].satisfied).toBe(false);
    expect(reqWithCreditMax?.constraintValidation?.results[0].constraint.type).toBe(
      'max_credits_from_courses'
    );
  });

  it('should not include constraint validation when no constraints', async () => {
    // Create program without constraints
    const programWithoutConstraints: ProgramRequirements = {
      sections: [
        {
          id: 'section1',
          title: 'Section 1',
          creditsRequired: 6,
          requirements: [
            {
              id: 'req1',
              title: 'Requirement 1',
              description: 'Any courses',
              creditsRequired: 6,
              rule: {
                type: 'take_any_courses',
                credits: 6,
                filter: { type: 'any' },
              },
            },
          ],
        },
      ],
    };

    // Update program
    const program = await prisma.program.findFirst({
      where: { programId: 'TEST-PROGRAM' },
    });

    if (program) {
      await prisma.program.update({
        where: { id: program.id },
        data: { requirements: programWithoutConstraints as any },
      });
    }

    // Add courses
    await createPlannedCourses(['CS 3250', 'ECON 2010']);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Calculate progress
    const progress = await calculateProgramProgress(planProgramId);

    // Verify no constraint validation is present
    const req = progress.sectionProgress[0].requirementProgress[0];
    expect(req.constraintValidation).toBeUndefined();
  });

  it('should include constraint descriptions in validation results', async () => {
    // Add courses that satisfy constraint
    await createPlannedCourses(['PHYS 1601L', 'CHEM 1601']);

    // Run auto-assignment
    await autoAssignFulfillments(planId);

    // Calculate progress
    const progress = await calculateProgramProgress(planProgramId);

    // Find the requirement with lab constraint
    const reqWithLab = progress.sectionProgress[0].requirementProgress.find(
      (r) => r.requirementId === 'section1.req_with_lab'
    );

    // Verify constraint description is included
    expect(reqWithLab?.constraintValidation?.results[0].constraint.description).toBe(
      'At least one lab course required'
    );
  });
});
