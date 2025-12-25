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
  nestingLevel?: number;
}

const CourseRow: React.FC<CourseRowProps> = ({
  subjectCode,
  courseNumber,
  title,
  term,
  credits,
  isLast = false,
  isTaken = false,
  hideTerm = false,
  nestingLevel = 0
}) => {
  const indent = 60 * nestingLevel;
  const rowClass = `course-row${isLast ? ' course-row-last' : ''}${hideTerm ? ' course-row-no-term' : ''}`;

  return (
    <div
      className={rowClass}
      style={{
        width: `calc(100% - ${60 * (nestingLevel + 1)}px)`,
        gridTemplateColumns: hideTerm
          ? `${260 - indent}px 1fr auto`
          : `${260 - indent}px 1fr 507px auto`
      }}
    >
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
