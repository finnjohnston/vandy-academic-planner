import React from 'react';
import './PlannedCourse.css';

interface PlannedCourseProps {
  courseId: string;
  subjectCode: string;
  courseNumber: string;
  credits: number;
  onClick?: (courseId: string) => void;
}

const PlannedCourse: React.FC<PlannedCourseProps> = ({
  courseId,
  subjectCode,
  courseNumber,
  credits,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick && courseId) {
      onClick(courseId);
    }
  };

  return (
    <div className="planned-course" onClick={handleClick}>
      <span className="planned-course-code">
        {subjectCode} {courseNumber}
      </span>
      <span className="planned-course-credits">{credits}</span>
    </div>
  );
};

export default PlannedCourse;
