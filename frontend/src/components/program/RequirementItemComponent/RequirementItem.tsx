import React, { useState } from 'react';
import RuleRenderer from '../rule/RuleRendererComponent/RuleRenderer';
import CourseDetail from '../../course/CourseDetailComponent/CourseDetail';
import type { RequirementProgress } from '../../../types/RequirementProgress';
import type { Course } from '../../../types/Course';
import './RequirementItem.css';

interface RequirementItemProps {
  requirementProgress: RequirementProgress;
  academicYearId: number;
  isLast?: boolean;
  isExpanded?: boolean;
  hasBorderTop?: boolean;
  onToggle?: (isExpanded: boolean) => void;
}

const RequirementItem: React.FC<RequirementItemProps> = ({
  requirementProgress,
  academicYearId,
  isLast = false,
  isExpanded = false,
  hasBorderTop = false,
  onToggle
}) => {
  const name = requirementProgress.title;
  const creditsText = `${requirementProgress.creditsFulfilled} / ${requirementProgress.creditsRequired} credits`;

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [_isLoadingCourse, setIsLoadingCourse] = useState(false);

  const handleToggle = () => {
    onToggle?.(!isExpanded);
  };

  const handleCourseClick = async (courseId: string) => {
    setIsLoadingCourse(true);
    setSelectedCourseId(courseId);

    try {
      const response = await fetch(
        `http://localhost:3000/api/courses/by-course-id/${encodeURIComponent(courseId)}?academicYearId=${academicYearId}`
      );
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourseData(data.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      setSelectedCourseId(null);
    } finally {
      setIsLoadingCourse(false);
    }
  };

  const handleClosePopup = () => {
    setSelectedCourseId(null);
    setCourseData(null);
  };

  return (
    <>
      <div
        className={`requirement-item-container${isLast ? ' requirement-item-last' : ''}${isExpanded ? ' requirement-item-expanded' : ''}${hasBorderTop ? ' requirement-item-border-top' : ''}`}
        onClick={handleToggle}
      >
        <div className="requirement-item-info">
          <span className="requirement-item-name">{name}</span>
          <div className="requirement-item-progress-group">
            <span className="requirement-item-progress-spacer" aria-hidden />
            <span className="requirement-item-credits">{creditsText}</span>
          </div>
        </div>
        <svg className={`requirement-item-dropdown-icon${isExpanded ? ' expanded' : ''}`} width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1.5L5 5.5L9 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isExpanded && (
        <RuleRenderer
          ruleProgress={requirementProgress.ruleProgress}
          description={requirementProgress.description}
          fulfillingCourses={requirementProgress.fulfillingCourses}
          constraintValidation={requirementProgress.constraintValidation}
          academicYearId={academicYearId}
          nestingLevel={0}
          onCourseClick={handleCourseClick}
        />
      )}
      {selectedCourseId && courseData && (
        <CourseDetail
          course={courseData}
          onClose={handleClosePopup}
        />
      )}
    </>
  );
};

export default RequirementItem;
