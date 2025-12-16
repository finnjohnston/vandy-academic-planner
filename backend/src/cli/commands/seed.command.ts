import { Command } from 'commander';
import { prisma } from '../../config/prisma.js';
import logger from '../../utils/logger.js';

async function seedTestPlanData() {
  try {
    logger.info('Starting test plan data seeding...');

    // 1. Create a school
    const school = await prisma.school.upsert({
      where: { code: 'ENGR' },
      update: {},
      create: {
        code: 'ENGR',
        name: 'School of Engineering',
      },
    });
    logger.info(`School created: ${school.name}`);

    // 2. Get current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      orderBy: { start: 'desc' },
    });

    if (!currentYear) {
      throw new Error('No current academic year found in database');
    }

    logger.info(`Using academic year: ${currentYear.year}`);

    // 3. Query real courses from various subjects
    const courses = await prisma.course.findMany({
      where: {
        academicYearId: currentYear.id,
        subjectCode: { in: ['CS', 'MATH', 'PHYS', 'CHEM', 'ECON'] },
      },
      take: 30,
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
    });

    logger.info(`Found ${courses.length} courses to use`);

    if (courses.length === 0) {
      throw new Error('No courses found. Please run catalog ingestion first.');
    }

    // 4. Create a test plan
    const plan = await prisma.plan.create({
      data: {
        name: 'Test Engineering Plan 2025-2026',
        schoolId: school.id,
        academicYearId: currentYear.id,
        currentSemester: 0,
        isActive: true,
      },
    });
    logger.info(`Plan created: ${plan.name} (ID: ${plan.id})`);

    // 5. Distribute courses across 8 semesters
    const semesterCourseCount = [5, 5, 4, 4, 4, 4, 3, 1];
    let courseIndex = 0;
    const plannedCourses = [];

    for (let semester = 1; semester <= 8; semester++) {
      const coursesInSemester = semesterCourseCount[semester - 1];

      for (let i = 0; i < coursesInSemester && courseIndex < courses.length; i++) {
        const course = courses[courseIndex++];

        plannedCourses.push({
          planId: plan.id,
          courseId: course.courseId,
          semesterNumber: semester,
          credits: course.creditsMax || course.creditsMin || 3,
        });
      }
    }

    // 6. Bulk insert
    const result = await prisma.plannedCourse.createMany({
      data: plannedCourses,
    });

    logger.info(`Created ${result.count} planned courses`);
    console.log('\n=== SEED SUMMARY ===');
    console.log(`School: ${school.name} (${school.code})`);
    console.log(`Plan: ${plan.name} (ID: ${plan.id})`);
    console.log(`Planned Courses: ${result.count}`);
    console.log(`Academic Year: ${currentYear.year}`);

  } catch (error) {
    logger.error('Error seeding test plan data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export function createSeedCommand() {
  const command = new Command('seed');

  command
    .description('Seed database with test plan data')
    .action(async () => {
      await seedTestPlanData();
    });

  return command;
}
