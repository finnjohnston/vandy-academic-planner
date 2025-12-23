import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getPlanPrograms,
  addPlanProgram,
  deletePlanProgram,
} from '../controllers/planProgramController.js';
import fulfillmentRoutes from './fulfillmentRoutes.js';
import progressRoutes from './progressRoutes.js';

// CRITICAL: mergeParams allows access to :planId from parent router
const router = Router({ mergeParams: true });

// Validation schemas
const planIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
});

const planProgramIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

const addProgramSchema = z.object({
  programId: z.number().int().positive(),
});

// Routes
router.get('/', validate({ params: planIdParamSchema }), getPlanPrograms);
router.post(
  '/',
  validate({ params: planIdParamSchema, body: addProgramSchema }),
  addPlanProgram
);
router.delete(
  '/:id',
  validate({ params: planProgramIdParamSchema }),
  deletePlanProgram
);

// Mount nested fulfillment routes
router.use('/:planProgramId/fulfillments', fulfillmentRoutes);

// Mount nested progress routes
router.use('/:planProgramId/progress', progressRoutes);

export default router;
