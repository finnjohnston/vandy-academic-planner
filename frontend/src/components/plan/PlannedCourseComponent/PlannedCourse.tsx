import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import PlannedCourseOptionsMenu from '../PlannedCourseOptionsMenuComponent/PlannedCourseOptionsMenu';
import './PlannedCourse.css';

interface PlannedCourseProps {
  plannedCourseId: number;
  courseId: string;
  subjectCode: string;
  courseNumber: string;
  credits: number;
  semesterNumber: number;
  onCourseDetailsClick?: (courseId: string) => void;
  onDeleteCourseClick?: (plannedCourseId: number) => void;
}

const PlannedCourse: React.FC<PlannedCourseProps> = ({
  plannedCourseId,
  courseId,
  subjectCode,
  courseNumber,
  credits,
  semesterNumber,
  onCourseDetailsClick,
  onDeleteCourseClick,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planned-course-${plannedCourseId}`,
    data: {
      source: 'planned',
      plannedCourseId,
      currentSemester: semesterNumber,
      course: {
        courseId,
        subjectCode,
        courseNumber,
        title: `${subjectCode} ${courseNumber}`,
        creditsMin: credits,
        creditsMax: credits,
        id: plannedCourseId,
        academicYearId: 0,
        createdAt: '',
        updatedAt: ''
      }
    }
  });

  const handleCourseClick = () => {
    if (isDragging) return;
    setIsMenuOpen(true);
  };

  return (
    <div
      ref={setNodeRef}
      className={`planned-course${isDragging ? ' planned-course-dragging' : ''}`}
      onClick={handleCourseClick}
      {...listeners}
      {...attributes}
    >
      <span className="planned-course-code">
        {subjectCode} {courseNumber}
      </span>
      <span className="planned-course-credits">{credits}</span>
      <PlannedCourseOptionsMenu
        plannedCourseId={plannedCourseId}
        courseId={courseId}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onCourseDetailsClick={onCourseDetailsClick}
        onDeleteCourseClick={onDeleteCourseClick}
      />
    </div>
  );
};

export default PlannedCourse;
