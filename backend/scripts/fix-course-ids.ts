import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCourseIds() {
  console.log('Starting courseId fix...');

  // Get all courses
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      courseId: true,
      subjectCode: true,
      courseNumber: true,
    },
  });

  console.log(`Found ${courses.length} courses to update`);

  let updated = 0;
  let skipped = 0;

  for (const course of courses) {
    // Generate the correct courseId from subjectCode and courseNumber
    const correctCourseId = `${course.subjectCode} ${course.courseNumber}`;

    // Only update if it's different and not already in correct format
    if (course.courseId !== correctCourseId && !course.courseId.includes(' ')) {
      await prisma.course.update({
        where: { id: course.id },
        data: { courseId: correctCourseId },
      });
      updated++;
      console.log(`Updated: ${course.courseId} → ${correctCourseId}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nComplete! Updated: ${updated}, Skipped: ${skipped}`);
}

fixCourseIds()
  .catch((error) => {
    console.error('Error fixing courseIds:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
