import React, { useEffect } from 'react';
import type { Course } from '../../types/Course';
import './CourseDetail.css';
import exitIcon from '../../assets/exit_icon.png';

interface CourseDetailProps {
  course: Course;
  onClose: () => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ course, onClose }) => {
  const formatCredits = (min: number, max: number): string => {
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const getAttributesList = (attributes?: Record<string, unknown>): string[] => {
    if (!attributes) return [];

    const allAttributes: string[] = [];
    Object.values(attributes).forEach(value => {
      if (Array.isArray(value)) {
        allAttributes.push(...value);
      }
    });

    return allAttributes;
  };

  const formatCourseLogic = (logic: any): string => {
    if (typeof logic === 'string') {
      return logic;
    }

    if (typeof logic === 'object' && logic !== null) {
      if (logic.$and && Array.isArray(logic.$and)) {
        const formatted = logic.$and.map((item: any) => {
          const result = formatCourseLogic(item);
          const needsParens = typeof item === 'object' && item !== null && typeof item !== 'string';
          return needsParens ? `(${result})` : result;
        });
        return formatted.join(' and ');
      }

      if (logic.$or && Array.isArray(logic.$or)) {
        const formatted = logic.$or.map((item: any) => {
          const result = formatCourseLogic(item);
          const needsParens = typeof item === 'object' && item !== null && typeof item !== 'string';
          return needsParens ? `(${result})` : result;
        });
        return formatted.join(' or ');
      }
    }

    return '';
  };

  const getPrerequisitesText = (requirements?: Record<string, unknown>): string | null => {
    if (!requirements) return null;
    const prereqs = (requirements as any).prerequisites;
    if (!prereqs || !prereqs.courses) return null;
    return formatCourseLogic(prereqs.courses);
  };

  const getCorequisitesText = (requirements?: Record<string, unknown>): string | null => {
    if (!requirements) return null;
    const coreqs = (requirements as any).corequisites;
    if (!coreqs || !coreqs.courses) return null;
    return formatCourseLogic(coreqs.courses);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="course-detail-backdrop" onClick={handleBackdropClick}>
      <div className="course-detail-content">
        <img
          src={exitIcon}
          alt="Close"
          className="course-detail-close-icon"
          onClick={onClose}
        />
        <h2 className="course-detail-header">
          {course.subjectCode} {course.courseNumber} - {course.title}
        </h2>

        <div className="course-detail-sections">
          <div className="course-detail-credits-section">
            <div className="course-detail-credits-label">Credits</div>
            <div className="course-detail-credits-value">
              {formatCredits(course.creditsMin, course.creditsMax)}
            </div>
          </div>
          <div className="course-detail-attributes-section">
            <div className="course-detail-attributes-label">Attributes</div>
            <div className="course-detail-attributes-value">
              {getAttributesList(course.attributes).length > 0 ? (
                getAttributesList(course.attributes).map((attr, index) => (
                  <div key={index}>{attr}</div>
                ))
              ) : (
                'None'
              )}
            </div>
          </div>
          <div className="course-detail-prerequisites-section">
            <div className="course-detail-prerequisites-label">Prerequisites</div>
            <div className="course-detail-prerequisites-value">
              {getPrerequisitesText(course.requirements) || 'None'}
            </div>
          </div>
          <div className="course-detail-corequisites-section">
            <div className="course-detail-corequisites-label">Corequisites</div>
            <div className="course-detail-corequisites-value">
              {getCorequisitesText(course.requirements) || 'None'}
            </div>
          </div>
          <div className="course-detail-description-section">
            <div className="course-detail-description-label">Description</div>
            <div className="course-detail-description-value">
              {course.description || 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
