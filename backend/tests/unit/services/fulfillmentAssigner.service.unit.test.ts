import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoAssignFulfillments } from '../../../src/api/services/fulfillmentAssigner.service.js';
import { prisma } from '../../../src/config/prisma.js';
import * as requirementMatcher from '../../../src/api/services/requirementMatcher.service.js';
import logger from '../../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    plan: {
      findUnique: vi.fn(),
    },
    requirementFulfillment: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../src/api/services/requirementMatcher.service.js', () => ({
  findMatchingRequirements: vi.fn(),
}));

vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock data
const mockPlan = {
  id: 1,
  name: 'My Plan',
  schoolId: 1,
  academicYearId: 869,
  currentSemester: 0,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  plannedCourses: [
    {
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
        title: 'Programming',
        school: 'Engineering',
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
  ],
  planPrograms: [
    {
      id: 1,
      planId: 1,
      programId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      program: {
        id: 1,
        programId: 'computer_science_major',
        name: 'Computer Science Major',
        type: 'major',
        totalCredits: 120,
        requirements: { sections: [], constraints: [] },
        academicYearId: 869,
        schoolId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    },
  ],
};

describe('fulfillmentAssigner.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('autoAssignFulfillments', () => {
    it('should successfully assign fulfillment for single course, single program, one match', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'cs_core', requirementId: 'cs_intro', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          plannedCourses: {
            include: { course: true },
            orderBy: [{ semesterNumber: 'asc' }, { position: 'asc' }],
          },
          planPrograms: {
            include: {
              program: true,
            },
          },
        },
      });
      expect(prisma.requirementFulfillment.deleteMany).toHaveBeenCalledWith({
        where: { planProgramId: { in: [1] } },
      });
      expect(requirementMatcher.findMatchingRequirements).toHaveBeenCalledTimes(1);
      expect(prisma.requirementFulfillment.create).toHaveBeenCalledWith({
        data: {
          planProgramId: 1,
          requirementId: 'cs_core.cs_intro',
          plannedCourseId: 1,
          creditsApplied: 3,
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Auto-assigning fulfillments for plan 1');
      expect(logger.info).toHaveBeenCalledWith('Completed auto-assignment for plan 1');
    });

    it('should select best match when single course has multiple matches', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'section1', requirementId: 'req1', specificityScore: 100 },
        { sectionId: 'section2', requirementId: 'req2', specificityScore: 80 },
        { sectionId: 'section3', requirementId: 'req3', specificityScore: 10 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.create).toHaveBeenCalledTimes(1);
      expect(prisma.requirementFulfillment.create).toHaveBeenCalledWith({
        data: {
          planProgramId: 1,
          requirementId: 'section1.req1',
          plannedCourseId: 1,
          creditsApplied: 3,
        },
      });
    });

    it('should handle multiple courses with single program', async () => {
      const planWith3Courses = {
        ...mockPlan,
        plannedCourses: [
          mockPlan.plannedCourses[0],
          {
            ...mockPlan.plannedCourses[0],
            id: 2,
            courseId: 'CS 2201',
            course: { ...mockPlan.plannedCourses[0].course, id: 2, courseId: 'CS 2201' },
          },
          {
            ...mockPlan.plannedCourses[0],
            id: 3,
            courseId: 'CS 2212',
            course: { ...mockPlan.plannedCourses[0].course, id: 3, courseId: 'CS 2212' },
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWith3Courses as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'cs_core', requirementId: 'cs_intro', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(requirementMatcher.findMatchingRequirements).toHaveBeenCalledTimes(3);
      expect(prisma.requirementFulfillment.create).toHaveBeenCalledTimes(3);
    });

    it('should handle single course with multiple programs', async () => {
      const planWith2Programs = {
        ...mockPlan,
        planPrograms: [
          mockPlan.planPrograms[0],
          {
            ...mockPlan.planPrograms[0],
            id: 2,
            programId: 2,
            program: {
              ...mockPlan.planPrograms[0].program,
              id: 2,
              programId: 'mathematics_major',
              name: 'Mathematics Major',
            },
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWith2Programs as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'section1', requirementId: 'req1', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(requirementMatcher.findMatchingRequirements).toHaveBeenCalledTimes(2);
      expect(prisma.requirementFulfillment.create).toHaveBeenCalledTimes(2);
      expect(prisma.requirementFulfillment.create).toHaveBeenNthCalledWith(1, {
        data: {
          planProgramId: 1,
          requirementId: 'section1.req1',
          plannedCourseId: 1,
          creditsApplied: 3,
        },
      });
      expect(prisma.requirementFulfillment.create).toHaveBeenNthCalledWith(2, {
        data: {
          planProgramId: 2,
          requirementId: 'section1.req1',
          plannedCourseId: 1,
          creditsApplied: 3,
        },
      });
    });

    it('should handle course with no matches gracefully', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.deleteMany).toHaveBeenCalled();
      expect(requirementMatcher.findMatchingRequirements).toHaveBeenCalledTimes(1);
      expect(prisma.requirementFulfillment.create).not.toHaveBeenCalled();
    });

    it('should handle plan with no courses', async () => {
      const planWithNoCourses = {
        ...mockPlan,
        plannedCourses: [],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWithNoCourses as any);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.deleteMany).toHaveBeenCalledWith({
        where: { planProgramId: { in: [1] } },
      });
      expect(requirementMatcher.findMatchingRequirements).not.toHaveBeenCalled();
      expect(prisma.requirementFulfillment.create).not.toHaveBeenCalled();
    });

    it('should handle plan with no programs', async () => {
      const planWithNoPrograms = {
        ...mockPlan,
        planPrograms: [],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWithNoPrograms as any);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.deleteMany).toHaveBeenCalledWith({
        where: { planProgramId: { in: [] } },
      });
      expect(requirementMatcher.findMatchingRequirements).not.toHaveBeenCalled();
      expect(prisma.requirementFulfillment.create).not.toHaveBeenCalled();
    });

    it('should handle plan not found', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(null);

      await autoAssignFulfillments(999);

      expect(logger.warn).toHaveBeenCalledWith('Plan 999 not found for auto-assignment');
      expect(prisma.requirementFulfillment.deleteMany).not.toHaveBeenCalled();
      expect(requirementMatcher.findMatchingRequirements).not.toHaveBeenCalled();
      expect(prisma.requirementFulfillment.create).not.toHaveBeenCalled();
    });

    it('should clear existing fulfillments before creating new ones', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'cs_core', requirementId: 'cs_intro', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      const deleteManyOrder: number[] = [];
      const createOrder: number[] = [];
      let callCount = 0;

      vi.mocked(prisma.requirementFulfillment.deleteMany).mockImplementation(async () => {
        deleteManyOrder.push(++callCount);
        return { count: 5 };
      });

      vi.mocked(prisma.requirementFulfillment.create).mockImplementation(async () => {
        createOrder.push(++callCount);
        return {} as any;
      });

      await autoAssignFulfillments(1);

      expect(deleteManyOrder[0]).toBeLessThan(createOrder[0]);
    });

    it('should handle multiple courses where some match and some do not', async () => {
      const planWith4Courses = {
        ...mockPlan,
        plannedCourses: [
          mockPlan.plannedCourses[0],
          {
            ...mockPlan.plannedCourses[0],
            id: 2,
            courseId: 'CS 2201',
            course: { ...mockPlan.plannedCourses[0].course, id: 2, courseId: 'CS 2201' },
          },
          {
            ...mockPlan.plannedCourses[0],
            id: 3,
            courseId: 'HIST 2100',
            course: { ...mockPlan.plannedCourses[0].course, id: 3, courseId: 'HIST 2100' },
          },
          {
            ...mockPlan.plannedCourses[0],
            id: 4,
            courseId: 'ENGL 1100',
            course: { ...mockPlan.plannedCourses[0].course, id: 4, courseId: 'ENGL 1100' },
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWith4Courses as any);
      vi.mocked(requirementMatcher.findMatchingRequirements)
        .mockReturnValueOnce([{ sectionId: 'cs_core', requirementId: 'req1', specificityScore: 100 }])
        .mockReturnValueOnce([{ sectionId: 'cs_core', requirementId: 'req2', specificityScore: 100 }])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.create).toHaveBeenCalledTimes(2);
    });

    it('should use creditsApplied from PlannedCourse not Course', async () => {
      const planWithCustomCredits = {
        ...mockPlan,
        plannedCourses: [
          {
            ...mockPlan.plannedCourses[0],
            credits: 4,
          },
        ],
      };

      vi.mocked(prisma.plan.findUnique).mockResolvedValue(planWithCustomCredits as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'cs_core', requirementId: 'cs_intro', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockResolvedValue({} as any);

      await autoAssignFulfillments(1);

      expect(prisma.requirementFulfillment.create).toHaveBeenCalledWith({
        data: {
          planProgramId: 1,
          requirementId: 'cs_core.cs_intro',
          plannedCourseId: 1,
          creditsApplied: 4,
        },
      });
    });

    it('should propagate database errors during create', async () => {
      vi.mocked(prisma.plan.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(requirementMatcher.findMatchingRequirements).mockReturnValue([
        { sectionId: 'cs_core', requirementId: 'cs_intro', specificityScore: 100 },
      ]);
      vi.mocked(prisma.requirementFulfillment.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.requirementFulfillment.create).mockRejectedValue(new Error('Database error'));

      await expect(autoAssignFulfillments(1)).rejects.toThrow('Database error');
    });
  });
});
