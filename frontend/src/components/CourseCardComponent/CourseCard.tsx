import React from 'react';
import './CourseCard.css';
import type { Course } from '../../types/Course';

interface CourseProps {
  course: Course;
  onClick?: (course: Course) => void;
}

const CourseCardComponent: React.FC<CourseProps> = ({ course, onClick }) => {
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
    <div className="course" onClick={handleClick}>
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
