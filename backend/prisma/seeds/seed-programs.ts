import { PrismaClient } from '@prisma/client';
import { programs } from './data/index.js';

const prisma = new PrismaClient();

async function seedPrograms() {
  for (const program of programs) {
    await prisma.program.upsert({
      where: { programId: program.programId },
      update: {
        name: program.name,
        type: program.type,
        totalCredits: program.totalCredits,
        requirements: program.requirements,
        schoolId: program.schoolId,
        academicYearId: program.academicYearId,
      },
      create: {
        programId: program.programId,
        name: program.name,
        type: program.type,
        totalCredits: program.totalCredits,
        requirements: program.requirements,
        schoolId: program.schoolId,
        academicYearId: program.academicYearId,
      },
    });
    console.log(`Seeded: ${program.name}`);
  }
}

seedPrograms()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
