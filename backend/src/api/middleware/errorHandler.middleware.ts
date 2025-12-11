/**
 * Global error handling middleware
 * Catches all errors and converts them to consistent HTTP responses
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../types/error.types.js';
import { sendError } from '../utils/response.utils.js';
import logger from '../../utils/logger.js';

/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log all errors
  logger.error('API Error:', err);

  // Handle known AppError types
  if (err instanceof AppError) {
    return sendError(
      res,
      err.message,
      err.code,
      err.statusCode,
      err.details
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return sendError(
      res,
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      err.issues
    );
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      return sendError(
        res,
        'Resource already exists',
        'DUPLICATE_ERROR',
        409
      );
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      return sendError(
        res,
        'Resource not found',
        'NOT_FOUND',
        404
      );
    }

    // Other known Prisma errors
    return sendError(
      res,
      'Database error',
      'DATABASE_ERROR',
      500,
      err.code
    );
  }

  // Handle generic Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(
      res,
      'Invalid database query',
      'DATABASE_ERROR',
      500
    );
  }

  // Unknown error - log and return generic message
  logger.error('Unhandled error:', err);
  return sendError(
    res,
    'Internal server error',
    'INTERNAL_ERROR',
    500
  );
}
