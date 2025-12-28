import { Request, Response, NextFunction } from 'express';
import {
  getCoursesByFilter,
  evaluateCourseFilter,
  calculateFilterSpecificity,
  validateFilter,
} from '../services/courseFilter.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { ValidationError, NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

/**
 * POST /api/course-filters/query
 * Get all courses matching a filter
 */
export async function queryCoursesByFilter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { filter, academicYearId } = req.body;
    logger.http('POST /api/course-filters/query');

    // Validate filter structure
    const error = validateFilter(filter);
    if (error) {
      throw new ValidationError(`Invalid filter: ${error}`);
    }

    const courses = await getCoursesByFilter(filter, academicYearId);

    sendSuccess(res, {
      filter,
      academicYearId,
      matchingCourses: courses.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        title: c.title,
        subjectCode: c.subjectCode,
        courseNumber: c.courseNumber,
        credits: c.creditsMin,
      })),
      count: courses.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/course-filters/evaluate
 * Check if a specific course matches a filter
 */
export async function evaluateCourseAgainstFilter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { courseId, filter, academicYearId } = req.body;
    logger.http('POST /api/course-filters/evaluate');

    // Validate filter
    const error = validateFilter(filter);
    if (error) {
      throw new ValidationError(`Invalid filter: ${error}`);
    }

    // Fetch course
    const course = await prisma.course.findFirst({
      where: { courseId, academicYearId },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const matches = evaluateCourseFilter(course, filter);
    const specificity = calculateFilterSpecificity(filter);

    sendSuccess(res, {
      courseId,
      filter,
      matches,
      specificity,
      course: {
        id: course.id,
        courseId: course.courseId,
        title: course.title,
        subjectCode: course.subjectCode,
        courseNumber: course.courseNumber,
        credits: course.creditsMin,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/course-filters/specificity
 * Calculate specificity score for a filter
 */
export async function getFilterSpecificity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { filter } = req.body;
    logger.http('POST /api/course-filters/specificity');

    const error = validateFilter(filter);
    if (error) {
      throw new ValidationError(`Invalid filter: ${error}`);
    }

    const specificity = calculateFilterSpecificity(filter);

    sendSuccess(res, {
      filter,
      specificity,
    });
  } catch (err) {
    next(err);
  }
}
