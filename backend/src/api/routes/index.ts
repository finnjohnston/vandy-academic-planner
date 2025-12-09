/**
 * API Routes Index
 * Combines all API route modules into a single router
 */

import { Router } from 'express';
import academicYearRoutes from './academicYearRoutes.js';

const router = Router();

// Mount sub-routers
router.use('/academic-years', academicYearRoutes);

// Future routes can be added here:
// router.use('/courses', courseRoutes);
// router.use('/terms', termRoutes);
// router.use('/classes', classRoutes);
// router.use('/sections', sectionRoutes);

export default router;
