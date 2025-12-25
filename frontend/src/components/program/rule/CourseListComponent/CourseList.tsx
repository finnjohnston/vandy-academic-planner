import React from 'react';
import CourseRow from '../CourseRowComponent/CourseRow';
import './CourseList.css';

interface CourseListProps {
  courses: Array<{
    courseId: string;
    subjectCode: string;
    courseNumber: string;
    title: string;
    term?: string;
    credits: number;
    isTaken?: boolean;
  }>;
  hideTerm?: boolean;
}

const CourseList: React.FC<CourseListProps> = ({ courses, hideTerm = false }) => {
  return (
    <div className="course-list">
      {courses.map((course, index) => (
        <CourseRow
          key={course.courseId}
          subjectCode={course.subjectCode}
          courseNumber={course.courseNumber}
          title={course.title}
          term={course.term}
          credits={course.credits}
          isTaken={course.isTaken}
          isLast={index === courses.length - 1}
          hideTerm={hideTerm}
        />
      ))}
    </div>
  );
};

export default CourseList;
