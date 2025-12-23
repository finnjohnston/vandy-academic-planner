import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPlannedCourseIds() {
  console.log('Starting plannedCourse courseId fix...');

  // Get all planned courses with their courses
  const plannedCourses = await prisma.plannedCourse.findMany({
    include: {
      course: {
        select: {
          courseId: true,
          subjectCode: true,
          courseNumber: true,
        },
      },
    },
  });

  console.log(`Found ${plannedCourses.length} planned courses to check`);

  let updated = 0;
  let skipped = 0;

  for (const plannedCourse of plannedCourses) {
    if (!plannedCourse.course) {
      skipped++;
      continue;
    }

    const correctCourseId = plannedCourse.course.courseId;

    // Update if different
    if (plannedCourse.courseId !== correctCourseId) {
      await prisma.plannedCourse.update({
        where: { id: plannedCourse.id },
        data: { courseId: correctCourseId },
      });
      updated++;
      console.log(`Updated plannedCourse ${plannedCourse.id}: ${plannedCourse.courseId} → ${correctCourseId}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nComplete! Updated: ${updated}, Skipped: ${skipped}`);
}

fixPlannedCourseIds()
  .catch((error) => {
    console.error('Error fixing plannedCourse courseIds:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
