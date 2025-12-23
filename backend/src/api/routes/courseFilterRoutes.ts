import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import {
  queryCoursesByFilter,
  evaluateCourseAgainstFilter,
  getFilterSpecificity,
} from '../controllers/courseFilterController.js';

// Zod schemas for filter validation
const numberConstraintSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('specific'),
    values: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal('range'),
    min: z.number().int().min(0),
    max: z.number().int().min(0).optional(),
  }),
]);

const filterSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('placeholder') }),
    z.object({
      type: z.literal('subject_number'),
      subjects: z.array(z.string()).min(1),
      numbers: z.array(numberConstraintSchema).optional(),
      exclude: z.array(z.string()).optional(),
    }),
    z.object({
      type: z.literal('attribute'),
      attributes: z.array(z.string()).min(1),
      attributeType: z.enum(['axle', 'core']).optional(),
      exclude: z
        .object({
          subjects: z.array(z.string()).optional(),
        })
        .optional(),
    }),
    z.object({
      type: z.literal('course_list'),
      courses: z.array(z.string()).min(1),
    }),
    z.object({
      type: z.literal('composite'),
      operator: z.enum(['AND', 'OR']),
      filters: z.array(filterSchema).min(2),
    }),
  ])
);

const querySchema = z.object({
  filter: filterSchema,
  academicYearId: z.number().int().positive(),
});

const evaluateSchema = z.object({
  courseId: z.string(),
  filter: filterSchema,
  academicYearId: z.number().int().positive(),
});

const specificitySchema = z.object({
  filter: filterSchema,
});

const router = Router();

router.post('/query', validate({ body: querySchema }), queryCoursesByFilter);
router.post('/evaluate', validate({ body: evaluateSchema }), evaluateCourseAgainstFilter);
router.post('/specificity', validate({ body: specificitySchema }), getFilterSpecificity);

export default router;
