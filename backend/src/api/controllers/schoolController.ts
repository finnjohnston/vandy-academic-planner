import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/schools
 * List all schools with optional filtering by code
 */
export async function getSchools(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.query;
    logger.http(`GET /api/schools${code ? `?code=${code}` : ''}`);

    // Build where clause for filtering
    const where = code ? { code: String(code).toUpperCase() } : {};

    // Query schools
    const schools = await prisma.school.findMany({
      where,
      orderBy: { code: 'asc' },
      take: 1000, // Reasonable limit
    });

    // Transform data - return relevant fields
    const transformedSchools = schools.map((school) => ({
      id: school.id,
      code: school.code,
      name: school.name,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    }));

    sendSuccess(res, transformedSchools);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/schools/:id
 * Get a specific school by ID
 */
export async function getSchoolById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/schools/${id}`);

    const school = await prisma.school.findUnique({
      where: { id: Number(id) },
    });

    if (!school) {
      throw new NotFoundError('School not found');
    }

    // Transform data - return relevant fields
    const transformedSchool = {
      id: school.id,
      code: school.code,
      name: school.name,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };

    sendSuccess(res, transformedSchool);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/schools
 * Create a new school
 */
export async function createSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code, name } = req.body;
    logger.http(`POST /api/schools (${code})`);

    // Create school (code is already uppercased by Zod validation)
    const school = await prisma.school.create({
      data: {
        code,
        name,
      },
    });

    // Transform data - return relevant fields
    const transformedSchool = {
      id: school.id,
      code: school.code,
      name: school.name,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };

    res.status(201).json({ data: transformedSchool });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/schools/:id
 * Update an existing school
 */
export async function updateSchool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.http(`PUT /api/schools/${id}`);

    // Update school (code is already uppercased by Zod validation)
    const school = await prisma.school.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Transform data - return relevant fields
    const transformedSchool = {
      id: school.id,
      code: school.code,
      name: school.name,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };

    sendSuccess(res, transformedSchool);
  } catch (err) {
    // Handle Prisma "record not found" error
    if (err instanceof Error && err.message.includes('Record to update not found')) {
      next(new NotFoundError('School not found'));
    } else {
      next(err);
    }
  }
}
