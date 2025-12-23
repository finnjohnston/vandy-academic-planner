import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { getPlanProgramFulfillments } from '../controllers/fulfillmentController.js';

const router = Router({ mergeParams: true });

const planProgramIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
  planProgramId: z.coerce.number().int().positive(),
});

// GET /api/plans/:planId/programs/:planProgramId/fulfillments
router.get(
  '/',
  validate({ params: planProgramIdParamSchema }),
  getPlanProgramFulfillments
);

export default router;
