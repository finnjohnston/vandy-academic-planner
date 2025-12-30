import React from 'react';
import './TransferCourseRow.css';

interface TransferCourseRowProps {
  course: string;
  title: string;
  credits: number;
  isLast?: boolean;
}

const TransferCourseRow: React.FC<TransferCourseRowProps> = ({
  course,
  title,
  credits,
  isLast = false
}) => {
  return (
    <div className={`transfer-course-row${isLast ? ' transfer-course-row-last' : ''}`}>
      <span className="transfer-course-row-course">{course}</span>
      <span className="transfer-course-row-title">{title}</span>
      <span className="transfer-course-row-credits">{credits}</span>
    </div>
  );
};

export default TransferCourseRow;
