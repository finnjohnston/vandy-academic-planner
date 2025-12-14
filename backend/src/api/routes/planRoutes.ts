import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
} from '../controllers/planController.js';
import plannedCourseRoutes from './plannedCourseRoutes.js';

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createPlanSchema = z.object({
  name: z.string().min(1).max(255),
  schoolId: z.number().int().positive().optional(),
  startingYear: z.number().int().min(2000).max(2100),
  currentSemester: z.number().int().min(0).max(8).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    schoolId: z.number().int().positive().nullable().optional(),
    currentSemester: z.number().int().min(0).max(8).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required for update',
  });

const duplicatePlanSchema = z.object({
  name: z.string().min(1).max(255),
});

const router = Router();

// Routes - special operation route BEFORE /:id route
router.get('/', getPlans);
router.post('/', validate({ body: createPlanSchema }), createPlan);
router.post(
  '/:id/duplicate',
  validate({ params: idParamSchema, body: duplicatePlanSchema }),
  duplicatePlan
);
router.get('/:id', validate({ params: idParamSchema }), getPlanById);
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updatePlanSchema }),
  updatePlan
);
router.delete('/:id', validate({ params: idParamSchema }), deletePlan);

// Mount nested routes
router.use('/:planId/courses', plannedCourseRoutes);

export default router;
