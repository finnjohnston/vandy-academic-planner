import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getPlanPrograms,
  addPlanProgram,
  deletePlanProgram,
} from '../../../src/api/controllers/planProgramController.js';
import { prisma } from '../../../src/config/prisma.js';
import { NotFoundError } from '../../../src/api/types/error.types.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    planProgram: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    program: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('planProgramController', () => {
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

  const mockPlan = {
    id: 1,
    name: 'My Plan',
    schoolId: 1,
    academicYearId: 869,
    currentSemester: 0,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPlanProgram = {
    id: 1,
    planId: 1,
    programId: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    program: mockProgram,
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
      send: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getPlanPrograms', () => {
    it('should return all programs for a plan', async () => {
      req.params = { planId: '1' };
      const mockPlanPrograms = [mockPlanProgram];
      vi.mocked(prisma.planProgram.findMany).mockResolvedValue(
        mockPlanPrograms
      );

      await getPlanPrograms(req as Request, res as Response, next);

      expect(prisma.planProgram.findMany).toHaveBeenCalledWith({
        where: { planId: 1 },
        include: {
          program: {
            include: {
              academicYear: true,
              school: true,
            },
          },
        },
        orderBy: [{ program: { type: 'asc' } }, { createdAt: 'asc' }],
      });
      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockPlanProgram.id,
            planId: mockPlanProgram.planId,
            programId: mockPlanProgram.programId,
            program: expect.objectContaining({
              id: mockProgram.id,
              name: mockProgram.name,
            }),
          }),
        ]),
      });
    });

    it('should return empty array when no programs linked', async () => {
      req.params = { planId: '1' };
      vi.mocked(prisma.planProgram.findMany).mockResolvedValue([]);

      await getPlanPrograms(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should handle errors and call next', async () => {
      req.params = { planId: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.planProgram.findMany).mockRejectedValue(error);

      await getPlanPrograms(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addPlanProgram', () => {
    it('should successfully link a program to a plan', async () => {
      req.params = { planId: '1' };
      req.body = { programId: 1 };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.program.findUnique).mockResolvedValue(mockProgram);
      vi.mocked(prisma.planProgram.create).mockResolvedValue(mockPlanProgram);

      await addPlanProgram(req as Request, res as Response, next);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.program.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          academicYear: true,
          school: true,
        },
      });
      expect(prisma.planProgram.create).toHaveBeenCalledWith({
        data: {
          planId: 1,
          programId: 1,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockPlanProgram.id,
          planId: mockPlanProgram.planId,
          programId: mockPlanProgram.programId,
        }),
      });
    });

    it('should throw NotFoundError when plan not found', async () => {
      req.params = { planId: '999' };
      req.body = { programId: 1 };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(null);

      await addPlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
        })
      );
    });

    it('should throw NotFoundError when program not found', async () => {
      req.params = { planId: '1' };
      req.body = { programId: 999 };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.program.findUnique).mockResolvedValue(null);

      await addPlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Program not found',
        })
      );
    });

    it('should handle duplicate errors (unique constraint violation)', async () => {
      req.params = { planId: '1' };
      req.body = { programId: 1 };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.program.findUnique).mockResolvedValue(mockProgram);
      const duplicateError = new Error('Unique constraint violation');
      (duplicateError as any).code = 'P2002';
      vi.mocked(prisma.planProgram.create).mockRejectedValue(duplicateError);

      await addPlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(duplicateError);
    });

    it('should handle errors and call next', async () => {
      req.params = { planId: '1' };
      req.body = { programId: 1 };

      const error = new Error('Database error');
      vi.mocked(prisma.plan.findUnique).mockRejectedValue(error);

      await addPlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deletePlanProgram', () => {
    it('should successfully delete a plan-program association', async () => {
      req.params = { planId: '1', id: '1' };

      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(
        mockPlanProgram
      );
      vi.mocked(prisma.planProgram.delete).mockResolvedValue(mockPlanProgram);

      await deletePlanProgram(req as Request, res as Response, next);

      expect(prisma.planProgram.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.planProgram.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should throw NotFoundError when association not found', async () => {
      req.params = { planId: '1', id: '999' };

      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(null);

      await deletePlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Program association not found',
        })
      );
    });

    it('should throw NotFoundError when association belongs to different plan (security check)', async () => {
      req.params = { planId: '2', id: '1' };

      const wrongPlanProgram = { ...mockPlanProgram, planId: 1 };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(
        wrongPlanProgram
      );

      await deletePlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Program association not found',
        })
      );
    });

    it('should handle errors and call next', async () => {
      req.params = { planId: '1', id: '1' };

      const error = new Error('Database error');
      vi.mocked(prisma.planProgram.findUnique).mockRejectedValue(error);

      await deletePlanProgram(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
