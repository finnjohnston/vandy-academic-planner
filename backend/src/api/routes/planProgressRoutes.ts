import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { getPlanProgressOverview } from '../controllers/progressController.js';

const router = Router({ mergeParams: true });

const planIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
});

// GET /api/plans/:planId/progress
router.get('/', validate({ params: planIdParamSchema }), getPlanProgressOverview);

export default router;
