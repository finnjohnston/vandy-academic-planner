import { Router } from 'express';
import { z } from 'zod';
import {
  getAcademicYears,
  getCurrentAcademicYear,
  getAcademicYearById,
  createAcademicYear,
  setCurrentAcademicYear,
} from '../controllers/academicYearController.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createAcademicYearSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Year must be in format YYYY-YYYY'),
});

// Routes
// NOTE: /current must come BEFORE /:id to avoid matching "current" as an ID

/**
 * GET /api/academic-years
 * Get all academic years
 */
router.get('/', getAcademicYears);

/**
 * GET /api/academic-years/current
 * Get the current academic year
 */
router.get('/current', getCurrentAcademicYear);

/**
 * GET /api/academic-years/:id
 * Get specific academic year by ID
 */
router.get('/:id', validate({ params: idParamSchema }), getAcademicYearById);

/**
 * POST /api/academic-years
 * Create new academic year
 */
router.post(
  '/',
  validate({ body: createAcademicYearSchema }),
  createAcademicYear
);

/**
 * PATCH /api/academic-years/:id/set-current
 * Set specific academic year as current
 */
router.patch(
  '/:id/set-current',
  validate({ params: idParamSchema }),
  setCurrentAcademicYear
);

export default router;
