import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getPrograms,
  getProgramById,
  getProgramByProgramId,
} from '../controllers/programController.js';
import { getProgramPreview } from '../controllers/progressController.js';

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const programIdParamSchema = z.object({
  programId: z.string().min(1).max(50),
});

const listQuerySchema = z.object({
  academicYearId: z.coerce.number().int().positive().optional(),
  schoolId: z.coerce.number().int().positive().optional(),
  type: z.string().min(1).max(50).optional(),
});

const previewQuerySchema = z.object({
  planId: z.coerce.number().int().positive(),
});

const router = Router();

// Routes
// IMPORTANT: Specific routes MUST come before parameterized routes to avoid conflicts
router.get('/', validate({ query: listQuerySchema }), getPrograms);
router.get(
  '/by-program-id/:programId',
  validate({ params: programIdParamSchema }),
  getProgramByProgramId
);
router.get(
  '/:id/preview',
  validate({ params: idParamSchema, query: previewQuerySchema }),
  getProgramPreview
);
router.get('/:id', validate({ params: idParamSchema }), getProgramById);

export default router;
