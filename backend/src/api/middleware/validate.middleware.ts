/**
 * Request validation middleware using Zod
 * Validates request params, query, and body against Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/error.types.js';

/**
 * Validation schemas for different parts of the request
 */
interface ValidationSchemas {
  params?: ZodSchema;
  query?: ZodSchema;
  body?: ZodSchema;
}

/**
 * Validation middleware factory
 * Returns middleware that validates request against provided Zod schemas
 *
 * @param schemas Object containing Zod schemas for params, query, and/or body
 * @returns Express middleware function
 *
 * @example
 * const idSchema = z.object({ id: z.coerce.number().int().positive() });
 * router.get('/:id', validate({ params: idSchema }), controller);
 */
export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params if schema provided
      if (schemas.params) {
        const validatedParams = await schemas.params.parseAsync(req.params);
        Object.assign(req.params, validatedParams);
      }

      // Validate query if schema provided
      if (schemas.query) {
        const validatedQuery = await schemas.query.parseAsync(req.query);
        Object.assign(req.query, validatedQuery);
      }

      // Validate body if schema provided
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      next();
    } catch (err) {
      // Convert Zod errors to ValidationError
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed', err.issues));
      } else {
        next(err);
      }
    }
  };
}
