import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const schools = await prisma.school.findMany();
  console.log('Existing schools:', JSON.stringify(schools, null, 2));
  await prisma.$disconnect();
}
check();
