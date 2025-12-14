import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
} from '../controllers/schoolController.js';

// Validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  code: z.string().min(1).max(50).optional(),
});

const createSchoolSchema = z.object({
  code: z.string().min(1).max(50).transform((val) => val.toUpperCase()),
  name: z.string().min(1).max(255),
});

const updateSchoolSchema = z
  .object({
    code: z.string().min(1).max(50).transform((val) => val.toUpperCase()).optional(),
    name: z.string().min(1).max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required for update',
  });

const router = Router();

// Routes
router.get('/', validate({ query: listQuerySchema }), getSchools);
router.get('/:id', validate({ params: idParamSchema }), getSchoolById);
router.post('/', validate({ body: createSchoolSchema }), createSchool);
router.put('/:id', validate({ params: idParamSchema, body: updateSchoolSchema }), updateSchool);

export default router;
