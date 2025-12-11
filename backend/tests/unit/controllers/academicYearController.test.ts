/**
 * Unit tests for Academic Year Controller
 * Tests all 5 CRUD operations with mocked service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AcademicYear } from '@prisma/client';
import {
  getAcademicYears,
  getCurrentAcademicYear,
  getAcademicYearById,
  createAcademicYear,
  setCurrentAcademicYear,
} from '../../../src/api/controllers/academicYearController.js';
import * as academicYearService from '../../../src/ingestion/pipelines/services/academicYear.service.js';

// Mock the service layer
vi.mock('../../../src/ingestion/pipelines/services/academicYear.service.js');

describe('Academic Year Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  // Sample academic year data
  const mockAcademicYear: AcademicYear = {
    id: 1,
    year: '2024-2025',
    start: 2024,
    end: 2025,
    isCurrent: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAcademicYear2: AcademicYear = {
    id: 2,
    year: '2023-2024',
    start: 2023,
    end: 2024,
    isCurrent: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock request/response
    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('getAcademicYears', () => {
    it('should return all academic years on success', async () => {
      // Arrange
      const mockData = [mockAcademicYear, mockAcademicYear2];
      vi.mocked(academicYearService.getAllAcademicYears).mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Act
      await getAcademicYears(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(academicYearService.getAllAcademicYears).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array when no academic years exist', async () => {
      // Arrange
      vi.mocked(academicYearService.getAllAcademicYears).mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await getAcademicYears(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: [],
      });
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      vi.mocked(academicYearService.getAllAcademicYears).mockResolvedValue({
        success: false,
        error: {
          message: 'Database connection failed',
          code: 'ACADEMIC_YEAR_GET_FAILED',
        },
      });

      // Act
      await getAcademicYears(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed',
          statusCode: 500,
          code: 'INTERNAL_ERROR',
        })
      );
    });

    it('should call next with error on unexpected exception', async () => {
      // Arrange
      const error = new Error('Unexpected error');
      vi.mocked(academicYearService.getAllAcademicYears).mockRejectedValue(
        error
      );

      // Act
      await getAcademicYears(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCurrentAcademicYear', () => {
    it('should return current academic year on success', async () => {
      // Arrange
      vi.mocked(academicYearService.getCurrentAcademicYear).mockResolvedValue({
        success: true,
        data: mockAcademicYear,
      });

      // Act
      await getCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(academicYearService.getCurrentAcademicYear).toHaveBeenCalledTimes(
        1
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockAcademicYear,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with 404 error when no current year set', async () => {
      // Arrange
      vi.mocked(academicYearService.getCurrentAcademicYear).mockResolvedValue({
        success: true,
        data: null,
      });

      // Act
      await getCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No current academic year set',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      vi.mocked(academicYearService.getCurrentAcademicYear).mockResolvedValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'ACADEMIC_YEAR_GET_FAILED',
        },
      });

      // Act
      await getCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('getAcademicYearById', () => {
    it('should return academic year by ID on success', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      vi.mocked(academicYearService.getAcademicYearById).mockResolvedValue({
        success: true,
        data: mockAcademicYear,
      });

      // Act
      await getAcademicYearById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(academicYearService.getAcademicYearById).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockAcademicYear,
      });
    });

    it('should call next with 404 error when academic year not found', async () => {
      // Arrange
      mockRequest.params = { id: '999' };
      vi.mocked(academicYearService.getAcademicYearById).mockResolvedValue({
        success: true,
        data: null,
      });

      // Act
      await getAcademicYearById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Academic year not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      vi.mocked(academicYearService.getAcademicYearById).mockResolvedValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'ACADEMIC_YEAR_GET_FAILED',
        },
      });

      // Act
      await getAcademicYearById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('createAcademicYear', () => {
    it('should create and return new academic year with 201 status', async () => {
      // Arrange
      mockRequest.body = { year: '2025-2026' };
      const newAcademicYear = {
        ...mockAcademicYear,
        id: 3,
        year: '2025-2026',
        start: 2025,
        end: 2026,
      };
      vi.mocked(academicYearService.createAcademicYear).mockResolvedValue({
        success: true,
        data: newAcademicYear,
      });

      // Act
      await createAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(academicYearService.createAcademicYear).toHaveBeenCalledWith(
        '2025-2026'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: newAcademicYear,
      });
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      mockRequest.body = { year: '2024-2025' };
      vi.mocked(academicYearService.createAcademicYear).mockResolvedValue({
        success: false,
        error: {
          message: 'Academic year already exists',
          code: 'ACADEMIC_YEAR_CREATE_FAILED',
        },
      });

      // Act
      await createAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('should set academic year as current and return it', async () => {
      // Arrange
      mockRequest.params = { id: '2' };
      const updatedYear = { ...mockAcademicYear2, isCurrent: true };
      vi.mocked(academicYearService.setCurrentAcademicYear).mockResolvedValue({
        success: true,
        data: updatedYear,
      });

      // Act
      await setCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(academicYearService.setCurrentAcademicYear).toHaveBeenCalledWith(
        2
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: updatedYear,
      });
    });

    it('should call next with error when academic year not found', async () => {
      // Arrange
      mockRequest.params = { id: '999' };
      vi.mocked(academicYearService.setCurrentAcademicYear).mockResolvedValue({
        success: false,
        error: {
          message: 'Academic year not found',
          code: 'ACADEMIC_YEAR_NOT_FOUND',
        },
      });

      // Act
      await setCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      vi.mocked(academicYearService.setCurrentAcademicYear).mockResolvedValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'ACADEMIC_YEAR_UPDATE_FAILED',
        },
      });

      // Act
      await setCurrentAcademicYear(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });
});
