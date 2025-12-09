import { Request, Response, NextFunction } from 'express';
import {
  getAllAcademicYears,
  getCurrentAcademicYear as getCurrentYear,
  getAcademicYearById as getYearById,
  createAcademicYear as createYear,
  setCurrentAcademicYear as setCurrentYear,
} from '../../ingestion/pipelines/services/academicYear.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { InternalError, NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/academic-years
 * Get all academic years, sorted by start year descending
 */
export async function getAcademicYears(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.http('GET /api/academic-years');

    const result = await getAllAcademicYears();

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const academicYears = result.data.map((year) => ({
      id: year.id,
      year: year.year,
      start: year.start,
      end: year.end,
      isCurrent: year.isCurrent,
      createdAt: year.createdAt,
      updatedAt: year.updatedAt,
    }));

    sendSuccess(res, academicYears);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/academic-years/current
 * Get the current academic year
 */
export async function getCurrentAcademicYear(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.http('GET /api/academic-years/current');

    const result = await getCurrentYear();

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // If no current year found, return 404
    if (result.data === null) {
      throw new NotFoundError('No current academic year set');
    }

    // Transform data - return only basic fields
    const academicYear = {
      id: result.data.id,
      year: result.data.year,
      start: result.data.start,
      end: result.data.end,
      isCurrent: result.data.isCurrent,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    sendSuccess(res, academicYear);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/academic-years/:id
 * Get specific academic year by ID
 */
export async function getAcademicYearById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/academic-years/${id}`);

    const result = await getYearById(Number(id));

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // If academic year not found, return 404
    if (result.data === null) {
      throw new NotFoundError('Academic year not found');
    }

    // Transform data - return only basic fields
    const academicYear = {
      id: result.data.id,
      year: result.data.year,
      start: result.data.start,
      end: result.data.end,
      isCurrent: result.data.isCurrent,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    sendSuccess(res, academicYear);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/academic-years
 * Create new academic year
 */
export async function createAcademicYear(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { year } = req.body;
    logger.http(`POST /api/academic-years (year: ${year})`);

    const result = await createYear(year);

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const academicYear = {
      id: result.data.id,
      year: result.data.year,
      start: result.data.start,
      end: result.data.end,
      isCurrent: result.data.isCurrent,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    // Return 201 Created
    sendSuccess(res, academicYear, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/academic-years/:id/set-current
 * Set specific academic year as current (unmarks all others)
 */
export async function setCurrentAcademicYear(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`PATCH /api/academic-years/${id}/set-current`);

    const result = await setCurrentYear(Number(id));

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const academicYear = {
      id: result.data.id,
      year: result.data.year,
      start: result.data.start,
      end: result.data.end,
      isCurrent: result.data.isCurrent,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    sendSuccess(res, academicYear);
  } catch (err) {
    next(err);
  }
}
