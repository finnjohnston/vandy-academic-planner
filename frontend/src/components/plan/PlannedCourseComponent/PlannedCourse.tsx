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
    indicatorPosition: 'above' | 'below';
    isSwapMode?: boolean;
    hoveredPlannedCourseId?: number;
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
  const courseRef = useRef<HTMLDivElement>(null);

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
    active !== null && // Only show gaps during an active drag
    dragOverPosition !== null &&
    dragOverPosition.semesterNumber === semesterNumber &&
    dragOverPosition.position === position;

  const activePosition = active?.data.current?.currentPosition;
  const activeSemester = active?.data.current?.currentSemester;
  const isSameSemester = activeSemester === semesterNumber;

  const indicatorPosition = dragOverPosition?.indicatorPosition || 'above';

  // Hide gap only when appending BELOW the last course (redundant with semester border drop zone)
  // But allow gap ABOVE the last course (valid insertion point)
  const isDraggingAdjacentToLastPosition =
    isSameSemester &&
    activePosition !== undefined &&
    dragOverPosition?.isLastInSemester === true &&
    position === activePosition + 1 &&
    indicatorPosition === 'below'; // Only hide when appending below

  const showIndicator = shouldShowIndicator && !isDraggingAdjacentToLastPosition;

  // Check if there's a same-semester drag happening
  const isSameSemesterDrag = dragOverPosition && dragOverPosition.semesterNumber === semesterNumber;

  const style = {
    // When dragging within same semester: disable DND transforms completely
    // The dragged item collapses (height: 0), so items naturally flow up
    // Only show manual gap margins for the indicator
    transform: isDragging && transform ? CSS.Transform.toString(transform) :
               isSameSemesterDrag ? undefined :
               transform ? CSS.Transform.toString(transform) : undefined,
    // Disable all transitions to prevent any movement animation from margin/layout changes
    transition: 'none',
  };

  // Check if this course is a swap target (full semester with 7 courses)
  const isSwapTarget =
    !isDragging &&
    dragOverPosition?.isSwapMode &&
    dragOverPosition?.hoveredPlannedCourseId === plannedCourseId;

  // Build className explicitly to prevent both gap classes from being applied
  const gapClass = showIndicator && !isDragging && !isSwapTarget
    ? (indicatorPosition === 'above' ? ' planned-course-drop-above' : ' planned-course-drop-below')
    : '';

  const swapClass = isSwapTarget ? ' planned-course-swap-target' : '';

  const finalClassName = `planned-course${isDragging ? ' planned-course-dragging' : ''}${gapClass}${swapClass}`;

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
      ref={(el) => {
        setNodeRef(el);
        (courseRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
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
        anchorElement={courseRef.current}
      />
    </div>
  );
};

export default PlannedCourse;
