import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
} from '../../../src/api/controllers/planController.js';
import { prisma } from '../../../src/config/prisma.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    plan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('planController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

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

  describe('getPlans', () => {
    it('should return all plans', async () => {
      const mockPlans = [
        {
          id: 1,
          name: 'Engineering Plan',
          schoolId: 1,
          startingYear: 2024,
          currentSemester: 0,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          name: 'Arts Plan',
          schoolId: 2,
          startingYear: 2024,
          currentSemester: 2,
          isActive: false,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(prisma.plan.findMany).mockResolvedValue(mockPlans);

      await getPlans(req as Request, res as Response, next);

      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      expect(res.json).toHaveBeenCalledWith({
        data: mockPlans.map((p) => ({
          id: p.id,
          name: p.name,
          schoolId: p.schoolId,
          startingYear: p.startingYear,
          currentSemester: p.currentSemester,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    });

    it('should return empty array when no plans found', async () => {
      vi.mocked(prisma.plan.findMany).mockResolvedValue([]);

      await getPlans(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      vi.mocked(prisma.plan.findMany).mockRejectedValue(error);

      await getPlans(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPlanById', () => {
    it('should return plan with planned courses', async () => {
      req.params = { id: '1' };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [
          {
            id: 1,
            planId: 1,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            course: {
              id: 1,
              courseId: 'CS-1101',
              title: 'Intro to Programming',
            },
            class: null,
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);

      await getPlanById(req as Request, res as Response, next);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          plannedCourses: {
            include: {
              course: true,
              class: true,
            },
            orderBy: [{ semesterNumber: 'asc' }, { courseId: 'asc' }],
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 1,
          name: 'Engineering Plan',
          plannedCourses: expect.any(Array),
        }),
      });
    });

    it('should include course and class details', async () => {
      req.params = { id: '1' };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [
          {
            id: 1,
            planId: 1,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            course: { courseId: 'CS-1101', title: 'Intro to Programming' },
            class: null,
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);

      await getPlanById(req as Request, res as Response, next);

      const response = (res.json as any).mock.calls[0][0];
      expect(response.data.plannedCourses[0]).toHaveProperty('course');
      expect(response.data.plannedCourses[0].course).toEqual({
        courseId: 'CS-1101',
        title: 'Intro to Programming',
      });
    });

    it('should throw NotFoundError when plan not found', async () => {
      req.params = { id: '999' };
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(null);

      await getPlanById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.findUnique).mockRejectedValue(error);

      await getPlanById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createPlan', () => {
    it('should create plan successfully', async () => {
      req.body = {
        name: 'Engineering Plan',
        schoolId: 1,
        startingYear: 2024,
      };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.create).mockResolvedValue(mockPlan as any);

      await createPlan(req as Request, res as Response, next);

      expect(prisma.plan.create).toHaveBeenCalledWith({
        data: {
          name: 'Engineering Plan',
          schoolId: 1,
          startingYear: 2024,
          currentSemester: undefined,
          isActive: undefined,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          name: 'Engineering Plan',
          schoolId: 1,
          startingYear: 2024,
          currentSemester: 0,
          isActive: true,
          createdAt: mockPlan.createdAt,
          updatedAt: mockPlan.updatedAt,
        },
      });
    });

    it('should use default values for optional fields', async () => {
      req.body = {
        name: 'Engineering Plan',
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
      };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: null,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.create).mockResolvedValue(mockPlan as any);

      await createPlan(req as Request, res as Response, next);

      expect(logger.http).toHaveBeenCalledWith('POST /api/plans (Engineering Plan)');
    });

    it('should return 201 status', async () => {
      req.body = {
        name: 'Engineering Plan',
        startingYear: 2024,
      };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: null,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.create).mockResolvedValue(mockPlan as any);

      await createPlan(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.body = {
        name: 'Engineering Plan',
        startingYear: 2024,
      };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.create).mockRejectedValue(error);

      await createPlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Plan Name' };
      const mockPlan = {
        id: 1,
        name: 'Updated Plan Name',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.plan.update).mockResolvedValue(mockPlan as any);

      await updatePlan(req as Request, res as Response, next);

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Plan Name' },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          name: 'Updated Plan Name',
          schoolId: 1,
          startingYear: 2024,
          currentSemester: 0,
          isActive: true,
          createdAt: mockPlan.createdAt,
          updatedAt: mockPlan.updatedAt,
        },
      });
    });

    it('should handle partial updates', async () => {
      req.params = { id: '1' };
      req.body = { currentSemester: 3, isActive: false };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 3,
        isActive: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.plan.update).mockResolvedValue(mockPlan as any);

      await updatePlan(req as Request, res as Response, next);

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentSemester: 3, isActive: false },
      });
    });

    it('should allow setting schoolId to null', async () => {
      req.params = { id: '1' };
      req.body = { schoolId: null };
      const mockPlan = {
        id: 1,
        name: 'Engineering Plan',
        schoolId: null,
        startingYear: 2024,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.plan.update).mockResolvedValue(mockPlan as any);

      await updatePlan(req as Request, res as Response, next);

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { schoolId: null },
      });
    });

    it('should throw NotFoundError when plan not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated Name' };
      const error = new Error('Record to update not found');
      vi.mocked(prisma.plan.update).mockRejectedValue(error);

      await updatePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.update).mockRejectedValue(error);

      await updatePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      req.params = { id: '1' };
      vi.mocked(prisma.plan.delete).mockResolvedValue({} as any);

      await deletePlan(req as Request, res as Response, next);

      expect(prisma.plan.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      req.params = { id: '1' };
      vi.mocked(prisma.plan.delete).mockResolvedValue({} as any);

      await deletePlan(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should throw NotFoundError when plan not found', async () => {
      req.params = { id: '999' };
      const error = new Error('Record to delete not found');
      vi.mocked(prisma.plan.delete).mockRejectedValue(error);

      await deletePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.delete).mockRejectedValue(error);

      await deletePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate plan with new name', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };

      const originalPlan = {
        id: 1,
        name: 'Original Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 3,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [
          {
            id: 1,
            planId: 1,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };

      const duplicatedPlan = {
        id: 2,
        name: 'Duplicated Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        plannedCourses: [
          {
            id: 2,
            planId: 2,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(originalPlan as any);
      vi.mocked(prisma.plan.create).mockResolvedValue(duplicatedPlan as any);

      await duplicatePlan(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 2,
          name: 'Duplicated Plan',
        }),
      });
    });

    it('should copy all planned courses', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };

      const originalPlan = {
        id: 1,
        name: 'Original Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 3,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [
          {
            id: 1,
            planId: 1,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: 2,
            planId: 1,
            courseId: 'CS-2201',
            classId: null,
            semesterNumber: 2,
            credits: 3,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };

      const duplicatedPlan = {
        id: 2,
        name: 'Duplicated Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        plannedCourses: [
          {
            id: 3,
            planId: 2,
            courseId: 'CS-1101',
            classId: null,
            semesterNumber: 1,
            credits: 3,
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
          {
            id: 4,
            planId: 2,
            courseId: 'CS-2201',
            classId: null,
            semesterNumber: 2,
            credits: 3,
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(originalPlan as any);
      vi.mocked(prisma.plan.create).mockResolvedValue(duplicatedPlan as any);

      await duplicatePlan(req as Request, res as Response, next);

      expect(prisma.plan.create).toHaveBeenCalledWith({
        data: {
          name: 'Duplicated Plan',
          schoolId: 1,
          startingYear: 2024,
          currentSemester: 0,
          isActive: false,
          plannedCourses: {
            create: [
              {
                courseId: 'CS-1101',
                classId: null,
                semesterNumber: 1,
                credits: 3,
              },
              {
                courseId: 'CS-2201',
                classId: null,
                semesterNumber: 2,
                credits: 3,
              },
            ],
          },
        },
        include: {
          plannedCourses: true,
        },
      });
    });

    it('should reset currentSemester to 0', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };

      const originalPlan = {
        id: 1,
        name: 'Original Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 5,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [],
      };

      const duplicatedPlan = {
        id: 2,
        name: 'Duplicated Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        plannedCourses: [],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(originalPlan as any);
      vi.mocked(prisma.plan.create).mockResolvedValue(duplicatedPlan as any);

      await duplicatePlan(req as Request, res as Response, next);

      expect(prisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentSemester: 0,
          }),
        })
      );
    });

    it('should set isActive to false', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };

      const originalPlan = {
        id: 1,
        name: 'Original Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 3,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [],
      };

      const duplicatedPlan = {
        id: 2,
        name: 'Duplicated Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        plannedCourses: [],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(originalPlan as any);
      vi.mocked(prisma.plan.create).mockResolvedValue(duplicatedPlan as any);

      await duplicatePlan(req as Request, res as Response, next);

      expect(prisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });

    it('should return 201 status', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };

      const originalPlan = {
        id: 1,
        name: 'Original Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 3,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        plannedCourses: [],
      };

      const duplicatedPlan = {
        id: 2,
        name: 'Duplicated Plan',
        schoolId: 1,
        startingYear: 2024,
        currentSemester: 0,
        isActive: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        plannedCourses: [],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(originalPlan as any);
      vi.mocked(prisma.plan.create).mockResolvedValue(duplicatedPlan as any);

      await duplicatePlan(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should throw NotFoundError when original plan not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Duplicated Plan' };
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(null);

      await duplicatePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Duplicated Plan' };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.findUnique).mockRejectedValue(error);

      await duplicatePlan(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
