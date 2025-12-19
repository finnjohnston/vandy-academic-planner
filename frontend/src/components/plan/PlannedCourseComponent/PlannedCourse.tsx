import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PlannedCourseOptionsMenu from '../PlannedCourseOptionsMenuComponent/PlannedCourseOptionsMenu';
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
  dragOverPosition: {
    semesterNumber: number;
    position: number;
    indicatorPosition: 'above' | 'below'
  } | null;
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
  dragOverPosition,
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
    },
    // Disable automatic layout animations - we handle visual feedback with manual gaps
    animateLayoutChanges: () => false
  });

  // Use dragOverPosition as single source of truth for showing indicator
  // This prevents multiple courses from showing gaps simultaneously
  const shouldShowIndicator =
    !isDragging && // Don't show on the dragged element itself
    dragOverPosition !== null &&
    dragOverPosition.semesterNumber === semesterNumber &&
    dragOverPosition.position === position;

  const activePosition = active?.data.current?.currentPosition;
  const activeSemester = active?.data.current?.currentSemester;
  const isSameSemester = activeSemester === semesterNumber;

  // Don't show indicator if hovering over a course directly adjacent to the dragged course
  // in the same semester, because the dragged course (opacity: 0) already creates a gap
  // Since we always use 'above' indicator, only check for position === activePosition + 1
  const indicatorPosition = dragOverPosition?.indicatorPosition || 'above';
  const isAdjacentToActiveInSameSemester =
    isSameSemester &&
    activePosition !== undefined &&
    position === activePosition + 1;

  const showIndicator = shouldShowIndicator && !isAdjacentToActiveInSameSemester;

  // DEBUG LOGGING
  useEffect(() => {
    console.log(`COURSE ${subjectCode} ${courseNumber} (pos ${position}):`, {
      showIndicator,
      gapClass: showIndicator ? (indicatorPosition === 'above' ? 'GAP-ABOVE' : 'GAP-BELOW') : 'NO-GAP',
      isDragging,
      dragOverPosition: dragOverPosition?.position,
      thisPosition: position
    });
  }, [showIndicator, position, isDragging, dragOverPosition, subjectCode, courseNumber, indicatorPosition]);

  // Check if there's a same-semester drag happening
  const isSameSemesterDrag = dragOverPosition && dragOverPosition.semesterNumber === semesterNumber;

  const style = {
    // When dragging within same semester: disable ALL transforms except for the dragged item
    // This prevents DND Kit transforms from interfering with our manual gap system
    transform: isDragging && transform ? CSS.Transform.toString(transform) :
               isSameSemesterDrag ? undefined :
               transform ? CSS.Transform.toString(transform) : undefined,
    // Override transition to exclude margins - gaps should appear/disappear instantly
    transition: 'transform 200ms ease, opacity 200ms ease',
  };

  // Build className explicitly to prevent both gap classes from being applied
  const gapClass = showIndicator && !isDragging
    ? (indicatorPosition === 'above' ? ' planned-course-drop-above' : ' planned-course-drop-below')
    : '';

  const finalClassName = `planned-course${isDragging ? ' planned-course-dragging' : ''}${gapClass}`;

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
      className={finalClassName}
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
