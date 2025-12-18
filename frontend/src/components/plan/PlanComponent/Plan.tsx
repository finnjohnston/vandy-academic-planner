import React from 'react';
import Semester from '../SemesterComponent/Semester';
import type { PlannedCourse } from '../../../types/PlannedCourse';
import './Plan.css';

interface PlanProps {
  planId: number;
  planName: string;
  academicYear: {
    id: number;
    year: string;
    start: number;
    end: number;
    isCurrent: boolean;
  };
  plannedCourses: Array<{
    id: number;
    courseId: string | null;
    semesterNumber: number;
    credits: number;
    course?: {
      subjectCode: string;
      courseNumber: string;
    } | null;
  }>;
  isBlurred?: boolean;
  onCourseDetailsClick?: (courseId: string) => void;
  onDeleteCourseClick?: (plannedCourseId: number) => void;
}

const Plan: React.FC<PlanProps> = ({
  planId,
  planName,
  academicYear,
  plannedCourses,
  isBlurred = false,
  onCourseDetailsClick,
  onDeleteCourseClick
}) => {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Transform API response to PlannedCourse format
  const transformedCourses: PlannedCourse[] = plannedCourses
    .filter(pc => pc.courseId && pc.course && typeof pc.position === 'number')
    .map(pc => ({
      id: pc.id,
      planId: planId,
      courseId: pc.courseId!,
      semesterNumber: pc.semesterNumber,
      position: pc.position,
      credits: pc.credits,
      subjectCode: pc.course!.subjectCode,
      courseNumber: pc.course!.courseNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const calculateSemesterCredits = (semesterNumber: number): number => {
    return transformedCourses
      .filter(course => course.semesterNumber === semesterNumber)
      .reduce((sum, course) => sum + course.credits, 0);
  };

  return (
    <div className={`plan-container${isBlurred ? ' plan-blurred' : ''}`}>
      <div className="plan-content">
        <h1 className="plan-header">{planName}</h1>
        <div className="plan-grid">
          {semesters.map((semesterNumber) => (
            <Semester
              key={semesterNumber}
              semesterNumber={semesterNumber}
              academicYear={academicYear}
              credits={calculateSemesterCredits(semesterNumber)}
              plannedCourses={transformedCourses}
              onCourseDetailsClick={onCourseDetailsClick}
              onDeleteCourseClick={onDeleteCourseClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plan;
