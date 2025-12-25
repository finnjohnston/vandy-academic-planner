import React from 'react';
import './CourseRow.css';

interface CourseRowProps {
  subjectCode: string;
  courseNumber: string;
  title: string;
  term?: string;
  credits: number;
  isLast?: boolean;
  isTaken?: boolean;
}

const CourseRow: React.FC<CourseRowProps> = ({
  subjectCode,
  courseNumber,
  title,
  term,
  credits,
  isLast = false,
  isTaken = false
}) => {
  return (
    <div className={`course-row${isLast ? ' course-row-last' : ''}`}>
      <span className={`course-row-course${isTaken ? ' course-row-course-taken' : ''}`}>
        {subjectCode} {courseNumber}
      </span>
      <span className="course-row-title">{title}</span>
      <span className="course-row-term">{term || ''}</span>
      <span className="course-row-credits">{credits}</span>
    </div>
  );
};

export default CourseRow;
