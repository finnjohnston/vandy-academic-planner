/**
 * Get current timestamp in readable format
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Log a general message
 */
export function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

/**
 * Log an error message
 */
export function error(message: string, err?: any): void {
  console.error(`[${timestamp()}] ERROR: ${message}`);
  if (err) {
    console.error(err);
  }
}

/**
 * Log a success message
 */
export function success(message: string): void {
  console.log(`[${timestamp()}] SUCCESS: ${message}`);
}

/**
 * Log a warning message
 */
export function warn(message: string): void {
  console.warn(`[${timestamp()}] WARNING: ${message}`);
}
