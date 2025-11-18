/**
 * Result wrapper for pipeline operations
 * Discriminated union for success/failure
 */
export type PipelineResult<T> =
  | { success: true; data: T }
  | { success: false; error: PipelineError };

/**
 * Standardized error format for pipeline operations
 */
export interface PipelineError {
  /** Human-readable error message */
  message: string;

  /** Error code for categorization (e.g., 'SCRAPE_FAILED', 'PARSE_FAILED', 'DB_INSERT_FAILED') */
  code?: string;

  /** Original error object or additional context */
  details?: any;
}

/**
 * Helper to create a success result
 */
export function success<T>(data: T): PipelineResult<T> {
  return { success: true, data };
}

/**
 * Helper to create a failure result
 */
export function failure<T>(
  message: string,
  code?: string,
  details?: any
): PipelineResult<T> {
  return {
    success: false,
    error: { message, code, details },
  };
}
