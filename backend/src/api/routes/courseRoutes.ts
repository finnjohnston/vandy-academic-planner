import { Router } from 'express';
import { z } from 'zod';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
} from '../controllers/courseController.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const courseSearchSchema = z.object({
  academicYearId: z.coerce.number().int().positive(),
  q: z.string().min(1).max(200).optional(),
});

const createCourseSchema = z
  .object({
    courseId: z.string().min(1).max(50),
    academicYearId: z.coerce.number().int().positive(),
    subjectCode: z
      .string()
      .min(2)
      .max(10)
      .transform((val) => val.toUpperCase()),
    courseNumber: z.string().min(1).max(10),
    title: z.string().min(1).max(255),
    school: z.string().max(255).optional(),
    creditsMin: z.coerce.number().min(0).max(20),
    creditsMax: z.coerce.number().min(0).max(20),
    typicallyOffered: z.string().optional(),
    description: z.string().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    requirements: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => data.creditsMin <= data.creditsMax, {
    message: 'creditsMin must be <= creditsMax',
  });

const updateCourseSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    school: z.string().max(255).optional(),
    creditsMin: z.coerce.number().min(0).max(20).optional(),
    creditsMax: z.coerce.number().min(0).max(20).optional(),
    typicallyOffered: z.string().optional(),
    description: z.string().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    requirements: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) => {
      if (data.creditsMin !== undefined && data.creditsMax !== undefined) {
        return data.creditsMin <= data.creditsMax;
      }
      return true;
    },
    { message: 'creditsMin must be <= creditsMax' }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required',
  });

/**
 * GET /api/courses
 * Search/list courses by academic year with optional query
 */
router.get('/', validate({ query: courseSearchSchema }), getCourses);

/**
 * GET /api/courses/:id
 * Get specific course by ID
 */
router.get('/:id', validate({ params: idParamSchema }), getCourseById);

/**
 * POST /api/courses
 * Create new course
 */
router.post('/', validate({ body: createCourseSchema }), createCourse);

/**
 * PUT /api/courses/:id
 * Update course
 */
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateCourseSchema }),
  updateCourse
);

export default router;
