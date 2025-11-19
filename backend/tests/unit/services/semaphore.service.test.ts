import { describe, it, expect, vi } from 'vitest';
import { Semaphore, geminiSemaphore, adjustGeminiLimit } from '../../../src/ingestion/services/semaphore.service.js';

describe('Semaphore', () => {
  describe('constructor', () => {
    it('should create a semaphore with valid limit', () => {
      const semaphore = new Semaphore(5);
      expect(semaphore.getState().limit).toBe(5);
      expect(semaphore.getState().running).toBe(0);
      expect(semaphore.getState().queued).toBe(0);
    });

    it('should throw error if limit is 0', () => {
      expect(() => new Semaphore(0)).toThrow('Semaphore limit must be greater than 0');
    });

    it('should throw error if limit is negative', () => {
      expect(() => new Semaphore(-1)).toThrow('Semaphore limit must be greater than 0');
    });
  });

  describe('execute', () => {
    it('should execute a single async function', async () => {
      const semaphore = new Semaphore(1);
      const mockFn = vi.fn(async () => 'result');

      const result = await semaphore.execute(mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(semaphore.getState().running).toBe(0);
    });

    it('should limit concurrent executions', async () => {
      const semaphore = new Semaphore(2);
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const mockFn = async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
        return 'done';
      };

      // Start 5 operations, but only 2 should run concurrently
      const promises = Array(5).fill(0).map(() => semaphore.execute(mockFn));

      await Promise.all(promises);

      expect(maxConcurrent).toBe(2);
      expect(semaphore.getState().running).toBe(0);
      expect(semaphore.getState().queued).toBe(0);
    });

    it('should queue operations when at limit', async () => {
      const semaphore = new Semaphore(1);
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });

      // Start first operation that will block
      const first = semaphore.execute(async () => {
        await firstPromise;
        return 'first';
      });

      // Wait a bit to ensure first operation has acquired the semaphore
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check state - should have 1 running
      expect(semaphore.getState().running).toBe(1);
      expect(semaphore.getState().queued).toBe(0);

      // Start second operation - should be queued
      const second = semaphore.execute(async () => 'second');

      // Wait a bit to ensure second operation is queued
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check state - should have 1 running, 1 queued
      expect(semaphore.getState().running).toBe(1);
      expect(semaphore.getState().queued).toBe(1);

      // Release first operation
      resolveFirst!();
      await first;

      // Wait for second to complete
      const secondResult = await second;

      expect(secondResult).toBe('second');
      expect(semaphore.getState().running).toBe(0);
      expect(semaphore.getState().queued).toBe(0);
    });

    it('should release semaphore even if function throws', async () => {
      const semaphore = new Semaphore(1);
      const mockError = new Error('Test error');

      await expect(
        semaphore.execute(async () => {
          throw mockError;
        })
      ).rejects.toThrow('Test error');

      // Semaphore should be released
      expect(semaphore.getState().running).toBe(0);

      // Should be able to execute another operation
      const result = await semaphore.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should process queued operations in FIFO order', async () => {
      const semaphore = new Semaphore(1);
      const results: number[] = [];
      let resolveFirst: () => void;

      // Start first operation that blocks
      const first = semaphore.execute(async () => {
        await new Promise<void>(resolve => {
          resolveFirst = resolve;
        });
        results.push(1);
        return 1;
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Queue several operations
      const second = semaphore.execute(async () => {
        results.push(2);
        return 2;
      });
      const third = semaphore.execute(async () => {
        results.push(3);
        return 3;
      });

      // Release first
      resolveFirst!();
      await Promise.all([first, second, third]);

      // Should execute in order
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('getState', () => {
    it('should return correct state for idle semaphore', () => {
      const semaphore = new Semaphore(5);
      const state = semaphore.getState();

      expect(state.running).toBe(0);
      expect(state.queued).toBe(0);
      expect(state.limit).toBe(5);
    });

    it('should return correct state during execution', async () => {
      const semaphore = new Semaphore(2);
      let releaseAll: () => void;
      const blockingPromise = new Promise<void>(resolve => {
        releaseAll = resolve;
      });

      // Start 4 operations that all wait on the same promise
      const operations = Array(4).fill(0).map((_, i) =>
        semaphore.execute(async () => {
          await blockingPromise;
          return i;
        })
      );

      // Wait for operations to be queued/running
      await new Promise(resolve => setTimeout(resolve, 20));

      const state = semaphore.getState();
      expect(state.running).toBe(2);
      expect(state.queued).toBe(2);
      expect(state.limit).toBe(2);

      // Release all operations
      releaseAll!();
      await Promise.all(operations);

      const finalState = semaphore.getState();
      expect(finalState.running).toBe(0);
      expect(finalState.queued).toBe(0);
    });
  });
});

describe('GeminiSemaphoreService', () => {
  describe('geminiSemaphore singleton', () => {
    it('should have default limit of 20', () => {
      const state = geminiSemaphore.getState();
      expect(state.limit).toBe(20);
    });

    it('should be a Semaphore instance', () => {
      expect(geminiSemaphore).toBeInstanceOf(Semaphore);
    });

    it('should work for concurrent API-like operations', async () => {
      const results: number[] = [];

      // Simulate multiple API calls
      const apiCalls = Array(10).fill(0).map((_, i) =>
        geminiSemaphore.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          results.push(i);
          return i;
        })
      );

      await Promise.all(apiCalls);

      expect(results).toHaveLength(10);
      expect(results.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('adjustGeminiLimit', () => {
    it('should create new instance with custom limit', () => {
      const newSemaphore = adjustGeminiLimit(10);

      expect(newSemaphore.getState().limit).toBe(10);
      expect(newSemaphore).toBeInstanceOf(Semaphore);
    });

    it('should reset the singleton instance', () => {
      // Adjust to new limit
      const adjusted = adjustGeminiLimit(15);

      // Should be different instance (after reset)
      expect(adjusted.getState().limit).toBe(15);

      // Reset back to default for other tests
      adjustGeminiLimit(20);
    });

    it('should allow adjusting limit multiple times', () => {
      const first = adjustGeminiLimit(5);
      expect(first.getState().limit).toBe(5);

      const second = adjustGeminiLimit(10);
      expect(second.getState().limit).toBe(10);

      const third = adjustGeminiLimit(15);
      expect(third.getState().limit).toBe(15);

      // Reset to default
      adjustGeminiLimit(20);
    });
  });
});

describe('Integration scenarios', () => {
  it('should handle mix of fast and slow operations', async () => {
    const semaphore = new Semaphore(3);
    const results: string[] = [];

    const operations = [
      semaphore.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push('slow-1');
        return 'slow-1';
      }),
      semaphore.execute(async () => {
        results.push('fast-1');
        return 'fast-1';
      }),
      semaphore.execute(async () => {
        results.push('fast-2');
        return 'fast-2';
      }),
      semaphore.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push('slow-2');
        return 'slow-2';
      }),
    ];

    await Promise.all(operations);

    expect(results).toHaveLength(4);
    expect(results).toContain('slow-1');
    expect(results).toContain('slow-2');
    expect(results).toContain('fast-1');
    expect(results).toContain('fast-2');
  });

  it('should handle errors without blocking other operations', async () => {
    const semaphore = new Semaphore(2);
    const results: string[] = [];

    const operations = [
      semaphore.execute(async () => {
        throw new Error('Operation 1 failed');
      }).catch(() => results.push('error-1')),
      semaphore.execute(async () => {
        results.push('success-1');
        return 'success-1';
      }),
      semaphore.execute(async () => {
        throw new Error('Operation 3 failed');
      }).catch(() => results.push('error-2')),
      semaphore.execute(async () => {
        results.push('success-2');
        return 'success-2';
      }),
    ];

    await Promise.all(operations);

    expect(results).toContain('error-1');
    expect(results).toContain('error-2');
    expect(results).toContain('success-1');
    expect(results).toContain('success-2');
    expect(semaphore.getState().running).toBe(0);
  });

  it('should maintain correct state through complex operations', async () => {
    const semaphore = new Semaphore(2);
    const states: Array<{ running: number; queued: number }> = [];

    let resolver1: () => void;
    let resolver2: () => void;
    let resolver3: () => void;

    const op1 = semaphore.execute(async () => {
      await new Promise<void>(resolve => { resolver1 = resolve; });
      return 1;
    });

    const op2 = semaphore.execute(async () => {
      await new Promise<void>(resolve => { resolver2 = resolve; });
      return 2;
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    states.push({ ...semaphore.getState() });

    const op3 = semaphore.execute(async () => {
      await new Promise<void>(resolve => { resolver3 = resolve; });
      return 3;
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    states.push({ ...semaphore.getState() });

    resolver1!();
    await op1;
    await new Promise(resolve => setTimeout(resolve, 10));
    states.push({ ...semaphore.getState() });

    resolver2!();
    await op2;
    await new Promise(resolve => setTimeout(resolve, 10));
    states.push({ ...semaphore.getState() });

    resolver3!();
    await op3;
    states.push({ ...semaphore.getState() });

    // Verify state transitions
    expect(states[0]).toEqual({ running: 2, queued: 0, limit: 2 });
    expect(states[1]).toEqual({ running: 2, queued: 1, limit: 2 });
    expect(states[2]).toEqual({ running: 2, queued: 0, limit: 2 });
    expect(states[3]).toEqual({ running: 1, queued: 0, limit: 2 });
    expect(states[4]).toEqual({ running: 0, queued: 0, limit: 2 });
  });
});
