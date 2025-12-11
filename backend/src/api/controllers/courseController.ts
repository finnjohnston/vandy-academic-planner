import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { InternalError, NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';
import {
  parseSearchQuery,
  buildCourseFilter,
} from '../utils/courseSearch.utils.js';
import { insertCourse } from '../../ingestion/operations/course.insert.js';

/**
 * GET /api/courses
 * Search/list courses by academic year with optional query
 */
export async function getCourses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { academicYearId, q } = req.query;
    const yearId = Number(academicYearId);

    logger.http(
      `GET /api/courses?academicYearId=${yearId}${q ? `&q=${q}` : ''}`
    );

    // Build search filter if query provided
    let searchFilter = {};
    if (q && typeof q === 'string') {
      const pattern = parseSearchQuery(q);
      searchFilter = buildCourseFilter(pattern);
    }

    // Query courses with filters
    const courses = await prisma.course.findMany({
      where: {
        academicYearId: yearId,
        ...searchFilter,
      },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
      take: 1000, // Reasonable limit
    });

    // Transform data - return relevant fields
    const transformedCourses = courses.map((course) => ({
      id: course.id,
      courseId: course.courseId,
      academicYearId: course.academicYearId,
      subjectCode: course.subjectCode,
      courseNumber: course.courseNumber,
      title: course.title,
      school: course.school,
      creditsMin: course.creditsMin,
      creditsMax: course.creditsMax,
      typicallyOffered: course.typicallyOffered,
      description: course.description,
      attributes: course.attributes,
      requirements: course.requirements,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));

    sendSuccess(res, transformedCourses);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses/:id
 * Get specific course by primary database ID
 */
export async function getCourseById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/courses/${id}`);

    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Transform data - return relevant fields
    const transformedCourse = {
      id: course.id,
      courseId: course.courseId,
      academicYearId: course.academicYearId,
      subjectCode: course.subjectCode,
      courseNumber: course.courseNumber,
      title: course.title,
      school: course.school,
      creditsMin: course.creditsMin,
      creditsMax: course.creditsMax,
      typicallyOffered: course.typicallyOffered,
      description: course.description,
      attributes: course.attributes,
      requirements: course.requirements,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    sendSuccess(res, transformedCourse);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/courses
 * Create new course using existing ingestion function
 */
export async function createCourse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const courseData = req.body;
    logger.http(
      `POST /api/courses (${courseData.subjectCode} ${courseData.courseNumber})`
    );

    // Use existing ingestion function
    const result = await insertCourse(courseData);

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return relevant fields
    const transformedCourse = {
      id: result.data.id,
      courseId: result.data.courseId,
      academicYearId: result.data.academicYearId,
      subjectCode: result.data.subjectCode,
      courseNumber: result.data.courseNumber,
      title: result.data.title,
      school: result.data.school,
      creditsMin: result.data.creditsMin,
      creditsMax: result.data.creditsMax,
      typicallyOffered: result.data.typicallyOffered,
      description: result.data.description,
      attributes: result.data.attributes,
      requirements: result.data.requirements,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    // Return 201 Created
    sendSuccess(res, transformedCourse, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/courses/:id
 * Update course details
 */
export async function updateCourse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.http(`PUT /api/courses/${id}`);

    // Update course directly with Prisma
    const course = await prisma.course.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Transform data - return relevant fields
    const transformedCourse = {
      id: course.id,
      courseId: course.courseId,
      academicYearId: course.academicYearId,
      subjectCode: course.subjectCode,
      courseNumber: course.courseNumber,
      title: course.title,
      school: course.school,
      creditsMin: course.creditsMin,
      creditsMax: course.creditsMax,
      typicallyOffered: course.typicallyOffered,
      description: course.description,
      attributes: course.attributes,
      requirements: course.requirements,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    sendSuccess(res, transformedCourse);
  } catch (err) {
    // Prisma throws if record not found - convert to NotFoundError
    if (err instanceof Error && err.message.includes('Record to update not found')) {
      next(new NotFoundError('Course not found'));
    } else {
      next(err);
    }
  }
}
