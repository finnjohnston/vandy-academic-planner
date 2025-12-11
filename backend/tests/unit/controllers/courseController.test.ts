import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
} from '../../../src/api/controllers/courseController.js';
import { prisma } from '../../../src/config/prisma.js';
import { insertCourse } from '../../../src/ingestion/operations/course.insert.js';
import { NotFoundError, InternalError } from '../../../src/api/types/error.types.js';

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/ingestion/operations/course.insert.js', () => ({
  insertCourse: vi.fn(),
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('courseController', () => {
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
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getCourses', () => {
    it('should return courses filtered by academicYearId only', async () => {
      req.query = { academicYearId: '1' };

      const mockCourses = [
        {
          id: 1,
          courseId: 'CS-1101',
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: 'Fall, Spring',
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          isCatalogCourse: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses);

      await getCourses(req as Request, res as Response, next);

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: {
          academicYearId: 1,
        },
        orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
        take: 1000,
      });

      expect(res.json).toHaveBeenCalledWith({
        data: [
          {
            id: 1,
            courseId: 'CS-1101',
            academicYearId: 1,
            subjectCode: 'CS',
            courseNumber: '1101',
            title: 'Programming',
            school: 'Engineering',
            creditsMin: 3,
            creditsMax: 3,
            typicallyOffered: 'Fall, Spring',
            description: 'Intro to programming',
            attributes: {},
            requirements: {},
            createdAt: mockCourses[0].createdAt,
            updatedAt: mockCourses[0].updatedAt,
          },
        ],
      });
    });

    it('should return courses filtered by academicYearId and search query', async () => {
      req.query = { academicYearId: '1', q: 'CS 1101' };

      const mockCourses = [
        {
          id: 1,
          courseId: 'CS-1101',
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: 'Fall, Spring',
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          isCatalogCourse: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses);

      await getCourses(req as Request, res as Response, next);

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: {
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
        },
        orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
        take: 1000,
      });

      expect(res.json).toHaveBeenCalled();
    });

    it('should return empty array when no courses found', async () => {
      req.query = { academicYearId: '999' };

      vi.mocked(prisma.course.findMany).mockResolvedValue([]);

      await getCourses(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        data: [],
      });
    });

    it('should call next with error on database failure', async () => {
      req.query = { academicYearId: '1' };

      const error = new Error('Database error');
      vi.mocked(prisma.course.findMany).mockRejectedValue(error);

      await getCourses(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getCourseById', () => {
    it('should return course by id', async () => {
      req.params = { id: '1' };

      const mockCourse = {
        id: 1,
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: 'Fall, Spring',
        description: 'Intro to programming',
        attributes: {},
        requirements: {},
        isCatalogCourse: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.course.findUnique).mockResolvedValue(mockCourse);

      await getCourseById(req as Request, res as Response, next);

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          courseId: 'CS-1101',
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: 'Fall, Spring',
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: mockCourse.createdAt,
          updatedAt: mockCourse.updatedAt,
        },
      });
    });

    it('should call next with NotFoundError when course not found', async () => {
      req.params = { id: '999' };

      vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

      await getCourseById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should call next with error on database failure', async () => {
      req.params = { id: '1' };

      const error = new Error('Database error');
      vi.mocked(prisma.course.findUnique).mockRejectedValue(error);

      await getCourseById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      req.body = {
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: 'Fall, Spring',
        description: 'Intro to programming',
      };

      const mockCourse = {
        id: 1,
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: 'Fall, Spring',
        description: 'Intro to programming',
        attributes: {},
        requirements: {},
        isCatalogCourse: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(insertCourse).mockResolvedValue({
        success: true,
        data: mockCourse,
      } as any);

      await createCourse(req as Request, res as Response, next);

      expect(insertCourse).toHaveBeenCalledWith(req.body);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          courseId: 'CS-1101',
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: 'Fall, Spring',
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: mockCourse.createdAt,
          updatedAt: mockCourse.updatedAt,
        },
      });
    });

    it('should call next with InternalError when insertCourse fails', async () => {
      req.body = {
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        creditsMin: 3,
        creditsMax: 3,
      };

      vi.mocked(insertCourse).mockResolvedValue({
        success: false,
        error: {
          message: 'Failed to insert course',
          code: 'DUPLICATE_COURSE',
          details: {},
        },
      } as any);

      await createCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(InternalError));
    });

    it('should call next with error on unexpected failure', async () => {
      req.body = {
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        creditsMin: 3,
        creditsMax: 3,
      };

      const error = new Error('Unexpected error');
      vi.mocked(insertCourse).mockRejectedValue(error);

      await createCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        title: 'Updated Programming',
        description: 'Updated description',
      };

      const mockCourse = {
        id: 1,
        courseId: 'CS-1101',
        academicYearId: 1,
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Updated Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        typicallyOffered: 'Fall, Spring',
        description: 'Updated description',
        attributes: {},
        requirements: {},
        isCatalogCourse: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.course.update).mockResolvedValue(mockCourse);

      await updateCourse(req as Request, res as Response, next);

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: req.body,
      });

      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          courseId: 'CS-1101',
          academicYearId: 1,
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Updated Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          typicallyOffered: 'Fall, Spring',
          description: 'Updated description',
          attributes: {},
          requirements: {},
          createdAt: mockCourse.createdAt,
          updatedAt: mockCourse.updatedAt,
        },
      });
    });

    it('should call next with NotFoundError when course not found', async () => {
      req.params = { id: '999' };
      req.body = { title: 'Updated Programming' };

      const error = new Error('Record to update not found');
      vi.mocked(prisma.course.update).mockRejectedValue(error);

      await updateCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should call next with error on database failure', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Programming' };

      const error = new Error('Database error');
      vi.mocked(prisma.course.update).mockRejectedValue(error);

      await updateCourse(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
