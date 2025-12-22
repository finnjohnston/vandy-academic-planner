import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { getPlanProgramFulfillments } from '../../../src/api/controllers/fulfillmentController.js';
import { prisma } from '../../../src/config/prisma.js';
import { NotFoundError } from '../../../src/api/types/error.types.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    planProgram: {
      findUnique: vi.fn(),
    },
    requirementFulfillment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('fulfillmentController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockPlanProgram = {
    id: 1,
    planId: 1,
    programId: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFulfillments = [
    {
      id: 1,
      planProgramId: 1,
      requirementId: 'cs_core.cs_intro',
      plannedCourseId: 1,
      creditsApplied: 3,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      plannedCourse: {
        id: 1,
        planId: 1,
        courseId: 'CS 1101',
        classId: null,
        semesterNumber: 1,
        position: 0,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: {
          id: 1,
          courseId: 'CS 1101',
          academicYearId: 869,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming and Problem Solving',
          school: 'School of Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
          isCatalogCourse: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    },
    {
      id: 2,
      planProgramId: 1,
      requirementId: 'general.calculus',
      plannedCourseId: 2,
      creditsApplied: 4,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      plannedCourse: {
        id: 2,
        planId: 1,
        courseId: 'MATH 1300',
        classId: null,
        semesterNumber: 1,
        position: 1,
        credits: 4,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: {
          id: 2,
          courseId: 'MATH 1300',
          academicYearId: 869,
          subjectCode: 'MATH',
          courseNumber: '1300',
          title: 'Differential Calculus',
          school: 'School of Engineering',
          creditsMin: 4,
          creditsMax: 4,
          typicallyOffered: null,
          description: null,
          attributes: null,
          requirements: null,
          isCatalogCourse: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    },
  ];

  beforeEach(() => {
    req = {
      params: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getPlanProgramFulfillments', () => {
    it('should return fulfillments with course details successfully', async () => {
      req.params = { planId: '1', planProgramId: '1' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(mockPlanProgram as any);
      vi.mocked(prisma.requirementFulfillment.findMany).mockResolvedValue(mockFulfillments as any);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(prisma.planProgram.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.requirementFulfillment.findMany).toHaveBeenCalledWith({
        where: { planProgramId: 1 },
        include: {
          plannedCourse: {
            include: {
              course: true,
            },
          },
        },
        orderBy: {
          requirementId: 'asc',
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: [
          {
            id: 1,
            planProgramId: 1,
            requirementId: 'cs_core.cs_intro',
            plannedCourseId: 1,
            creditsApplied: 3,
            createdAt: mockFulfillments[0].createdAt,
            updatedAt: mockFulfillments[0].updatedAt,
            course: {
              id: 1,
              courseId: 'CS 1101',
              title: 'Programming and Problem Solving',
              credits: 3, // Credits from plannedCourse
            },
          },
          {
            id: 2,
            planProgramId: 1,
            requirementId: 'general.calculus',
            plannedCourseId: 2,
            creditsApplied: 4,
            createdAt: mockFulfillments[1].createdAt,
            updatedAt: mockFulfillments[1].updatedAt,
            course: {
              id: 2,
              courseId: 'MATH 1300',
              title: 'Differential Calculus',
              credits: 4, // Credits from plannedCourse
            },
          },
        ],
      });
      expect(logger.http).toHaveBeenCalledWith('GET /api/plans/1/programs/1/fulfillments');
    });

    it('should return empty array when no fulfillments exist', async () => {
      req.params = { planId: '1', planProgramId: '1' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(mockPlanProgram as any);
      vi.mocked(prisma.requirementFulfillment.findMany).mockResolvedValue([]);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when planProgram does not exist', async () => {
      req.params = { planId: '1', planProgramId: '999' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(null);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Program association not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
      expect(prisma.requirementFulfillment.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when planProgram belongs to different plan (security check)', async () => {
      req.params = { planId: '1', planProgramId: '1' };
      const differentPlanProgram = {
        ...mockPlanProgram,
        planId: 2, // Different plan ID
      };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(differentPlanProgram as any);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Program association not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
      expect(prisma.requirementFulfillment.findMany).not.toHaveBeenCalled();
    });

    it('should handle database error on planProgram lookup', async () => {
      req.params = { planId: '1', planProgramId: '1' };
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.planProgram.findUnique).mockRejectedValue(dbError);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(prisma.requirementFulfillment.findMany).not.toHaveBeenCalled();
    });

    it('should handle database error on fulfillments lookup', async () => {
      req.params = { planId: '1', planProgramId: '1' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(mockPlanProgram as any);
      const dbError = new Error('Database query failed');
      vi.mocked(prisma.requirementFulfillment.findMany).mockRejectedValue(dbError);

      await getPlanProgramFulfillments(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
