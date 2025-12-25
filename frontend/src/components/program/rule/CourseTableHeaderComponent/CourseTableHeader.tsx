import React from 'react';
import './CourseTableHeader.css';

interface CourseTableHeaderProps {
  nestingLevel?: number;
}

const CourseTableHeader: React.FC<CourseTableHeaderProps> = ({ nestingLevel = 0 }) => {
  const indent = 60 * nestingLevel;

  return (
    <div
      className="course-table-header"
      style={{
        width: `calc(100% - ${60 * (nestingLevel + 1)}px)`,
        gridTemplateColumns: `${260 - indent}px 1fr 507px auto`
      }}
    >
      <span className="course-table-header-course">Course</span>
      <span className="course-table-header-title">Title</span>
      <span className="course-table-header-term">Term</span>
      <span className="course-table-header-credits">Credits</span>
    </div>
  );
};

export default CourseTableHeader;
