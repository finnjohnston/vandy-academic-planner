import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getPlannedCourses,
  getPlannedCourseById,
  addPlannedCourse,
  updatePlannedCourse,
  deletePlannedCourse,
} from '../../../src/api/controllers/plannedCourseController.js';
import { prisma } from '../../../src/config/prisma.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    plannedCourse: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('plannedCourseController', () => {
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

  describe('getPlannedCourses', () => {
    it('should return all courses in plan', async () => {
      req.params = { planId: '1' };
      const mockPlannedCourses = [
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
            courseId: 'CS-1101',
            title: 'Intro to Programming',
          },
          class: null,
        },
        {
          id: 2,
          planId: 1,
          courseId: 'MATH-1200',
          classId: null,
          semesterNumber: 1,
          credits: 4,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          course: {
            courseId: 'MATH-1200',
            title: 'Calculus I',
          },
          class: null,
        },
      ];

      vi.mocked(prisma.plannedCourse.findMany).mockResolvedValue(
        mockPlannedCourses
      );

      await getPlannedCourses(req as Request, res as Response, next);

      expect(prisma.plannedCourse.findMany).toHaveBeenCalledWith({
        where: { planId: 1 },
        include: { course: true, class: true },
        orderBy: [{ semesterNumber: 'asc' }, { courseId: 'asc' }],
      });
      expect(res.json).toHaveBeenCalledWith({
        data: mockPlannedCourses.map((pc) => ({
          id: pc.id,
          planId: pc.planId,
          courseId: pc.courseId,
          classId: pc.classId,
          semesterNumber: pc.semesterNumber,
          credits: pc.credits,
          createdAt: pc.createdAt,
          updatedAt: pc.updatedAt,
          course: pc.course,
          class: pc.class,
        })),
      });
    });

    it('should filter by semesterNumber when provided', async () => {
      req.params = { planId: '1' };
      req.query = { semesterNumber: '2' };
      const mockPlannedCourses = [
        {
          id: 3,
          planId: 1,
          courseId: 'CS-2201',
          classId: null,
          semesterNumber: 2,
          credits: 3,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          course: {
            courseId: 'CS-2201',
            title: 'Data Structures',
          },
          class: null,
        },
      ];

      vi.mocked(prisma.plannedCourse.findMany).mockResolvedValue(
        mockPlannedCourses
      );

      await getPlannedCourses(req as Request, res as Response, next);

      expect(prisma.plannedCourse.findMany).toHaveBeenCalledWith({
        where: { planId: 1, semesterNumber: 2 },
        include: { course: true, class: true },
        orderBy: [{ semesterNumber: 'asc' }, { courseId: 'asc' }],
      });
      expect(logger.http).toHaveBeenCalledWith(
        'GET /api/plans/1/courses?semesterNumber=2'
      );
    });

    it('should include course and class details', async () => {
      req.params = { planId: '1' };
      const mockPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: 'CS-1101-001',
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: {
          courseId: 'CS-1101',
          title: 'Intro to Programming',
        },
        class: {
          classId: 'CS-1101-001',
          courseId: 'CS-1101',
        },
      };

      vi.mocked(prisma.plannedCourse.findMany).mockResolvedValue([
        mockPlannedCourse,
      ]);

      await getPlannedCourses(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          {
            id: mockPlannedCourse.id,
            planId: mockPlannedCourse.planId,
            courseId: mockPlannedCourse.courseId,
            classId: mockPlannedCourse.classId,
            semesterNumber: mockPlannedCourse.semesterNumber,
            credits: mockPlannedCourse.credits,
            createdAt: mockPlannedCourse.createdAt,
            updatedAt: mockPlannedCourse.updatedAt,
            course: mockPlannedCourse.course,
            class: mockPlannedCourse.class,
          },
        ],
      });
    });

    it('should return empty array when no courses in plan', async () => {
      req.params = { planId: '1' };
      vi.mocked(prisma.plannedCourse.findMany).mockResolvedValue([]);

      await getPlannedCourses(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should handle errors', async () => {
      req.params = { planId: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.plannedCourse.findMany).mockRejectedValue(error);

      await getPlannedCourses(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPlannedCourseById', () => {
    it('should return planned course when found', async () => {
      req.params = { planId: '1', id: '1' };
      const mockPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: {
          courseId: 'CS-1101',
          title: 'Intro to Programming',
        },
        class: null,
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        mockPlannedCourse
      );

      await getPlannedCourseById(req as Request, res as Response, next);

      expect(prisma.plannedCourse.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { course: true, class: true },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: mockPlannedCourse.id,
          planId: mockPlannedCourse.planId,
          courseId: mockPlannedCourse.courseId,
          classId: mockPlannedCourse.classId,
          semesterNumber: mockPlannedCourse.semesterNumber,
          credits: mockPlannedCourse.credits,
          createdAt: mockPlannedCourse.createdAt,
          updatedAt: mockPlannedCourse.updatedAt,
          course: mockPlannedCourse.course,
          class: mockPlannedCourse.class,
        },
      });
    });

    it('should throw NotFoundError when not found', async () => {
      req.params = { planId: '1', id: '999' };
      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(null);

      await getPlannedCourseById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should throw NotFoundError when planId mismatch', async () => {
      req.params = { planId: '1', id: '1' };
      const mockPlannedCourse = {
        id: 1,
        planId: 2, // Different plan ID
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: null,
        class: null,
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        mockPlannedCourse
      );

      await getPlannedCourseById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should include course and class details', async () => {
      req.params = { planId: '1', id: '1' };
      const mockPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: 'CS-1101-001',
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        course: {
          courseId: 'CS-1101',
          title: 'Intro to Programming',
        },
        class: {
          classId: 'CS-1101-001',
          courseId: 'CS-1101',
        },
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        mockPlannedCourse
      );

      await getPlannedCourseById(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          course: mockPlannedCourse.course,
          class: mockPlannedCourse.class,
        }),
      });
    });

    it('should handle errors', async () => {
      req.params = { planId: '1', id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.plannedCourse.findUnique).mockRejectedValue(error);

      await getPlannedCourseById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addPlannedCourse', () => {
    it('should add course to plan successfully', async () => {
      req.params = { planId: '1' };
      req.body = {
        courseId: 'CS-1101',
        semesterNumber: 1,
        credits: 3,
      };
      const mockPlan = {
        id: 1,
        name: 'My Plan',
        schoolId: null,
        academicYearId: 1,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const mockPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.plannedCourse.create).mockResolvedValue(
        mockPlannedCourse
      );

      await addPlannedCourse(req as Request, res as Response, next);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.plannedCourse.create).toHaveBeenCalledWith({
        data: {
          planId: 1,
          courseId: 'CS-1101',
          classId: undefined,
          semesterNumber: 1,
          credits: 3,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: mockPlannedCourse.id,
          planId: mockPlannedCourse.planId,
          courseId: mockPlannedCourse.courseId,
          classId: mockPlannedCourse.classId,
          semesterNumber: mockPlannedCourse.semesterNumber,
          credits: mockPlannedCourse.credits,
          createdAt: mockPlannedCourse.createdAt,
          updatedAt: mockPlannedCourse.updatedAt,
        },
      });
    });

    it('should verify plan exists before adding', async () => {
      req.params = { planId: '1' };
      req.body = {
        courseId: 'CS-1101',
        semesterNumber: 1,
        credits: 3,
      };
      const mockPlan = {
        id: 1,
        name: 'My Plan',
        schoolId: null,
        academicYearId: 1,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.plannedCourse.create).mockResolvedValue({
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      await addPlannedCourse(req as Request, res as Response, next);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError when plan not found', async () => {
      req.params = { planId: '999' };
      req.body = {
        courseId: 'CS-1101',
        semesterNumber: 1,
        credits: 3,
      };
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(null);

      await addPlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plan not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should return 201 status', async () => {
      req.params = { planId: '1' };
      req.body = {
        courseId: 'CS-1101',
        semesterNumber: 1,
        credits: 3,
      };
      const mockPlan = {
        id: 1,
        name: 'My Plan',
        schoolId: null,
        academicYearId: 1,
        currentSemester: 0,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const mockPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan);
      vi.mocked(prisma.plannedCourse.create).mockResolvedValue(
        mockPlannedCourse
      );

      await addPlannedCourse(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.params = { planId: '1' };
      req.body = {
        courseId: 'CS-1101',
        semesterNumber: 1,
        credits: 3,
      };
      const error = new Error('Database error');
      vi.mocked(prisma.plan.findUnique).mockRejectedValue(error);

      await addPlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updatePlannedCourse', () => {
    it('should update planned course successfully', async () => {
      req.params = { planId: '1', id: '1' };
      req.body = { semesterNumber: 2 };
      const existingPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedPlannedCourse = {
        ...existingPlannedCourse,
        semesterNumber: 2,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );
      vi.mocked(prisma.plannedCourse.update).mockResolvedValue(
        updatedPlannedCourse
      );

      await updatePlannedCourse(req as Request, res as Response, next);

      expect(prisma.plannedCourse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { semesterNumber: 2 },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: updatedPlannedCourse.id,
          planId: updatedPlannedCourse.planId,
          courseId: updatedPlannedCourse.courseId,
          classId: updatedPlannedCourse.classId,
          semesterNumber: updatedPlannedCourse.semesterNumber,
          credits: updatedPlannedCourse.credits,
          createdAt: updatedPlannedCourse.createdAt,
          updatedAt: updatedPlannedCourse.updatedAt,
        },
      });
    });

    it('should handle partial updates', async () => {
      req.params = { planId: '1', id: '1' };
      req.body = { credits: 4 };
      const existingPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedPlannedCourse = {
        ...existingPlannedCourse,
        credits: 4,
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );
      vi.mocked(prisma.plannedCourse.update).mockResolvedValue(
        updatedPlannedCourse
      );

      await updatePlannedCourse(req as Request, res as Response, next);

      expect(prisma.plannedCourse.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { credits: 4 },
      });
    });

    it('should throw NotFoundError when not found', async () => {
      req.params = { planId: '1', id: '999' };
      req.body = { semesterNumber: 2 };
      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(null);

      await updatePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should throw NotFoundError when planId mismatch', async () => {
      req.params = { planId: '1', id: '1' };
      req.body = { semesterNumber: 2 };
      const existingPlannedCourse = {
        id: 1,
        planId: 2, // Different plan ID
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );

      await updatePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { planId: '1', id: '1' };
      req.body = { semesterNumber: 2 };
      const error = new Error('Database error');
      vi.mocked(prisma.plannedCourse.findUnique).mockRejectedValue(error);

      await updatePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deletePlannedCourse', () => {
    it('should delete planned course successfully', async () => {
      req.params = { planId: '1', id: '1' };
      const existingPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );
      vi.mocked(prisma.plannedCourse.delete).mockResolvedValue(
        existingPlannedCourse
      );

      await deletePlannedCourse(req as Request, res as Response, next);

      expect(prisma.plannedCourse.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      req.params = { planId: '1', id: '1' };
      const existingPlannedCourse = {
        id: 1,
        planId: 1,
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );
      vi.mocked(prisma.plannedCourse.delete).mockResolvedValue(
        existingPlannedCourse
      );

      await deletePlannedCourse(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should throw NotFoundError when not found', async () => {
      req.params = { planId: '1', id: '999' };
      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(null);

      await deletePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should throw NotFoundError when planId mismatch', async () => {
      req.params = { planId: '1', id: '1' };
      const existingPlannedCourse = {
        id: 1,
        planId: 2, // Different plan ID
        courseId: 'CS-1101',
        classId: null,
        semesterNumber: 1,
        credits: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.plannedCourse.findUnique).mockResolvedValue(
        existingPlannedCourse
      );

      await deletePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Planned course not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { planId: '1', id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.plannedCourse.findUnique).mockRejectedValue(error);

      await deletePlannedCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
