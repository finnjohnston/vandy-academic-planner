/**
 * Base class for all application errors
 * Provides consistent structure for error handling
 */
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Validation or client input errors
 */
export class ValidationError extends AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
}

/**
 * 500 Internal Server Error - Database errors
 */
export class DatabaseError extends AppError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
}

/**
 * 500 Internal Server Error - Generic internal errors
 */
export class InternalError extends AppError {
  statusCode = 500;
  code = 'INTERNAL_ERROR';
}
