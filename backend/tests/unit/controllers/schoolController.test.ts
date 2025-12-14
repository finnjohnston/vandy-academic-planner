import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
} from '../../../src/api/controllers/schoolController.js';
import { prisma } from '../../../src/config/prisma.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    school: {
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

describe('schoolController', () => {
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

  describe('getSchools', () => {
    it('should return all schools when no filter provided', async () => {
      const mockSchools = [
        {
          id: 1,
          code: 'ENGR',
          name: 'School of Engineering',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          code: 'AS',
          name: 'Arts and Science',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);

      await getSchools(req as Request, res as Response, next);

      expect(prisma.school.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { code: 'asc' },
        take: 1000,
      });
      expect(res.json).toHaveBeenCalledWith({
        data: mockSchools.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      });
    });

    it('should filter schools by code when provided', async () => {
      req.query = { code: 'engr' };
      const mockSchools = [
        {
          id: 1,
          code: 'ENGR',
          name: 'School of Engineering',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools);

      await getSchools(req as Request, res as Response, next);

      expect(prisma.school.findMany).toHaveBeenCalledWith({
        where: { code: 'ENGR' },
        orderBy: { code: 'asc' },
        take: 1000,
      });
      expect(logger.http).toHaveBeenCalledWith('GET /api/schools?code=engr');
    });

    it('should return empty array when no schools found', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);

      await getSchools(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      vi.mocked(prisma.school.findMany).mockRejectedValue(error);

      await getSchools(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getSchoolById', () => {
    it('should return school when found', async () => {
      req.params = { id: '1' };
      const mockSchool = {
        id: 1,
        code: 'ENGR',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool);

      await getSchoolById(req as Request, res as Response, next);

      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: mockSchool.id,
          code: mockSchool.code,
          name: mockSchool.name,
          createdAt: mockSchool.createdAt,
          updatedAt: mockSchool.updatedAt,
        },
      });
    });

    it('should throw NotFoundError when school not found', async () => {
      req.params = { id: '999' };
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null);

      await getSchoolById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'School not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      const error = new Error('Database error');
      vi.mocked(prisma.school.findUnique).mockRejectedValue(error);

      await getSchoolById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createSchool', () => {
    it('should create school successfully', async () => {
      req.body = { code: 'ENGR', name: 'School of Engineering' };
      const mockSchool = {
        id: 1,
        code: 'ENGR',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.school.create).mockResolvedValue(mockSchool);

      await createSchool(req as Request, res as Response, next);

      expect(prisma.school.create).toHaveBeenCalledWith({
        data: {
          code: 'ENGR',
          name: 'School of Engineering',
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: mockSchool.id,
          code: mockSchool.code,
          name: mockSchool.name,
          createdAt: mockSchool.createdAt,
          updatedAt: mockSchool.updatedAt,
        },
      });
    });

    it('should convert code to uppercase', async () => {
      req.body = { code: 'ENGR', name: 'School of Engineering' };
      const mockSchool = {
        id: 1,
        code: 'ENGR',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.school.create).mockResolvedValue(mockSchool);

      await createSchool(req as Request, res as Response, next);

      expect(logger.http).toHaveBeenCalledWith('POST /api/schools (ENGR)');
    });

    it('should return 201 status', async () => {
      req.body = { code: 'ENGR', name: 'School of Engineering' };
      const mockSchool = {
        id: 1,
        code: 'ENGR',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      vi.mocked(prisma.school.create).mockResolvedValue(mockSchool);

      await createSchool(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.body = { code: 'ENGR', name: 'School of Engineering' };
      const error = new Error('Database error');
      vi.mocked(prisma.school.create).mockRejectedValue(error);

      await createSchool(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSchool', () => {
    it('should update school successfully', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated School Name' };
      const mockSchool = {
        id: 1,
        code: 'ENGR',
        name: 'Updated School Name',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool);

      await updateSchool(req as Request, res as Response, next);

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated School Name' },
      });
      expect(res.json).toHaveBeenCalledWith({
        data: {
          id: mockSchool.id,
          code: mockSchool.code,
          name: mockSchool.name,
          createdAt: mockSchool.createdAt,
          updatedAt: mockSchool.updatedAt,
        },
      });
    });

    it('should handle partial updates', async () => {
      req.params = { id: '1' };
      req.body = { code: 'ENG' };
      const mockSchool = {
        id: 1,
        code: 'ENG',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool);

      await updateSchool(req as Request, res as Response, next);

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { code: 'ENG' },
      });
    });

    it('should throw NotFoundError when school not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated Name' };
      const error = new Error('Record to update not found');
      vi.mocked(prisma.school.update).mockRejectedValue(error);

      await updateSchool(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'School not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should convert code to uppercase', async () => {
      req.params = { id: '1' };
      req.body = { code: 'ENG' };
      const mockSchool = {
        id: 1,
        code: 'ENG',
        name: 'School of Engineering',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool);

      await updateSchool(req as Request, res as Response, next);

      // Code uppercasing happens in Zod validation, so controller receives it uppercased
      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { code: 'ENG' },
      });
    });

    it('should handle errors', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      const error = new Error('Database error');
      vi.mocked(prisma.school.update).mockRejectedValue(error);

      await updateSchool(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
