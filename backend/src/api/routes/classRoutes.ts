import { Router } from 'express';
import { z } from 'zod';
import {
  getClasses,
  getClassById,
  getClassByClassId,
  createClass,
  updateClass,
} from '../controllers/classController.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const classIdParamSchema = z.object({
  classId: z.string().min(1).max(255),
});

const classSearchSchema = z.object({
  termId: z.string().min(1).max(50),
  q: z.string().min(1).max(200).optional(),
});

const createClassSchema = z
  .object({
    classId: z.string().min(1).max(255).optional(),
    termId: z.string().min(1).max(50),
    courseId: z.string().min(1).max(50).optional(),
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
    description: z.string().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    requirements: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => data.creditsMin <= data.creditsMax, {
    message: 'creditsMin must be <= creditsMax',
  });

const updateClassSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    school: z.string().max(255).optional(),
    creditsMin: z.coerce.number().min(0).max(20).optional(),
    creditsMax: z.coerce.number().min(0).max(20).optional(),
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
 * GET /api/classes
 * Search/list classes by term with optional query
 */
router.get('/', validate({ query: classSearchSchema }), getClasses);

/**
 * GET /api/classes/by-class-id/:classId
 * Get specific class by classId
 */
router.get('/by-class-id/:classId', validate({ params: classIdParamSchema }), getClassByClassId);

/**
 * GET /api/classes/:id
 * Get specific class by ID
 */
router.get('/:id', validate({ params: idParamSchema }), getClassById);

/**
 * POST /api/classes
 * Create new class
 */
router.post('/', validate({ body: createClassSchema }), createClass);

/**
 * PUT /api/classes/:id
 * Update class
 */
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateClassSchema }),
  updateClass
);

export default router;
