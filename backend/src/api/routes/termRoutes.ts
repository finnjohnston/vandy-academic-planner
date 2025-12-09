import { Router } from 'express';
import { z } from 'zod';
import {
  getTerms,
  getTermById,
  createTerm,
  updateTerm,
} from '../controllers/termController.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const academicYearQuerySchema = z.object({
  academicYearId: z.coerce.number().int().positive().optional(),
});

const createTermSchema = z.object({
  termId: z.string().min(1).max(50),
  academicYearId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
});

const updateTermSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    academicYearId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.name || data.academicYearId, {
    message: 'At least one field (name or academicYearId) must be provided',
  });

// Routes

/**
 * GET /api/terms
 * Get all terms (supports ?academicYearId=X query parameter)
 */
router.get('/', validate({ query: academicYearQuerySchema }), getTerms);

/**
 * GET /api/terms/:id
 * Get specific term by ID
 */
router.get('/:id', validate({ params: idParamSchema }), getTermById);

/**
 * POST /api/terms
 * Create new term
 */
router.post('/', validate({ body: createTermSchema }), createTerm);

/**
 * PUT /api/terms/:id
 * Update term details
 */
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateTermSchema }),
  updateTerm
);

export default router;
