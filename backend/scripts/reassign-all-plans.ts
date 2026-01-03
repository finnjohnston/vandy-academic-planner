import { prisma } from '../src/config/prisma.js';
import { autoAssignFulfillments } from '../src/api/services/fulfillmentAssigner.service.js';

async function reassignAllPlans() {
  console.log('Fetching all plans...');

  const plans = await prisma.plan.findMany({
    select: { id: true, name: true }
  });

  console.log(`Found ${plans.length} plans to recalculate`);

  for (const plan of plans) {
    console.log(`\nRecalculating plan ${plan.id}: ${plan.name}`);
    try {
      await autoAssignFulfillments(plan.id);
      console.log(`✓ Successfully recalculated plan ${plan.id}`);
    } catch (error) {
      console.error(`✗ Failed to recalculate plan ${plan.id}:`, error);
    }
  }

  console.log('\n✓ Finished recalculating all plans');
}

reassignAllPlans()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
