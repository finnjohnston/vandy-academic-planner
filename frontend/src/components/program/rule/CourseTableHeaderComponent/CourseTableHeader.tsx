import React from 'react';
import './CourseTableHeader.css';

const CourseTableHeader: React.FC = () => {
  return (
    <div className="course-table-header">
      <span className="course-table-header-course">Course</span>
      <span className="course-table-header-title">Title</span>
      <span className="course-table-header-term">Term</span>
      <span className="course-table-header-credits">Credits</span>
    </div>
  );
};

export default CourseTableHeader;
