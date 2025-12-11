/**
 * Unit tests for Term Controller
 * Tests all 4 CRUD operations with mocked service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Term } from '@prisma/client';
import {
  getTerms,
  getTermById,
  createTerm,
  updateTerm,
} from '../../../src/api/controllers/termController.js';
import * as termService from '../../../src/ingestion/operations/term.insert.js';

// Mock the service layer
vi.mock('../../../src/ingestion/operations/term.insert.js');

describe('Term Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  // Sample term data
  const mockTerm: Term = {
    id: 1,
    termId: '202510',
    academicYearId: 1,
    name: 'Fall 2024',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTerm2: Term = {
    id: 2,
    termId: '202520',
    academicYearId: 1,
    name: 'Spring 2025',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTerm3: Term = {
    id: 3,
    termId: '202610',
    academicYearId: 2,
    name: 'Fall 2025',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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
    };

    mockNext = vi.fn();
  });

  describe('getTerms', () => {
    it('should return all terms on success', async () => {
      // Arrange
      const mockData = [mockTerm, mockTerm2, mockTerm3];
      vi.mocked(termService.getAllTerms).mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Act
      await getTerms(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(termService.getAllTerms).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return filtered terms when academicYearId query param provided', async () => {
      // Arrange
      mockRequest.query = { academicYearId: '1' };
      const mockData = [mockTerm, mockTerm2];
      vi.mocked(termService.getAllTerms).mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Act
      await getTerms(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(termService.getAllTerms).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockData,
      });
    });

    it('should return empty array when no terms exist', async () => {
      // Arrange
      vi.mocked(termService.getAllTerms).mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await getTerms(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: [],
      });
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      vi.mocked(termService.getAllTerms).mockResolvedValue({
        success: false,
        error: {
          message: 'Database connection failed',
          code: 'TERM_GET_FAILED',
        },
      });

      // Act
      await getTerms(mockRequest as Request, mockResponse as Response, mockNext);

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
      vi.mocked(termService.getAllTerms).mockRejectedValue(error);

      // Act
      await getTerms(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTermById', () => {
    it('should return term by ID on success', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      vi.mocked(termService.getTermById).mockResolvedValue({
        success: true,
        data: mockTerm,
      });

      // Act
      await getTermById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(termService.getTermById).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockTerm,
      });
    });

    it('should call next with 404 error when term not found', async () => {
      // Arrange
      mockRequest.params = { id: '999' };
      vi.mocked(termService.getTermById).mockResolvedValue({
        success: true,
        data: null,
      });

      // Act
      await getTermById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Term not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        })
      );
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      vi.mocked(termService.getTermById).mockResolvedValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'TERM_GET_FAILED',
        },
      });

      // Act
      await getTermById(
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

  describe('createTerm', () => {
    it('should create and return new term with 201 status', async () => {
      // Arrange
      mockRequest.body = {
        termId: '202530',
        academicYearId: 1,
        name: 'Summer 2025',
      };
      const newTerm = {
        ...mockTerm,
        id: 4,
        termId: '202530',
        name: 'Summer 2025',
      };
      vi.mocked(termService.insertTerm).mockResolvedValue({
        success: true,
        data: newTerm,
      });

      // Act
      await createTerm(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(termService.insertTerm).toHaveBeenCalledWith({
        termId: '202530',
        academicYearId: 1,
        name: 'Summer 2025',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: newTerm,
      });
    });

    it('should call next with error on service failure', async () => {
      // Arrange
      mockRequest.body = {
        termId: '202510',
        academicYearId: 1,
        name: 'Fall 2024',
      };
      vi.mocked(termService.insertTerm).mockResolvedValue({
        success: false,
        error: {
          message: 'Term already exists',
          code: 'TERM_INSERT_FAILED',
        },
      });

      // Act
      await createTerm(
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

  describe('updateTerm', () => {
    it('should update and return term with only name changed', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      mockRequest.body = { name: 'Fall 2024 (Updated)' };
      const updatedTerm = { ...mockTerm, name: 'Fall 2024 (Updated)' };
      vi.mocked(termService.updateTerm).mockResolvedValue({
        success: true,
        data: updatedTerm,
      });

      // Act
      await updateTerm(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(termService.updateTerm).toHaveBeenCalledWith(1, {
        name: 'Fall 2024 (Updated)',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: updatedTerm,
      });
    });

    it('should update and return term with only academicYearId changed', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      mockRequest.body = { academicYearId: 2 };
      const updatedTerm = { ...mockTerm, academicYearId: 2 };
      vi.mocked(termService.updateTerm).mockResolvedValue({
        success: true,
        data: updatedTerm,
      });

      // Act
      await updateTerm(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(termService.updateTerm).toHaveBeenCalledWith(1, {
        academicYearId: 2,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: updatedTerm,
      });
    });

    it('should update both name and academicYearId', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      mockRequest.body = { name: 'Updated Name', academicYearId: 2 };
      const updatedTerm = {
        ...mockTerm,
        name: 'Updated Name',
        academicYearId: 2,
      };
      vi.mocked(termService.updateTerm).mockResolvedValue({
        success: true,
        data: updatedTerm,
      });

      // Act
      await updateTerm(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(termService.updateTerm).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
        academicYearId: 2,
      });
    });

    it('should call next with error when term not found', async () => {
      // Arrange
      mockRequest.params = { id: '999' };
      mockRequest.body = { name: 'Updated Name' };
      vi.mocked(termService.updateTerm).mockResolvedValue({
        success: false,
        error: {
          message: 'Term not found',
          code: 'TERM_NOT_FOUND',
        },
      });

      // Act
      await updateTerm(
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
      mockRequest.body = { name: 'Updated Name' };
      vi.mocked(termService.updateTerm).mockResolvedValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'TERM_UPDATE_FAILED',
        },
      });

      // Act
      await updateTerm(
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
