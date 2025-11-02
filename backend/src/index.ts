import express from 'express';
import dotenv from 'dotenv';
import { prisma } from './config/prisma.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      message: 'Backend is running',
      database: 'connected',
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Backend is running but database is unavailable',
      database: 'disconnected',
    });
  }
});

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);

  // Test database connection on startup
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
});
