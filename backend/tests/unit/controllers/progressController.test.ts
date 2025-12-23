import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { getProgramRequirementsProgress } from '../../../src/api/controllers/progressController.js';
import { prisma } from '../../../src/config/prisma.js';
import { calculateProgramProgress } from '../../../src/api/services/progressCalculator.service.js';
import { NotFoundError } from '../../../src/api/types/error.types.js';

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    planProgram: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../../src/api/services/progressCalculator.service.js', () => ({
  calculateProgramProgress: vi.fn(),
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    http: vi.fn(),
  },
}));

describe('progressController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

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

  describe('getProgramRequirementsProgress', () => {
    it('should return combined requirements and progress', async () => {
      req.params = { planId: '1', planProgramId: '10' };

      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue({
        id: 10,
        planId: 1,
        program: {
          id: 5,
          programId: 'computer_science_major',
          name: 'Computer Science Major',
          type: 'major',
          totalCredits: 120,
          requirements: {
            sections: [
              {
                id: 'core',
                title: 'Core',
                creditsRequired: 3,
                requirements: [
                  {
                    id: 'cs_1101',
                    title: 'Intro',
                    description: 'Take CS 1101',
                    creditsRequired: 3,
                    rule: { type: 'take_courses', courses: ['CS 1101'] },
                    constraints: [],
                  },
                ],
                constraints: [],
              },
            ],
            constraints: [],
          },
        },
      } as any);

      vi.mocked(calculateProgramProgress).mockResolvedValue({
        planProgramId: 10,
        programId: 5,
        programName: 'Computer Science Major',
        programType: 'major',
        status: 'in_progress',
        totalCreditsRequired: 120,
        totalCreditsFulfilled: 3,
        percentage: 2.5,
        sectionProgress: [
          {
            sectionId: 'core',
            title: 'Core',
            status: 'in_progress',
            creditsRequired: 3,
            creditsFulfilled: 3,
            percentage: 100,
            requirementProgress: [
              {
                requirementId: 'core.cs_1101',
                sectionId: 'core',
                title: 'Intro',
                description: 'Take CS 1101',
                status: 'completed',
                creditsRequired: 3,
                creditsFulfilled: 3,
                percentage: 100,
                ruleProgress: {
                  type: 'take_courses',
                  status: 'completed',
                  percentage: 100,
                  details: {
                    type: 'take_courses',
                    requiredCourses: ['CS 1101'],
                    takenCourses: ['CS 1101'],
                    missingCourses: [],
                    coursesRequired: 1,
                    coursesTaken: 1,
                  },
                },
                fulfillingCourses: [
                  {
                    courseId: 'CS 1101',
                    title: 'Programming',
                    credits: 3,
                    creditsApplied: 3,
                  },
                ],
              },
            ],
          },
        ],
        lastUpdated: new Date('2024-01-01'),
      } as any);

      await getProgramRequirementsProgress(req as Request, res as Response, next);

      expect(prisma.planProgram.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        include: { program: true },
      });
      expect(calculateProgramProgress).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          planProgramId: 10,
          program: expect.objectContaining({
            id: 5,
            programId: 'computer_science_major',
          }),
          requirements: expect.objectContaining({
            sections: [
              expect.objectContaining({
                id: 'core',
                progress: expect.objectContaining({
                  status: 'in_progress',
                  creditsFulfilled: 3,
                }),
                requirements: [
                  expect.objectContaining({
                    id: 'cs_1101',
                    progress: expect.objectContaining({
                      status: 'completed',
                    }),
                  }),
                ],
              }),
            ],
          }),
          progress: expect.objectContaining({
            status: 'in_progress',
            totalCreditsFulfilled: 3,
          }),
        }),
      });
    });

    it('should return NotFoundError when planProgram is missing', async () => {
      req.params = { planId: '1', planProgramId: '10' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue(null);

      await getProgramRequirementsProgress(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should return NotFoundError when planProgram does not belong to plan', async () => {
      req.params = { planId: '2', planProgramId: '10' };
      vi.mocked(prisma.planProgram.findUnique).mockResolvedValue({
        id: 10,
        planId: 1,
        program: { requirements: { sections: [], constraints: [] } },
      } as any);

      await getProgramRequirementsProgress(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });
});
