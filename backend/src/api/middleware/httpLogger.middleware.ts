/**
 * HTTP request logging middleware
 * Integrates Morgan with Winston logger
 */

import morgan from 'morgan';
import { stream } from '../../utils/logger.js';

/**
 * HTTP request logger using Morgan + Winston
 * Logs: method, URL, status, content-length, response-time
 */
export const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream }
);
