import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getProgramProgress,
  getSectionProgress,
  getProgramRequirementsProgress,
} from '../controllers/progressController.js';

const router = Router({ mergeParams: true });

const planProgramIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
  planProgramId: z.coerce.number().int().positive(),
});

const sectionIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
  planProgramId: z.coerce.number().int().positive(),
  sectionId: z.string().min(1),
});

// GET /api/plans/:planId/programs/:planProgramId/progress
router.get('/', validate({ params: planProgramIdParamSchema }), getProgramProgress);

// GET /api/plans/:planId/programs/:planProgramId/progress/requirements
router.get(
  '/requirements',
  validate({ params: planProgramIdParamSchema }),
  getProgramRequirementsProgress
);

// GET /api/plans/:planId/programs/:planProgramId/progress/sections/:sectionId
router.get('/sections/:sectionId', validate({ params: sectionIdParamSchema }), getSectionProgress);

export default router;
