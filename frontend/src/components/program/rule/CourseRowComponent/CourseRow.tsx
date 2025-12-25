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
  hideTerm?: boolean;
}

const CourseRow: React.FC<CourseRowProps> = ({
  subjectCode,
  courseNumber,
  title,
  term,
  credits,
  isLast = false,
  isTaken = false,
  hideTerm = false
}) => {
  const rowClass = `course-row${isLast ? ' course-row-last' : ''}${hideTerm ? ' course-row-no-term' : ''}`;

  return (
    <div className={rowClass}>
      <span className={`course-row-course${isTaken ? ' course-row-course-taken' : ''}`}>
        {subjectCode} {courseNumber}
      </span>
      <span className="course-row-title">{title}</span>
      {!hideTerm && <span className="course-row-term">{term || ''}</span>}
      <span className="course-row-credits">{credits}</span>
    </div>
  );
};

export default CourseRow;
