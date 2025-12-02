import * as logger from './logger.service.js';

/**
 * Semaphore for controlling concurrent operations
 * Limits how many async operations can run simultaneously
 */
export class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit <= 0) {
      throw new Error('Semaphore limit must be greater than 0');
    }
  }

  /**
   * Execute a function with semaphore control
   * If at limit, queues the function until a slot is available
   * @param fn The async function to execute
   * @returns Promise resolving to the function's result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for available slot
    await this.acquire();

    try {
      // Execute the function
      return await fn();
    } finally {
      // Always release, even if function throws
      this.release();
    }
  }

  /**
   * Acquire a semaphore slot (wait if at limit)
   */
  private async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return;
    }

    // At limit - wait in queue
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a semaphore slot (allow next queued operation)
   */
  private release(): void {
    this.running--;

    // If there are queued operations, start the next one
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  /**
   * Get current semaphore state (for monitoring)
   */
  getState() {
    return {
      running: this.running,
      queued: this.queue.length,
      limit: this.limit,
    };
  }
}

/**
 * Singleton Gemini API semaphore
 * Limits concurrent Gemini API calls to avoid rate limits
 *
 * Rate limits: 1000 RPM, 1,000,000 TPM
 * With ~500 tokens per request, TPM is the bottleneck
 * Limit to 16-32 concurrent requests to stay well under limits
 */
class GeminiSemaphoreService {
  private static instance: Semaphore | null = null;
  private static readonly DEFAULT_LIMIT = 10;

  /**
   * Get the Gemini semaphore instance
   * @param limit Optional custom limit (default: 20)
   * @returns Singleton semaphore instance
   */
  static getInstance(limit: number = this.DEFAULT_LIMIT): Semaphore {
    if (!this.instance) {
      this.instance = new Semaphore(limit);
      logger.log(`Gemini API semaphore initialized with limit: ${limit}`);
    }
    return this.instance;
  }

  /**
   * Reset the semaphore instance (primarily for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Singleton Gemini API semaphore instance
 * Use this to wrap all Gemini API calls
 *
 * @example
 * import { geminiSemaphore } from './services/semaphore.service.js';
 *
 * const result = await geminiSemaphore.execute(() =>
 *   model.generateContent(prompt)
 * );
 */
export const geminiSemaphore = GeminiSemaphoreService.getInstance();

/**
 * Utility for adjusting semaphore limit at runtime
 * Useful for tuning based on observed performance
 */
export const adjustGeminiLimit = (newLimit: number) => {
  GeminiSemaphoreService.reset();
  return GeminiSemaphoreService.getInstance(newLimit);
};
