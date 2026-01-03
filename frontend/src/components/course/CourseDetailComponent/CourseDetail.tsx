import React, { useEffect } from 'react';
import type { Course } from '../../../types/Course';
import { usePlanContext } from '../../../contexts/PlanContext';
import { isCourseInPlan, extractCourseIds } from '../../../utils/courseUtils';
import './CourseDetail.css';
import exitIcon from '../../../assets/exit_icon.png';

interface CourseDetailProps {
  course: Course;
  onClose: () => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ course, onClose }) => {
  const { plannedCourses } = usePlanContext();
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

  // Helper function to format logic as plain text without colors
  const formatCourseLogicPlain = (logic: any): string => {
    if (typeof logic === 'string') {
      return logic;
    }

    if (typeof logic === 'object' && logic !== null) {
      if (logic.$and && Array.isArray(logic.$and)) {
        const formatted = logic.$and.map((item: any) => {
          const result = formatCourseLogicPlain(item);
          const needsParens = typeof item === 'object' && item !== null;
          return needsParens ? `(${result})` : result;
        });
        return formatted.join(' and ');
      }

      if (logic.$or && Array.isArray(logic.$or)) {
        const formatted = logic.$or.map((item: any) => {
          const result = formatCourseLogicPlain(item);
          const needsParens = typeof item === 'object' && item !== null;
          return needsParens ? `(${result})` : result;
        });
        return formatted.join(' or ');
      }
    }

    return '';
  };

  const formatCourseLogicWithColors = (logic: any): React.ReactNode => {
    // Base case: individual course
    if (typeof logic === 'string') {
      const isInPlan = isCourseInPlan(logic, plannedCourses);
      return (
        <span className={isInPlan ? 'course-in-plan' : 'course-not-in-plan'}>
          {logic}
        </span>
      );
    }

    // Handle $or groups
    if (typeof logic === 'object' && logic !== null && logic.$or && Array.isArray(logic.$or)) {
      const allCoursesInGroup = extractCourseIds(logic);
      const anyInPlan = allCoursesInGroup.some(id => isCourseInPlan(id, plannedCourses));

      // OR is satisfied if ANY course is in plan - color whole group green
      if (anyInPlan && allCoursesInGroup.length > 1) {
        const plainText = formatCourseLogicPlain(logic);
        return <span className="course-group-satisfied">{plainText}</span>;
      }

      // Otherwise format with individual colors
      const formatted = logic.$or.map((item: any, index: number) => {
        const result = formatCourseLogicWithColors(item);
        const needsParens = typeof item === 'object' && item !== null;

        let content;
        if (needsParens) {
          // Check if the nested group is satisfied to color parentheses
          const nestedCourses = extractCourseIds(item);
          const isNestedSatisfied = item.$or
            ? nestedCourses.some(id => isCourseInPlan(id, plannedCourses))
            : nestedCourses.every(id => isCourseInPlan(id, plannedCourses));

          if (isNestedSatisfied) {
            content = <span className="course-group-satisfied">({result})</span>;
          } else {
            content = <span className="course-not-in-plan">({result})</span>;
          }
        } else {
          content = result;
        }

        // Add 'or' separator between items
        if (index < logic.$or.length - 1) {
          return <React.Fragment key={index}>{content} or </React.Fragment>;
        }
        return <React.Fragment key={index}>{content}</React.Fragment>;
      });

      return <>{formatted}</>;
    }

    // Handle $and groups
    if (typeof logic === 'object' && logic !== null && logic.$and && Array.isArray(logic.$and)) {
      const allCoursesInGroup = extractCourseIds(logic);
      const allInPlan = allCoursesInGroup.every(id => isCourseInPlan(id, plannedCourses));

      // AND is satisfied if ALL courses are in plan - color whole group green
      if (allInPlan && allCoursesInGroup.length > 1) {
        const plainText = formatCourseLogicPlain(logic);
        return <span className="course-group-satisfied">{plainText}</span>;
      }

      // Otherwise format with individual colors
      const formatted = logic.$and.map((item: any, index: number) => {
        const result = formatCourseLogicWithColors(item);
        const needsParens = typeof item === 'object' && item !== null;

        let content;
        if (needsParens) {
          // Check if the nested group is satisfied to color parentheses
          const nestedCourses = extractCourseIds(item);
          const isNestedSatisfied = item.$or
            ? nestedCourses.some(id => isCourseInPlan(id, plannedCourses))
            : nestedCourses.every(id => isCourseInPlan(id, plannedCourses));

          if (isNestedSatisfied) {
            content = <span className="course-group-satisfied">({result})</span>;
          } else {
            content = <span className="course-not-in-plan">({result})</span>;
          }
        } else {
          content = result;
        }

        // Add 'and' separator between items
        if (index < logic.$and.length - 1) {
          return <React.Fragment key={index}>{content} and </React.Fragment>;
        }
        return <React.Fragment key={index}>{content}</React.Fragment>;
      });

      return <>{formatted}</>;
    }

    return null;
  };

  const getPrerequisitesJSX = (requirements?: Record<string, unknown>): React.ReactNode => {
    if (!requirements) return null;
    const prereqs = (requirements as any).prerequisites;
    if (!prereqs || !prereqs.courses) return null;
    return formatCourseLogicWithColors(prereqs.courses);
  };

  const getCorequisitesJSX = (requirements?: Record<string, unknown>): React.ReactNode => {
    if (!requirements) return null;
    const coreqs = (requirements as any).corequisites;
    if (!coreqs || !coreqs.courses) return null;
    return formatCourseLogicWithColors(coreqs.courses);
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
              {getPrerequisitesJSX(course.requirements) || 'None'}
            </div>
          </div>
          <div className="course-detail-corequisites-section">
            <div className="course-detail-corequisites-label">Corequisites</div>
            <div className="course-detail-corequisites-value">
              {getCorequisitesJSX(course.requirements) || 'None'}
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
