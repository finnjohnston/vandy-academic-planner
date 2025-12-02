import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTermInfo,
  determineAcademicYear,
  getLatestTerm,
  mapTermToAcademicYear,
} from '../../../src/ingestion/pipelines/services/term.service.js';
import { Term } from '../../../src/ingestion/scrapers/types/term.type.js';

// Mock the academicYear service
vi.mock('../../../src/ingestion/pipelines/services/academicYear.service.js', () => ({
  getOrCreateAcademicYear: vi.fn(),
}));

import { getOrCreateAcademicYear } from '../../../src/ingestion/pipelines/services/academicYear.service.js';

describe('Term Service - parseTermInfo', () => {
  it('should parse Fall term correctly', () => {
    const result = parseTermInfo('Fall 2024');

    expect(result).toEqual({
      semester: 'Fall',
      year: 2024,
    });
  });

  it('should parse Spring term correctly', () => {
    const result = parseTermInfo('Spring 2025');

    expect(result).toEqual({
      semester: 'Spring',
      year: 2025,
    });
  });

  it('should be case-insensitive', () => {
    const result = parseTermInfo('FALL 2024');

    expect(result).toEqual({
      semester: 'Fall',
      year: 2024,
    });
  });

  it('should handle extra whitespace', () => {
    const result = parseTermInfo('Fall  2024');

    expect(result).toEqual({
      semester: 'Fall',
      year: 2024,
    });
  });

  it('should return null for invalid format', () => {
    const result = parseTermInfo('Invalid Term');

    expect(result).toBeNull();
  });

  it('should return null for missing year', () => {
    const result = parseTermInfo('Fall');

    expect(result).toBeNull();
  });

  it('should return null for invalid semester', () => {
    const result = parseTermInfo('Autumn 2024');

    expect(result).toBeNull();
  });
});

describe('Term Service - determineAcademicYear', () => {
  it('should map Fall to same year (Fall 2024 → 2024-2025)', () => {
    const result = determineAcademicYear({
      semester: 'Fall',
      year: 2024,
    });

    expect(result).toEqual({
      year: '2024-2025',
      start: 2024,
      end: 2025,
    });
  });

  it('should map Spring to previous year (Spring 2025 → 2024-2025)', () => {
    const result = determineAcademicYear({
      semester: 'Spring',
      year: 2025,
    });

    expect(result).toEqual({
      year: '2024-2025',
      start: 2024,
      end: 2025,
    });
  });

  it('should handle Fall 2023 → 2023-2024', () => {
    const result = determineAcademicYear({
      semester: 'Fall',
      year: 2023,
    });

    expect(result).toEqual({
      year: '2023-2024',
      start: 2023,
      end: 2024,
    });
  });
});

describe('Term Service - getLatestTerm', () => {
  it('should return null for empty array', () => {
    const result = getLatestTerm([]);

    expect(result).toBeNull();
  });

  it('should return the only term if array has one element', () => {
    const terms: Term[] = [
      { id: '1248', title: 'Fall 2024' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual(terms[0]);
  });

  it('should return latest term from same year (Fall > Spring)', () => {
    const terms: Term[] = [
      { id: '1247', title: 'Spring 2024' },
      { id: '1248', title: 'Fall 2024' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual({ id: '1248', title: 'Fall 2024' });
  });

  it('should return latest term across years', () => {
    const terms: Term[] = [
      { id: '1246', title: 'Fall 2023' },
      { id: '1247', title: 'Spring 2024' },
      { id: '1248', title: 'Fall 2024' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual({ id: '1248', title: 'Fall 2024' });
  });

  it('should handle Spring 2025 as later than Fall 2024', () => {
    const terms: Term[] = [
      { id: '1248', title: 'Fall 2024' },
      { id: '1249', title: 'Spring 2025' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual({ id: '1249', title: 'Spring 2025' });
  });

  it('should handle terms in random order', () => {
    const terms: Term[] = [
      { id: '1249', title: 'Spring 2025' },
      { id: '1246', title: 'Fall 2023' },
      { id: '1248', title: 'Fall 2024' },
      { id: '1247', title: 'Spring 2024' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual({ id: '1249', title: 'Spring 2025' });
  });

  it('should return null if no terms can be parsed', () => {
    const terms: Term[] = [
      { id: '1', title: 'Invalid Term 1' },
      { id: '2', title: 'Invalid Term 2' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toBeNull();
  });

  it('should ignore unparseable terms and find latest parseable one', () => {
    const terms: Term[] = [
      { id: '1', title: 'Invalid Term' },
      { id: '1248', title: 'Fall 2024' },
      { id: '2', title: 'Another Invalid' },
    ];

    const result = getLatestTerm(terms);

    expect(result).toEqual({ id: '1248', title: 'Fall 2024' });
  });
});

describe('Term Service - mapTermToAcademicYear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map Fall 2024 to academic year 2024-2025', async () => {
    const mockAcademicYear = {
      id: 1,
      year: '2024-2025',
      start: 2024,
      end: 2025,
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getOrCreateAcademicYear).mockResolvedValue({
      success: true,
      data: mockAcademicYear,
    });

    const result = await mapTermToAcademicYear('1248', 'Fall 2024');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockAcademicYear);
    }

    expect(getOrCreateAcademicYear).toHaveBeenCalledWith('2024-2025');
  });

  it('should map Spring 2025 to academic year 2024-2025', async () => {
    const mockAcademicYear = {
      id: 1,
      year: '2024-2025',
      start: 2024,
      end: 2025,
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getOrCreateAcademicYear).mockResolvedValue({
      success: true,
      data: mockAcademicYear,
    });

    const result = await mapTermToAcademicYear('1249', 'Spring 2025');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockAcademicYear);
    }

    expect(getOrCreateAcademicYear).toHaveBeenCalledWith('2024-2025');
  });

  it('should return failure for invalid term name', async () => {
    const result = await mapTermToAcademicYear('1', 'Invalid Term');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('TERM_PARSE_FAILED');
      expect(result.error.message).toContain('Invalid Term');
    }

    expect(getOrCreateAcademicYear).not.toHaveBeenCalled();
  });

  it('should propagate academic year creation failure', async () => {
    vi.mocked(getOrCreateAcademicYear).mockResolvedValue({
      success: false,
      error: {
        message: 'Database error',
        code: 'DB_ERROR',
      },
    });

    const result = await mapTermToAcademicYear('1248', 'Fall 2024');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('ACADEMIC_YEAR_FAILED');
    }
  });

  it('should call getOrCreateAcademicYear with correct year string', async () => {
    const mockAcademicYear = {
      id: 1,
      year: '2023-2024',
      start: 2023,
      end: 2024,
      isCurrent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getOrCreateAcademicYear).mockResolvedValue({
      success: true,
      data: mockAcademicYear,
    });

    await mapTermToAcademicYear('1246', 'Fall 2023');

    // Verify it was called with the correct year string
    expect(getOrCreateAcademicYear).toHaveBeenCalledWith('2023-2024');
  });
});
