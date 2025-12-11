/**
 * Success response wrapper
 * Returns data wrapped in a 'data' property
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Error response wrapper
 * Returns error details in an 'error' property
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
