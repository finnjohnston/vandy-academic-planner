import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getPrograms,
  getProgramById,
  getProgramByProgramId,
} from '../controllers/programController.js';

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

const router = Router();

// Routes
// IMPORTANT: /by-program-id/:programId MUST come before /:id to avoid route conflict
router.get('/', validate({ query: listQuerySchema }), getPrograms);
router.get(
  '/by-program-id/:programId',
  validate({ params: programIdParamSchema }),
  getProgramByProgramId
);
router.get('/:id', validate({ params: idParamSchema }), getProgramById);

export default router;
