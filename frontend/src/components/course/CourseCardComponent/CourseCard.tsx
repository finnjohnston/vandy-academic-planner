import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import './CourseCard.css';
import type { Course } from '../../../types/Course';

interface CourseProps {
  course: Course;
  onClick?: (course: Course) => void;
  searchContext?: {
    type: 'year' | 'term';
    termId?: string;
  };
}

const CourseCardComponent: React.FC<CourseProps> = ({ course, onClick, searchContext }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course-${course.id}`,
    data: {
      source: 'search',
      course: course,
      searchContext: searchContext
    }
  });

  const truncateTitle = (title: string, maxLength: number = 40): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const formatCredits = (): string => {
    if (course.creditsMin === course.creditsMax) {
      return course.creditsMin.toString();
    }
    return `${course.creditsMin} - ${course.creditsMax}`;
  };

  const handleClick = () => {
    if (onClick) {
      onClick(course);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`course${isDragging ? ' course-dragging' : ''}`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <span className="course-code">
        {course.subjectCode} {course.courseNumber}
      </span>
      <span className="course-title">
        {truncateTitle(course.title)}
      </span>
      <span className="course-credits">
        {formatCredits()}
      </span>
    </div>
  );
};

export default CourseCardComponent;
