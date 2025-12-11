import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
} from '../../../src/api/controllers/classController.js';
import { prisma } from '../../../src/config/prisma.js';
import { NotFoundError } from '../../../src/api/types/error.types.js';

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    class: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('classController', () => {
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

  describe('getClasses', () => {
    it('should return classes filtered by termId only', async () => {
      req.query = { termId: '1060' };

      const mockClasses = [
        {
          id: 1,
          classId: 'CS-1101-1060',
          termId: '1060',
          courseId: 'CS-1101',
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.class.findMany).mockResolvedValue(mockClasses);

      await getClasses(req as Request, res as Response, next);

      expect(prisma.class.findMany).toHaveBeenCalledWith({
        where: {
          termId: '1060',
        },
        orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
        take: 1000,
      });

      expect(res.json).toHaveBeenCalledWith({
        data: [
          {
            id: 1,
            classId: 'CS-1101-1060',
            termId: '1060',
            courseId: 'CS-1101',
            subjectCode: 'CS',
            courseNumber: '1101',
            title: 'Programming',
            school: 'Engineering',
            creditsMin: 3,
            creditsMax: 3,
            description: 'Intro to programming',
            attributes: {},
            requirements: {},
            createdAt: mockClasses[0].createdAt,
            updatedAt: mockClasses[0].updatedAt,
          },
        ],
      });
    });

    it('should return classes filtered by termId and search query', async () => {
      req.query = { termId: '1060', q: 'CS 1101' };

      const mockClasses = [
        {
          id: 1,
          classId: 'CS-1101-1060',
          termId: '1060',
          courseId: 'CS-1101',
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.class.findMany).mockResolvedValue(mockClasses);

      await getClasses(req as Request, res as Response, next);

      expect(prisma.class.findMany).toHaveBeenCalledWith({
        where: {
          termId: '1060',
          subjectCode: 'CS',
          courseNumber: '1101',
        },
        orderBy: [{ subjectCode: 'asc' }, { courseNumber: 'asc' }],
        take: 1000,
      });

      expect(res.json).toHaveBeenCalled();
    });

    it('should return empty array when no classes found', async () => {
      req.query = { termId: '9999' };

      vi.mocked(prisma.class.findMany).mockResolvedValue([]);

      await getClasses(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        data: [],
      });
    });

    it('should call next with error on database failure', async () => {
      req.query = { termId: '1060' };

      const error = new Error('Database error');
      vi.mocked(prisma.class.findMany).mockRejectedValue(error);

      await getClasses(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getClassById', () => {
    it('should return class by id', async () => {
      req.params = { id: '1' };

      const mockClass = {
        id: 1,
        classId: 'CS-1101-1060',
        termId: '1060',
        courseId: 'CS-1101',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        description: 'Intro to programming',
        attributes: {},
        requirements: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.class.findUnique).mockResolvedValue(mockClass);

      await getClassById(req as Request, res as Response, next);

      expect(prisma.class.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          classId: 'CS-1101-1060',
          termId: '1060',
          courseId: 'CS-1101',
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: mockClass.createdAt,
          updatedAt: mockClass.updatedAt,
        },
      });
    });

    it('should call next with NotFoundError when class not found', async () => {
      req.params = { id: '999' };

      vi.mocked(prisma.class.findUnique).mockResolvedValue(null);

      await getClassById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should call next with error on database failure', async () => {
      req.params = { id: '1' };

      const error = new Error('Database error');
      vi.mocked(prisma.class.findUnique).mockRejectedValue(error);

      await getClassById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createClass', () => {
    it('should create class successfully', async () => {
      req.body = {
        termId: '1060',
        courseId: 'CS-1101',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        description: 'Intro to programming',
      };

      const mockClass = {
        id: 1,
        classId: 'CS-1101-1060',
        termId: '1060',
        courseId: 'CS-1101',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        description: 'Intro to programming',
        attributes: {},
        requirements: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.class.create).mockResolvedValue(mockClass);

      await createClass(req as Request, res as Response, next);

      expect(prisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            termId: '1060',
            courseId: 'CS-1101',
            subjectCode: 'CS',
            courseNumber: '1101',
            title: 'Programming',
            school: 'Engineering',
            creditsMin: 3,
            creditsMax: 3,
            description: 'Intro to programming',
          }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          classId: 'CS-1101-1060',
          termId: '1060',
          courseId: 'CS-1101',
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          description: 'Intro to programming',
          attributes: {},
          requirements: {},
          createdAt: mockClass.createdAt,
          updatedAt: mockClass.updatedAt,
        },
      });
    });

    it('should call next with error on database failure', async () => {
      req.body = {
        termId: '1060',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Programming',
        creditsMin: 3,
        creditsMax: 3,
      };

      const error = new Error('Database error');
      vi.mocked(prisma.class.create).mockRejectedValue(error);

      await createClass(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateClass', () => {
    it('should update class successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        title: 'Updated Programming',
        description: 'Updated description',
      };

      const mockClass = {
        id: 1,
        classId: 'CS-1101-1060',
        termId: '1060',
        courseId: 'CS-1101',
        subjectCode: 'CS',
        courseNumber: '1101',
        title: 'Updated Programming',
        school: 'Engineering',
        creditsMin: 3,
        creditsMax: 3,
        description: 'Updated description',
        attributes: {},
        requirements: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.class.update).mockResolvedValue(mockClass);

      await updateClass(req as Request, res as Response, next);

      expect(prisma.class.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: req.body,
      });

      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: 1,
          classId: 'CS-1101-1060',
          termId: '1060',
          courseId: 'CS-1101',
          subjectCode: 'CS',
          courseNumber: '1101',
          title: 'Updated Programming',
          school: 'Engineering',
          creditsMin: 3,
          creditsMax: 3,
          description: 'Updated description',
          attributes: {},
          requirements: {},
          createdAt: mockClass.createdAt,
          updatedAt: mockClass.updatedAt,
        },
      });
    });

    it('should call next with NotFoundError when class not found', async () => {
      req.params = { id: '999' };
      req.body = { title: 'Updated Programming' };

      const error = new Error('Record to update not found');
      vi.mocked(prisma.class.update).mockRejectedValue(error);

      await updateClass(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should call next with error on database failure', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Programming' };

      const error = new Error('Database error');
      vi.mocked(prisma.class.update).mockRejectedValue(error);

      await updateClass(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
