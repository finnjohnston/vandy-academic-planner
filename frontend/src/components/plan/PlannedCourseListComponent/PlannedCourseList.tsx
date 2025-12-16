import React from 'react';
import './PlannedCourseList.css';
import type { PlannedCourse as PlannedCourseType } from '../../../types/PlannedCourse';
import PlannedCourse from '../PlannedCourseComponent/PlannedCourse';

interface PlannedCourseListProps {
  semesterNumber: number;
  plannedCourses: PlannedCourseType[];
  onCourseClick?: (courseId: string) => void;
}

const PlannedCourseList: React.FC<PlannedCourseListProps> = ({
  semesterNumber,
  plannedCourses,
  onCourseClick,
}) => {
  const semesterCourses = plannedCourses.filter(
    (course) => course.semesterNumber === semesterNumber
  );

  return (
    <div className="planned-course-list">
      {semesterCourses.map((plannedCourse) => (
        <PlannedCourse
          key={plannedCourse.id}
          courseId={plannedCourse.courseId || ''}
          subjectCode={plannedCourse.subjectCode}
          courseNumber={plannedCourse.courseNumber}
          credits={plannedCourse.credits}
          onClick={onCourseClick}
        />
      ))}
    </div>
  );
};

export default PlannedCourseList;
