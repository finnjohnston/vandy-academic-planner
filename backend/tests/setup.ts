import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Global test setup
beforeAll(async () => {
  // Setup that runs once before all tests
  // e.g., start test database, initialize services
});

afterAll(async () => {
  // Cleanup that runs once after all tests
  // e.g., close database connections, cleanup resources
});

beforeEach(() => {
  // Setup that runs before each test
  // e.g., reset database state, clear mocks
});

afterEach(() => {
  // Cleanup that runs after each test
  // e.g., restore mocks, cleanup test data
});
