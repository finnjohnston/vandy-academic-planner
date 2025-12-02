// Load test environment variables FIRST, before any imports that might use them
import { config } from 'dotenv';
config({ path: '.env.test', override: true });

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Create Prisma client for tests (after env vars are loaded)
export const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  // Push schema to test database (using db push since no migrations yet)
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    console.error('Failed to push schema to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  // Disconnect Prisma client
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database between tests (in reverse order of foreign keys)
  await prisma.$transaction([
    prisma.section.deleteMany(),
    prisma.class.deleteMany(),
    prisma.course.deleteMany(),
    prisma.term.deleteMany(),
    prisma.academicYear.deleteMany(),
  ]);
});
