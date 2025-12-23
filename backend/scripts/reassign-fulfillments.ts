import { PrismaClient } from '@prisma/client';
import { autoAssignFulfillments } from '../src/api/services/fulfillmentAssigner.service.js';

const prisma = new PrismaClient();

async function reassignFulfillments() {
  console.log('Reassigning all fulfillments...');

  // Get all plans
  const plans = await prisma.plan.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${plans.length} plans`);

  for (const plan of plans) {
    console.log(`\nReassigning fulfillments for plan ${plan.id} (${plan.name})`);
    await autoAssignFulfillments(plan.id);
  }

  console.log('\nComplete!');
}

reassignFulfillments()
  .catch((error) => {
    console.error('Error reassigning fulfillments:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
