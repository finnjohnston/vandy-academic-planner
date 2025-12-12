import React from 'react';
import './CourseList.css';
import type { Course as CourseType } from '../../types/Course';
import CourseCardComponent from '../CourseCardComponent/CourseCard';

interface CourseListProps {
  courses: CourseType[];
  onCourseClick?: (course: CourseType) => void;
}

const CourseList: React.FC<CourseListProps> = ({ courses, onCourseClick }) => {
  return (
    <div className="course-list">
      {courses.map((course) => (
        <CourseCardComponent key={course.id} course={course} onClick={onCourseClick} />
      ))}
    </div>
  );
};

export default CourseList;
