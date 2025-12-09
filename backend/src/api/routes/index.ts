import { Router } from 'express';
import academicYearRoutes from './academicYearRoutes.js';
import termRoutes from './termRoutes.js';

const router = Router();

// Mount sub-routers
router.use('/academic-years', academicYearRoutes);
router.use('/terms', termRoutes);

// Future routes can be added here:
// router.use('/courses', courseRoutes);
// router.use('/classes', classRoutes);
// router.use('/sections', sectionRoutes);

export default router;
