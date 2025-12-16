import React from 'react';
import './Semester.css';
import PlannedCourseList from '../PlannedCourseListComponent/PlannedCourseList';
import type { PlannedCourse } from '../../types/PlannedCourse';

interface SemesterProps {
  semesterNumber: number;
  academicYear: {
    id: number;
    year: string;
    start: number;
    end: number;
    isCurrent: boolean;
  };
  credits?: number;
  plannedCourses?: PlannedCourse[];
  onCourseClick?: (courseId: string) => void;
}

interface SemesterInfo {
  year: number;
  season: 'Fall' | 'Spring';
}

const Semester: React.FC<SemesterProps> = ({
  semesterNumber,
  academicYear,
  credits = 0,
  plannedCourses = [],
  onCourseClick,
}) => {
  const getSemesterInfo = (
    semesterNumber: number,
    academicYear: { start: number; end: number }
  ): SemesterInfo => {
    const isOdd = semesterNumber % 2 === 1;
    const season = isOdd ? 'Fall' : 'Spring';

    const yearOffset = Math.floor(semesterNumber / 2);
    const year = academicYear.start + yearOffset;

    return { year, season };
  };

  const { year, season } = getSemesterInfo(semesterNumber, academicYear);

  return (
    <div className="semester-card">
      <div className="semester-header">
        <span className="semester-name">
          {year} {season}
        </span>
        <span className="semester-credits">{credits} credits</span>
      </div>
      <div className="semester-body">
        <PlannedCourseList
          semesterNumber={semesterNumber}
          plannedCourses={plannedCourses}
          onCourseClick={onCourseClick}
        />
      </div>
    </div>
  );
};

export default Semester;
