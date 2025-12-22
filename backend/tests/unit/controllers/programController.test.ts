import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getPrograms,
  getProgramById,
  getProgramByProgramId,
} from '../../../src/api/controllers/programController.js';
import { prisma } from '../../../src/config/prisma.js';
import { NotFoundError } from '../../../src/api/types/error.types.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    program: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('programController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockAcademicYear = {
    id: 869,
    year: '2025-2026',
    start: 2025,
    end: 2026,
    isCurrent: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSchool = {
    id: 1,
    code: 'ENGR',
    name: 'School of Engineering',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProgram = {
    id: 1,
    programId: 'computer_science_major',
    name: 'Computer Science Major',
    type: 'major',
    totalCredits: 120,
    requirements: {
      sections: [],
      constraints: [],
    },
    academicYearId: 869,
    schoolId: 1,
    academicYear: mockAcademicYear,
    school: mockSchool,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getPrograms', () => {
    it('should return all programs when no filters provided', async () => {
      const mockPrograms = [mockProgram];
      vi.mocked(prisma.program.findMany).mockResolvedValue(mockPrograms);

      await getPrograms(req as Request, res as Response, next);

      expect(prisma.program.findMany).toHaveBeenCalledWith({
        where: {},
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
      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockProgram.id,
            programId: mockProgram.programId,
            name: mockProgram.name,
            type: mockProgram.type,
            totalCredits: mockProgram.totalCredits,
          }),
        ]),
      });
    });

    it('should filter by academicYearId when provided', async () => {
      req.query = { academicYearId: '869' };
      const mockPrograms = [mockProgram];
      vi.mocked(prisma.program.findMany).mockResolvedValue(mockPrograms);

      await getPrograms(req as Request, res as Response, next);

      expect(prisma.program.findMany).toHaveBeenCalledWith({
        where: { academicYearId: 869 },
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
    });

    it('should filter by schoolId when provided', async () => {
      req.query = { schoolId: '1' };
      const mockPrograms = [mockProgram];
      vi.mocked(prisma.program.findMany).mockResolvedValue(mockPrograms);

      await getPrograms(req as Request, res as Response, next);

      expect(prisma.program.findMany).toHaveBeenCalledWith({
        where: { schoolId: 1 },
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
    });

    it('should filter by type when provided', async () => {
      req.query = { type: 'major' };
      const mockPrograms = [mockProgram];
      vi.mocked(prisma.program.findMany).mockResolvedValue(mockPrograms);

      await getPrograms(req as Request, res as Response, next);

      expect(prisma.program.findMany).toHaveBeenCalledWith({
        where: { type: 'major' },
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
    });

    it('should apply multiple filters', async () => {
      req.query = { academicYearId: '869', schoolId: '1', type: 'major' };
      const mockPrograms = [mockProgram];
      vi.mocked(prisma.program.findMany).mockResolvedValue(mockPrograms);

      await getPrograms(req as Request, res as Response, next);

      expect(prisma.program.findMany).toHaveBeenCalledWith({
        where: {
          academicYearId: 869,
          schoolId: 1,
          type: 'major',
        },
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
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      vi.mocked(prisma.program.findMany).mockRejectedValue(error);

      await getPrograms(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProgramById', () => {
    it('should return program by ID', async () => {
      req.params = { id: '1' };
      vi.mocked(prisma.program.findUnique).mockResolvedValue(mockProgram);

      await getProgramById(req as Request, res as Response, next);

      expect(prisma.program.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          academicYear: true,
          school: true,
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockProgram.id,
          programId: mockProgram.programId,
          name: mockProgram.name,
        }),
      });
    });

    it('should throw NotFoundError when program not found', async () => {
      req.params = { id: '999' };
      vi.mocked(prisma.program.findUnique).mockResolvedValue(null);

      await getProgramById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should handle errors and call next', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.program.findUnique).mockRejectedValue(error);

      await getProgramById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProgramByProgramId', () => {
    it('should return program by programId string', async () => {
      req.params = { programId: 'computer_science_major' };
      vi.mocked(prisma.program.findUnique).mockResolvedValue(mockProgram);

      await getProgramByProgramId(req as Request, res as Response, next);

      expect(prisma.program.findUnique).toHaveBeenCalledWith({
        where: { programId: 'computer_science_major' },
        include: {
          academicYear: true,
          school: true,
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockProgram.id,
          programId: mockProgram.programId,
          name: mockProgram.name,
        }),
      });
    });

    it('should throw NotFoundError when program not found', async () => {
      req.params = { programId: 'invalid_program' };
      vi.mocked(prisma.program.findUnique).mockResolvedValue(null);

      await getProgramByProgramId(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should handle errors and call next', async () => {
      req.params = { programId: 'computer_science_major' };
      const error = new Error('Database error');
      vi.mocked(prisma.program.findUnique).mockRejectedValue(error);

      await getProgramByProgramId(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
