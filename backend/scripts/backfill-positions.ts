import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillPositions() {
  console.log('Starting position backfill...');

  try {
    // Get all plans
    const plans = await prisma.plan.findMany({
      select: { id: true }
    });

    console.log(`Found ${plans.length} plans to process`);

    for (const plan of plans) {
      // Get all distinct semesters for this plan
      const semesters = await prisma.plannedCourse.findMany({
        where: { planId: plan.id },
        select: { semesterNumber: true },
        distinct: ['semesterNumber'],
        orderBy: { semesterNumber: 'asc' }
      });

      console.log(`  Plan ${plan.id}: ${semesters.length} semesters`);

      // For each semester, assign positions based on courseId alphabetical order
      for (const { semesterNumber } of semesters) {
        const courses = await prisma.plannedCourse.findMany({
          where: {
            planId: plan.id,
            semesterNumber
          },
          orderBy: { courseId: 'asc' }
        });

        console.log(`    Semester ${semesterNumber}: ${courses.length} courses`);

        // Update positions sequentially
        for (let i = 0; i < courses.length; i++) {
          await prisma.plannedCourse.update({
            where: { id: courses[i].id },
            data: { position: i }
          });
        }
      }
    }

    console.log('Position backfill complete!');

    // Summary
    const totalCourses = await prisma.plannedCourse.count();
    const coursesWithPosition = await prisma.plannedCourse.count({
      where: { position: { gte: 0 } }
    });

    console.log(`\nSummary:`);
    console.log(`  Total courses: ${totalCourses}`);
    console.log(`  Courses with positions: ${coursesWithPosition}`);
    console.log(`  Success: ${totalCourses === coursesWithPosition}`);

  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillPositions()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
