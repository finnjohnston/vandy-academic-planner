import { Router } from 'express';
import academicYearRoutes from './academicYearRoutes.js';
import termRoutes from './termRoutes.js';
import courseRoutes from './courseRoutes.js';
import classRoutes from './classRoutes.js';

const router = Router();

// Mount sub-routers
router.use('/academic-years', academicYearRoutes);
router.use('/terms', termRoutes);
router.use('/courses', courseRoutes);
router.use('/classes', classRoutes);

export default router;
