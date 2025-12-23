import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../utils/response.utils.js';
import { NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/programs
 * List all programs with optional filtering
 */
export async function getPrograms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { academicYearId, schoolId, type } = req.query;

    // Build query string for logging
    const queryParams = [];
    if (academicYearId) queryParams.push(`academicYearId=${academicYearId}`);
    if (schoolId) queryParams.push(`schoolId=${schoolId}`);
    if (type) queryParams.push(`type=${type}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    logger.http(`GET /api/programs${queryString}`);

    // Build where clause for filtering
    const where: any = {};
    if (academicYearId !== undefined) {
      where.academicYearId = Number(academicYearId);
    }
    if (schoolId !== undefined) {
      where.schoolId = Number(schoolId);
    }
    if (type !== undefined) {
      where.type = String(type);
    }

    // Query programs with relations
    const programs = await prisma.program.findMany({
      where,
      include: {
        academicYear: true,
        school: true,
      },
      orderBy: [
        { academicYearId: 'desc' },
        { schoolId: 'asc' },
        { name: 'asc' },
      ],
      take: 1000,
    });

    // Transform data - return relevant fields explicitly
    const transformedPrograms = programs.map((program) => ({
      id: program.id,
      programId: program.programId,
      name: program.name,
      type: program.type,
      totalCredits: program.totalCredits,
      requirements: program.requirements,
      academicYearId: program.academicYearId,
      schoolId: program.schoolId,
      academicYear: {
        id: program.academicYear.id,
        year: program.academicYear.year,
        start: program.academicYear.start,
        end: program.academicYear.end,
        isCurrent: program.academicYear.isCurrent,
        createdAt: program.academicYear.createdAt,
        updatedAt: program.academicYear.updatedAt,
      },
      school: {
        id: program.school.id,
        code: program.school.code,
        name: program.school.name,
        createdAt: program.school.createdAt,
        updatedAt: program.school.updatedAt,
      },
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    }));

    sendSuccess(res, transformedPrograms);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/programs/:id
 * Get a specific program by database ID
 */
export async function getProgramById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/programs/${id}`);

    const program = await prisma.program.findUnique({
      where: { id: Number(id) },
      include: {
        academicYear: true,
        school: true,
      },
    });

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    // Transform data - return relevant fields explicitly
    const transformedProgram = {
      id: program.id,
      programId: program.programId,
      name: program.name,
      type: program.type,
      totalCredits: program.totalCredits,
      requirements: program.requirements,
      academicYearId: program.academicYearId,
      schoolId: program.schoolId,
      academicYear: {
        id: program.academicYear.id,
        year: program.academicYear.year,
        start: program.academicYear.start,
        end: program.academicYear.end,
        isCurrent: program.academicYear.isCurrent,
        createdAt: program.academicYear.createdAt,
        updatedAt: program.academicYear.updatedAt,
      },
      school: {
        id: program.school.id,
        code: program.school.code,
        name: program.school.name,
        createdAt: program.school.createdAt,
        updatedAt: program.school.updatedAt,
      },
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };

    sendSuccess(res, transformedProgram);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/programs/by-program-id/:programId
 * Get a specific program by unique programId string
 */
export async function getProgramByProgramId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { programId } = req.params;
    logger.http(`GET /api/programs/by-program-id/${programId}`);

    const program = await prisma.program.findUnique({
      where: { programId: programId },
      include: {
        academicYear: true,
        school: true,
      },
    });

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    // Transform data - return relevant fields explicitly
    const transformedProgram = {
      id: program.id,
      programId: program.programId,
      name: program.name,
      type: program.type,
      totalCredits: program.totalCredits,
      requirements: program.requirements,
      academicYearId: program.academicYearId,
      schoolId: program.schoolId,
      academicYear: {
        id: program.academicYear.id,
        year: program.academicYear.year,
        start: program.academicYear.start,
        end: program.academicYear.end,
        isCurrent: program.academicYear.isCurrent,
        createdAt: program.academicYear.createdAt,
        updatedAt: program.academicYear.updatedAt,
      },
      school: {
        id: program.school.id,
        code: program.school.code,
        name: program.school.name,
        createdAt: program.school.createdAt,
        updatedAt: program.school.updatedAt,
      },
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };

    sendSuccess(res, transformedProgram);
  } catch (err) {
    next(err);
  }
}
