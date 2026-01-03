import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import './Semester.css';
import PlannedCourseList from '../PlannedCourseListComponent/PlannedCourseList';
import type { PlannedCourse } from '../../../types/PlannedCourse';
import type { ValidationMap } from '../../../types/Validation';

interface SemesterProps {
  semesterNumber: number;
  academicYear: {
    id: number;
    year: string;
    start: number;
    end: number;
    isCurrent: boolean;
  };
  credits?: number;
  plannedCourses?: PlannedCourse[];
  onCourseDetailsClick?: (courseId: string) => void;
  onDeleteCourseClick?: (plannedCourseId: number) => void;
  dragOverPosition: {
    semesterNumber: number;
    position: number;
    indicatorPosition: 'above' | 'below';
    isLastInSemester?: boolean;
    isSwapMode?: boolean;
    hoveredPlannedCourseId?: number;
  } | null;
  activeDrag?: {
    source: 'search' | 'planned';
    currentSemester?: number;
  } | null;
  validationMap?: ValidationMap;
}

interface SemesterInfo {
  year: number;
  season: 'Fall' | 'Spring';
}

const Semester: React.FC<SemesterProps> = ({
  semesterNumber,
  academicYear,
  credits = 0,
  plannedCourses = [],
  onCourseDetailsClick,
  onDeleteCourseClick,
  dragOverPosition,
  activeDrag,
  validationMap,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-${semesterNumber}`,
    data: {
      semesterNumber: semesterNumber
    }
  });

  const getSemesterInfo = (
    semesterNumber: number,
    academicYear: { start: number; end: number }
  ): SemesterInfo => {
    const isOdd = semesterNumber % 2 === 1;
    const season = isOdd ? 'Fall' : 'Spring';

    const yearOffset = Math.floor(semesterNumber / 2);
    const year = academicYear.start + yearOffset;

    return { year, season };
  };

  const { year, season } = getSemesterInfo(semesterNumber, academicYear);

  // Aggregate wrong-term violations for this semester
  const wrongTermCourses = plannedCourses
    .filter(pc => pc.semesterNumber === semesterNumber)
    .filter(pc => {
      const validation = validationMap?.get(pc.id);
      return validation?.violations.some(v => v.type === 'wrong-term');
    })
    .map(pc => `${pc.subjectCode} ${pc.courseNumber}`);

  const hasWrongTermError = wrongTermCourses.length > 0;

  // Calculate number of courses in this semester
  const coursesInSemester = plannedCourses.filter(
    pc => pc.semesterNumber === semesterNumber
  ).length;

  // Check if dragging from outside this semester
  const isDraggingFromOutside = activeDrag && (
    activeDrag.source === 'search' ||
    activeDrag.currentSemester !== semesterNumber
  );

  // If semester has 7 courses and dragging from outside, don't highlight on hover
  // This prevents dropping on semester border when it's full (only swap with courses allowed)
  const shouldBlockHighlight = coursesInSemester >= 7 && isDraggingFromOutside;

  // Highlight semester when dragging over it (isOver) or when dragging within it (same semester drag)
  // But don't highlight if semester is full and dragging from outside
  const shouldHighlight = !shouldBlockHighlight && (
    isOver || (dragOverPosition !== null && dragOverPosition.semesterNumber === semesterNumber)
  );

  return (
    <div className="semester-container">
      <div className={`semester-card${shouldHighlight ? ' semester-card-over' : ''}`}>
        <div className="semester-header">
          <span className="semester-name">
            {year} {season}
          </span>
          <span className="semester-credits">{credits} credits</span>
        </div>
        <div
          ref={setNodeRef}
          className="semester-body"
        >
          <PlannedCourseList
            semesterNumber={semesterNumber}
            plannedCourses={plannedCourses}
            onCourseDetailsClick={onCourseDetailsClick}
            onDeleteCourseClick={onDeleteCourseClick}
            dragOverPosition={dragOverPosition}
            validationMap={validationMap}
          />
        </div>
      </div>
      {hasWrongTermError && (
        <div className="semester-error">
          Not offered in {season} {year}: {wrongTermCourses.join(', ')}
        </div>
      )}
    </div>
  );
};

export default Semester;
