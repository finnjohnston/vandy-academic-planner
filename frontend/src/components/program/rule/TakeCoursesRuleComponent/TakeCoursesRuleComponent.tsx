import React, { useEffect, useState } from 'react';
import RuleDescriptionField from '../RuleDescriptionFieldComponent/RuleDescriptionField';
import CourseTableHeader from '../CourseTableHeaderComponent/CourseTableHeader';
import CourseList from '../CourseListComponent/CourseList';
import ConstraintField from '../ConstraintFieldComponent/ConstraintField';
import type { RequirementProgress, TakeCoursesProgressDetails } from '../../../../types/RequirementProgress';
import './TakeCoursesRuleComponent.css';

const API_BASE_URL = 'http://localhost:3000';

interface TakeCoursesRuleComponentProps {
  requirementProgress: RequirementProgress;
  academicYearId: number;
  nestingLevel?: number;
  onCourseClick?: (courseId: string) => void;
}

interface CourseData {
  courseId: string;
  title: string;
  creditsMin: number;
}

const isTakeCoursesRule = (details: any): details is TakeCoursesProgressDetails => {
  return details.type === 'take_courses';
};

const TakeCoursesRuleComponent: React.FC<TakeCoursesRuleComponentProps> = ({
  requirementProgress,
  academicYearId,
  nestingLevel = 0,
  onCourseClick
}) => {
  // Always call hooks first (Rules of Hooks)
  const [courseData, setCourseData] = useState<Map<string, CourseData>>(new Map());
  const [loading, setLoading] = useState(true);

  // Check if this is a take_courses rule
  const isTakeCourses = isTakeCoursesRule(requirementProgress.ruleProgress.details);
  const details = isTakeCourses ? (requirementProgress.ruleProgress.details as TakeCoursesProgressDetails) : null;

  useEffect(() => {
    if (!isTakeCourses || !details) {
      setLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      setLoading(true);
      const coursePromises = details.requiredCourses.map(async (courseId: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/courses/by-course-id/${encodeURIComponent(courseId)}?academicYearId=${academicYearId}`);
          if (!response.ok) throw new Error('Failed to fetch course');
          const data = await response.json();
          return {
            courseId,
            data: data.data as CourseData | null
          };
        } catch (error) {
          console.error(`Error fetching course ${courseId}:`, error);
          return {
            courseId,
            data: null as CourseData | null
          };
        }
      });

      const results = await Promise.all(coursePromises);
      const newCourseData = new Map<string, CourseData>();
      results.forEach(({ courseId, data }: { courseId: string; data: CourseData | null }) => {
        if (data) {
          newCourseData.set(courseId, {
            courseId: data.courseId,
            title: data.title,
            creditsMin: data.creditsMin
          });
        }
      });
      setCourseData(newCourseData);
      setLoading(false);
    };

    if (details.requiredCourses.length > 0) {
      fetchCourseData();
    } else {
      setLoading(false);
    }
  }, [isTakeCourses, details?.requiredCourses]);

  // Return null if not take_courses rule (after all hooks have been called)
  if (!isTakeCourses || !details) {
    return null;
  }

  const transformCoursesForDisplay = () => {
    return details.requiredCourses.map((courseId: string) => {
      const course = courseData.get(courseId);
      const fulfillment = requirementProgress.fulfillingCourses.find(
        (fc) => fc.courseId === courseId
      );

      const [subjectCode, ...numberParts] = courseId.split(' ');

      return {
        courseId,
        subjectCode: subjectCode || courseId,
        courseNumber: numberParts.join(' ') || '',
        title: course?.title || (loading ? 'Loading...' : courseId),
        term: fulfillment?.semesterNumber === 0 ? 'Transferred' : fulfillment?.termLabel,
        credits: course?.creditsMin || 0,
        isTaken: !!fulfillment,
      };
    });
  };

  const courses = transformCoursesForDisplay();

  return (
    <div className="take-courses-rule-component">
      {requirementProgress.description && (
        <RuleDescriptionField
          description={requirementProgress.description}
          nestingLevel={nestingLevel}
        />
      )}
      {courses.length > 0 && (
        <>
          <CourseTableHeader nestingLevel={nestingLevel} />
          <CourseList courses={courses} nestingLevel={nestingLevel} onCourseClick={onCourseClick} />
        </>
      )}
      {requirementProgress.constraintValidation &&
       requirementProgress.constraintValidation.results.length > 0 && (
        <ConstraintField constraintValidation={requirementProgress.constraintValidation} />
      )}
    </div>
  );
};

export default TakeCoursesRuleComponent;
