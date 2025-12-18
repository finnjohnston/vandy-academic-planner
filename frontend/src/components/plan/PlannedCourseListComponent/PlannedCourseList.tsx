import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import './PlannedCourseList.css';
import type { PlannedCourse as PlannedCourseType } from '../../../types/PlannedCourse';
import PlannedCourse from '../PlannedCourseComponent/PlannedCourse';

interface PlannedCourseListProps {
  semesterNumber: number;
  plannedCourses: PlannedCourseType[];
  onCourseDetailsClick?: (courseId: string) => void;
  onDeleteCourseClick?: (plannedCourseId: number) => void;
}

const PlannedCourseList: React.FC<PlannedCourseListProps> = ({
  semesterNumber,
  plannedCourses,
  onCourseDetailsClick,
  onDeleteCourseClick,
}) => {
  // Filter and sort by position
  const semesterCourses = plannedCourses
    .filter((course) => course.semesterNumber === semesterNumber)
    .sort((a, b) => a.position - b.position);

  const courseIds = semesterCourses.map(
    (course) => `planned-course-${course.id}`
  );

  return (
    <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
      <div className="planned-course-list">
        {semesterCourses.map((plannedCourse) => (
          <PlannedCourse
            key={plannedCourse.id}
            plannedCourseId={plannedCourse.id}
            courseId={plannedCourse.courseId || ''}
            subjectCode={plannedCourse.subjectCode}
            courseNumber={plannedCourse.courseNumber}
            credits={plannedCourse.credits}
            semesterNumber={semesterNumber}
            position={plannedCourse.position}
            onCourseDetailsClick={onCourseDetailsClick}
            onDeleteCourseClick={onDeleteCourseClick}
          />
        ))}
      </div>
    </SortableContext>
  );
};

export default PlannedCourseList;
