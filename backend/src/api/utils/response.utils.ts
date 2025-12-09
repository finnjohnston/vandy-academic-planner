/**
 * Response utility functions for consistent API responses
 */

import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/response.types.js';

/**
 * Send a success response
 * @param res Express response object
 * @param data Data to send in response
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  const response: ApiSuccessResponse<T> = { data };
  res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param res Express response object
 * @param message Error message
 * @param code Error code
 * @param statusCode HTTP status code
 * @param details Optional error details
 */
export function sendError(
  res: Response,
  message: string,
  code: string,
  statusCode: number,
  details?: any
): void {
  const response: ApiErrorResponse = {
    error: { message, code, details },
  };
  res.status(statusCode).json(response);
}
