import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
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
  isDropTarget?: boolean;
  isDragging?: boolean;
}

const TransferCourseList: React.FC<TransferCourseListProps> = ({
  courses,
  loading,
  error,
  onDeleteCourse,
  isDropTarget = false,
  isDragging = false
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { setNodeRef } = useDroppable({
    id: 'transfer-credits-drop-zone',
    data: {
      semesterNumber: 0
    }
  });

  const showDropHighlight = isDragging && isDropTarget;

  const handleClosePopup = () => {
    setSelectedCourse(null);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`transfer-course-list${showDropHighlight ? ' transfer-course-list-drop-target' : ''}`}
      >
        {loading && <div className="transfer-course-list-loading">Loading transfer courses...</div>}
        {error && <div className="transfer-course-list-error">Error: {error}</div>}
        {!loading && !error && courses.length === 0 && (
          <div className="transfer-course-list-empty">
            {isDragging ? 'Drop course here to add as transfer credit' : 'No courses added'}
          </div>
        )}
        {!loading && !error && courses.length > 0 && courses.map((pc, index) => {
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
