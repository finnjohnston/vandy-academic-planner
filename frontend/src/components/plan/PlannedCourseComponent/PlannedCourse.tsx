import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PlannedCourseOptionsMenu from '../PlannedCourseOptionsMenuComponent/PlannedCourseOptionsMenu';
import DropIndicator from '../DropIndicatorComponent/DropIndicator';
import './PlannedCourse.css';

interface PlannedCourseProps {
  plannedCourseId: number;
  courseId: string;
  subjectCode: string;
  courseNumber: string;
  credits: number;
  semesterNumber: number;
  position: number;
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
  position,
  onCourseDetailsClick,
  onDeleteCourseClick,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecentlyDragged, setIsRecentlyDragged] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
    active,
  } = useSortable({
    id: `planned-course-${plannedCourseId}`,
    data: {
      source: 'planned',
      plannedCourseId,
      currentSemester: semesterNumber,
      currentPosition: position,
      course: {
        courseId,
        subjectCode,
        courseNumber,
        title: '',
        creditsMin: credits,
        creditsMax: credits,
        id: plannedCourseId,
        academicYearId: 0,
        createdAt: '',
        updatedAt: ''
      }
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate drop indicator
  const isOverThis = over?.id === `planned-course-${plannedCourseId}`;
  const activePlannedCourseId = active?.data.current?.plannedCourseId;
  const isNotSelf = activePlannedCourseId !== plannedCourseId;
  const showIndicator = isOverThis && isNotSelf && !isDragging;

  const activePosition = active?.data.current?.currentPosition;
  const activeSemester = active?.data.current?.currentSemester;
  const isFromSearch = active?.data.current?.source === 'search';
  const isSameSemester = activeSemester === semesterNumber;

  // Determine indicator position
  let indicatorPosition: 'above' | 'below';
  if (isFromSearch || !isSameSemester) {
    // Course cards or cross-semester moves: always insert before the hovered course
    indicatorPosition = 'above';
  } else {
    // Same-semester moves: compare positions to determine direction
    indicatorPosition =
      activePosition !== undefined && activePosition < position ? 'above' : 'below';
  }

  useEffect(() => {
    if (isDragging) {
      setIsRecentlyDragged(true);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isRecentlyDragged && !isDragging) {
      const timer = setTimeout(() => {
        setIsRecentlyDragged(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRecentlyDragged, isDragging]);

  const handleCourseClick = () => {
    if (isRecentlyDragged) return; // Prevent click after drag
    setIsMenuOpen(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`planned-course${isDragging ? ' planned-course-dragging' : ''}${
        showIndicator ? ` planned-course-drop-${indicatorPosition}` : ''
      }`}
      onClick={handleCourseClick}
      {...listeners}
      {...attributes}
    >
      {showIndicator && <DropIndicator position={indicatorPosition} />}
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
