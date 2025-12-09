import { Request, Response, NextFunction } from 'express';
import {
  getAllTerms,
  getTermById as getTermByIdService,
  insertTerm,
  updateTerm as updateTermService,
} from '../../ingestion/operations/term.insert.js';
import { sendSuccess } from '../utils/response.utils.js';
import { InternalError, NotFoundError } from '../types/error.types.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/terms
 * Get all terms, optionally filtered by academicYearId query parameter
 */
export async function getTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { academicYearId } = req.query;
    const yearId = academicYearId ? Number(academicYearId) : undefined;

    logger.http(`GET /api/terms${yearId ? `?academicYearId=${yearId}` : ''}`);

    const result = await getAllTerms(yearId);

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const terms = result.data.map((term) => ({
      id: term.id,
      termId: term.termId,
      academicYearId: term.academicYearId,
      name: term.name,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    }));

    sendSuccess(res, terms);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/terms/:id
 * Get specific term by ID
 */
export async function getTermById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.http(`GET /api/terms/${id}`);

    const result = await getTermByIdService(Number(id));

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // If term not found, return 404
    if (result.data === null) {
      throw new NotFoundError('Term not found');
    }

    // Transform data - return only basic fields
    const term = {
      id: result.data.id,
      termId: result.data.termId,
      academicYearId: result.data.academicYearId,
      name: result.data.name,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    sendSuccess(res, term);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/terms
 * Create new term
 */
export async function createTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { termId, academicYearId, name } = req.body;
    logger.http(`POST /api/terms (termId: ${termId}, name: ${name})`);

    const result = await insertTerm({ termId, academicYearId, name });

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const term = {
      id: result.data.id,
      termId: result.data.termId,
      academicYearId: result.data.academicYearId,
      name: result.data.name,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    // Return 201 Created
    sendSuccess(res, term, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/terms/:id
 * Update term details
 */
export async function updateTerm(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, academicYearId } = req.body;
    logger.http(`PUT /api/terms/${id}`);

    const updateData: { name?: string; academicYearId?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (academicYearId !== undefined) updateData.academicYearId = academicYearId;

    const result = await updateTermService(Number(id), updateData);

    if (!result.success) {
      throw new InternalError(result.error.message, {
        code: result.error.code,
        details: result.error.details,
      });
    }

    // Transform data - return only basic fields
    const term = {
      id: result.data.id,
      termId: result.data.termId,
      academicYearId: result.data.academicYearId,
      name: result.data.name,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };

    sendSuccess(res, term);
  } catch (err) {
    next(err);
  }
}
