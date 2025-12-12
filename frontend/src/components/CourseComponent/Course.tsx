import React from 'react';
import './Course.css';

interface Course {
  id: number;
  courseId: string;
  subjectCode: string;
  courseNumber: string;
  title: string;
  creditsMin: number;
  creditsMax: number;
  academicYearId: number;
  school: string | null;
  typicallyOffered: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CourseProps {
  course: Course;
  onClick?: (course: Course) => void;
}

const Course: React.FC<CourseProps> = ({ course, onClick }) => {
  const truncateTitle = (title: string, maxLength: number = 25): string => {
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

export default Course;
