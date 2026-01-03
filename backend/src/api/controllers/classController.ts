import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';
import {
  parseSearchQuery,
  buildClassFilter,
} from '../utils/courseSearch.utils.js';

/**
 * GET /api/classes
 * Search/list classes by term with optional query
 */
export async function getClasses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { termId, q } = req.query;
    const term = String(termId);

    logger.http(`GET /api/classes?termId=${term}${q ? `&q=${q}` : ''}`);

    // Build search filter if query provided
    let searchFilter = {};
    if (q && typeof q === 'string') {
      const pattern = parseSearchQuery(q);
      searchFilter = buildClassFilter(pattern);
    }

    // Query classes with filters
    const classes = await prisma.class.findMany({
      where: {
        termId: term,
        ...searchFilter,
      },
      orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
      take: 1000, // Reasonable limit
    });

    // Transform data - return relevant fields
    const transformedClasses = classes.map((classItem) => ({
      id: classItem.id,
      classId: classItem.classId,
      termId: classItem.termId,
      courseId: classItem.courseId,
      subjectCode: classItem.subjectCode,
      courseNumber: classItem.courseNumber,
      title: classItem.title,
      school: classItem.school,
      creditsMin: classItem.creditsMin,
      creditsMax: classItem.creditsMax,
      description: classItem.description,
      attributes: classItem.attributes,
      requirements: classItem.requirements,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    }));

    sendSuccess(res, transformedClasses);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/classes/by-class-id/:classId
 * Get specific class by classId (unique string identifier)
 */
export async function getClassByClassId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { classId } = req.params;
    logger.http(`GET /api/classes/by-class-id/${classId}`);

    const classItem = await prisma.class.findUnique({
      where: { classId },
    });

    if (!classItem) {
      throw new NotFoundError('Class not found');
    }

    // Transform data - return relevant fields
    const transformedClass = {
      id: classItem.id,
      classId: classItem.classId,
      termId: classItem.termId,
      courseId: classItem.courseId,
      subjectCode: classItem.subjectCode,
      courseNumber: classItem.courseNumber,
      title: classItem.title,
      school: classItem.school,
      creditsMin: classItem.creditsMin,
      creditsMax: classItem.creditsMax,
      description: classItem.description,
      attributes: classItem.attributes,
      requirements: classItem.requirements,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    };

    sendSuccess(res, transformedClass);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/classes/:id
 * Get specific class by primary database ID
 */
export async function getClassById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/classes/${id}`);

    const classItem = await prisma.class.findUnique({
      where: { id: Number(id) },
    });

    if (!classItem) {
      throw new NotFoundError('Class not found');
    }

    // Transform data - return relevant fields
    const transformedClass = {
      id: classItem.id,
      classId: classItem.classId,
      termId: classItem.termId,
      courseId: classItem.courseId,
      subjectCode: classItem.subjectCode,
      courseNumber: classItem.courseNumber,
      title: classItem.title,
      school: classItem.school,
      creditsMin: classItem.creditsMin,
      creditsMax: classItem.creditsMax,
      description: classItem.description,
      attributes: classItem.attributes,
      requirements: classItem.requirements,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    };

    sendSuccess(res, transformedClass);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/classes
 * Create new class
 */
export async function createClass(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const classData = req.body;
    logger.http(
      `POST /api/classes (${classData.subjectCode} ${classData.courseNumber})`
    );

    // Create class directly with Prisma
    const classItem = await prisma.class.create({
      data: {
        classId: classData.classId || `${classData.termId}-${Date.now()}`,
        termId: classData.termId,
        courseId: classData.courseId,
        subjectCode: classData.subjectCode,
        courseNumber: classData.courseNumber,
        title: classData.title,
        school: classData.school,
        creditsMin: classData.creditsMin,
        creditsMax: classData.creditsMax,
        description: classData.description,
        attributes: classData.attributes,
        requirements: classData.requirements,
      },
    });

    // Transform data - return relevant fields
    const transformedClass = {
      id: classItem.id,
      classId: classItem.classId,
      termId: classItem.termId,
      courseId: classItem.courseId,
      subjectCode: classItem.subjectCode,
      courseNumber: classItem.courseNumber,
      title: classItem.title,
      school: classItem.school,
      creditsMin: classItem.creditsMin,
      creditsMax: classItem.creditsMax,
      description: classItem.description,
      attributes: classItem.attributes,
      requirements: classItem.requirements,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    };

    // Return 201 Created
    sendSuccess(res, transformedClass, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/classes/:id
 * Update class details
 */
export async function updateClass(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.http(`PUT /api/classes/${id}`);

    // Update class directly with Prisma
    const classItem = await prisma.class.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Transform data - return relevant fields
    const transformedClass = {
      id: classItem.id,
      classId: classItem.classId,
      termId: classItem.termId,
      courseId: classItem.courseId,
      subjectCode: classItem.subjectCode,
      courseNumber: classItem.courseNumber,
      title: classItem.title,
      school: classItem.school,
      creditsMin: classItem.creditsMin,
      creditsMax: classItem.creditsMax,
      description: classItem.description,
      attributes: classItem.attributes,
      requirements: classItem.requirements,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
    };

    sendSuccess(res, transformedClass);
  } catch (err) {
    // Prisma throws if record not found - convert to NotFoundError
    if (
      err instanceof Error &&
      err.message.includes('Record to update not found')
    ) {
      next(new NotFoundError('Class not found'));
    } else {
      next(err);
    }
  }
}
