import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  getPlannedCourses,
  getPlannedCourseById,
  addPlannedCourse,
  updatePlannedCourse,
  deletePlannedCourse,
} from '../controllers/plannedCourseController.js';

// Validation schemas
const planIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
});

const plannedCourseIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  semesterNumber: z.coerce.number().int().min(0).max(8).optional(),
});

const addPlannedCourseSchema = z
  .object({
    courseId: z.string().min(1).max(50).optional(),
    classId: z.string().min(1).max(255).optional(),
    semesterNumber: z.number().int().min(0).max(8),
    credits: z.number().positive(),
  })
  .refine((data) => data.courseId || data.classId, {
    message: 'Either courseId or classId must be provided',
  });

const updatePlannedCourseSchema = z
  .object({
    courseId: z.string().min(1).max(50).nullable().optional(),
    classId: z.string().min(1).max(255).nullable().optional(),
    semesterNumber: z.number().int().min(0).max(8).optional(),
    credits: z.number().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required for update',
  });

const router = Router({ mergeParams: true }); // IMPORTANT: merge params from parent router

// Routes
router.get(
  '/',
  validate({ params: planIdParamSchema, query: listQuerySchema }),
  getPlannedCourses
);
router.get(
  '/:id',
  validate({ params: plannedCourseIdParamSchema }),
  getPlannedCourseById
);
router.post(
  '/',
  validate({ params: planIdParamSchema, body: addPlannedCourseSchema }),
  addPlannedCourse
);
router.put(
  '/:id',
  validate({
    params: plannedCourseIdParamSchema,
    body: updatePlannedCourseSchema,
  }),
  updatePlannedCourse
);
router.delete(
  '/:id',
  validate({ params: plannedCourseIdParamSchema }),
  deletePlannedCourse
);

export default router;
