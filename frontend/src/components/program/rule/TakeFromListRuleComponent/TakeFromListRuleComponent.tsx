import React, { useEffect, useState } from 'react';
import RuleDescriptionField from '../RuleDescriptionFieldComponent/RuleDescriptionField';
import CourseTableHeader from '../CourseTableHeaderComponent/CourseTableHeader';
import CourseList from '../CourseListComponent/CourseList';
import ConstraintField from '../ConstraintFieldComponent/ConstraintField';
import type { RequirementProgress, TakeFromListProgressDetails } from '../../../../types/RequirementProgress';
import './TakeFromListRuleComponent.css';

const API_BASE_URL = 'http://localhost:3000';

interface TakeFromListRuleComponentProps {
  requirementProgress: RequirementProgress;
  academicYearId: number;
  nestingLevel?: number;
}

interface CourseData {
  courseId: string;
  title: string;
  creditsMin: number;
}

const isTakeFromListRule = (details: any): details is TakeFromListProgressDetails => {
  return details.type === 'take_from_list';
};

const TakeFromListRuleComponent: React.FC<TakeFromListRuleComponentProps> = ({
  requirementProgress,
  academicYearId,
  nestingLevel = 0
}) => {
  // Always call hooks first (Rules of Hooks)
  const [courseData, setCourseData] = useState<Map<string, CourseData>>(new Map());
  const [loading, setLoading] = useState(true);

  // Check if this is a take_from_list rule
  const isTakeFromList = isTakeFromListRule(requirementProgress.ruleProgress.details);
  const details = isTakeFromList ? (requirementProgress.ruleProgress.details as TakeFromListProgressDetails) : null;

  useEffect(() => {
    if (!isTakeFromList || !details) {
      setLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      setLoading(true);
      const coursePromises = details.availableCourses.map(async (courseId: string) => {
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

    if (details.availableCourses.length > 0) {
      fetchCourseData();
    } else {
      setLoading(false);
    }
  }, [isTakeFromList, details?.availableCourses]);

  // Return null if not take_from_list rule (after all hooks have been called)
  if (!isTakeFromList || !details) {
    return null;
  }

  const transformCoursesForDisplay = () => {
    const coursesWithTakenStatus = details.availableCourses.map((courseId: string) => {
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
        term: fulfillment?.termLabel,
        credits: course?.creditsMin || 0,
        isTaken: !!fulfillment,
      };
    });

    // Sort: taken courses first, then untaken courses
    return coursesWithTakenStatus.sort((a, b) => {
      if (a.isTaken && !b.isTaken) return -1;
      if (!a.isTaken && b.isTaken) return 1;
      return 0;
    });
  };

  const courses = transformCoursesForDisplay();

  return (
    <div className="take-from-list-rule-component">
      {requirementProgress.description && (
        <RuleDescriptionField
          description={requirementProgress.description}
          nestingLevel={nestingLevel}
        />
      )}
      {courses.length > 0 && (
        <>
          <CourseTableHeader nestingLevel={nestingLevel} />
          <CourseList courses={courses} nestingLevel={nestingLevel} />
        </>
      )}
      {requirementProgress.constraintValidation &&
       requirementProgress.constraintValidation.results.length > 0 && (
        <>
          {requirementProgress.constraintValidation.results.map((result, index) => (
            <ConstraintField
              key={index}
              constraint={result.message}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default TakeFromListRuleComponent;
