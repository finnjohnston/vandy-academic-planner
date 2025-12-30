import React from 'react';
import TransferCourseRow from '../TransferCourseRowComponent/TransferCourseRow';
import type { PlannedCourse } from '../../../types/PlannedCourse';
import './TransferCourseList.css';

interface TransferCourseListProps {
  courses: PlannedCourse[];
  loading: boolean;
  error: string | null;
}

const TransferCourseList: React.FC<TransferCourseListProps> = ({
  courses,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="transfer-course-list">
        <div className="transfer-course-list-loading">Loading transfer courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transfer-course-list">
        <div className="transfer-course-list-error">Error: {error}</div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="transfer-course-list">
        <div className="transfer-course-list-empty">No courses added</div>
      </div>
    );
  }

  return (
    <div className="transfer-course-list">
      {courses.map((pc, index) => {
        // Extract course data from nested course object or fallback to PlannedCourse fields
        const subjectCode = (pc as any).course?.subjectCode || pc.subjectCode;
        const courseNumber = (pc as any).course?.courseNumber || pc.courseNumber;
        const courseCode = `${subjectCode} ${courseNumber}`;
        const title = (pc as any).course?.title || 'Unknown Course';

        return (
          <TransferCourseRow
            key={pc.id}
            course={courseCode}
            title={title}
            credits={pc.credits}
            isLast={index === courses.length - 1}
          />
        );
      })}
    </div>
  );
};

export default TransferCourseList;
