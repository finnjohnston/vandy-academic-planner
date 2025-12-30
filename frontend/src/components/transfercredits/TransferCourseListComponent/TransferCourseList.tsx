import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import TransferCourseRow from '../TransferCourseRowComponent/TransferCourseRow';
import CourseDetail from '../../course/CourseDetailComponent/CourseDetail';
import type { PlannedCourse } from '../../../types/PlannedCourse';
import type { Course } from '../../../types/Course';
import './TransferCourseList.css';

interface TransferCourseListProps {
  courses: PlannedCourse[];
  loading: boolean;
  error: string | null;
  onDeleteCourse?: (plannedCourseId: number) => void;
}

const TransferCourseList: React.FC<TransferCourseListProps> = ({
  courses,
  loading,
  error,
  onDeleteCourse
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
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

  const handleClosePopup = () => {
    setSelectedCourse(null);
  };

  return (
    <>
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
              onDetailsClick={() => {
                if ((pc as any).course) {
                  setSelectedCourse((pc as any).course);
                }
              }}
              onDeleteClick={() => {
                if (onDeleteCourse) {
                  onDeleteCourse(pc.id);
                }
              }}
            />
          );
        })}
      </div>
      {selectedCourse && ReactDOM.createPortal(
        <CourseDetail
          course={selectedCourse}
          onClose={handleClosePopup}
        />,
        document.body
      )}
    </>
  );
};

export default TransferCourseList;
