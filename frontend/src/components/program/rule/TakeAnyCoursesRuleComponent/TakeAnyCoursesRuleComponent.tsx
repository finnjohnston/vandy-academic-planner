import React, { useEffect, useState } from 'react';
import RuleDescriptionField from '../RuleDescriptionFieldComponent/RuleDescriptionField';
import CourseList from '../CourseListComponent/CourseList';
import ConstraintField from '../ConstraintFieldComponent/ConstraintField';
import Toggle from '../../../common/ToggleComponent/Toggle';
import type { RequirementProgress, TakeAnyCoursesProgressDetails } from '../../../../types/RequirementProgress';
import './TakeAnyCoursesRuleComponent.css';

const API_BASE_URL = 'http://localhost:3000';

interface TakeAnyCoursesRuleComponentProps {
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

const isTakeAnyCoursesRule = (details: any): details is TakeAnyCoursesProgressDetails => {
  return details.type === 'take_any_courses';
};

const TakeAnyCoursesRuleComponent: React.FC<TakeAnyCoursesRuleComponentProps> = ({
  requirementProgress,
  academicYearId,
  nestingLevel = 0,
  onCourseClick
}) => {
  const [courseData, setCourseData] = useState<Map<string, CourseData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterToggle, setFilterToggle] = useState(false);

  const isTakeAnyCourses = isTakeAnyCoursesRule(requirementProgress.ruleProgress.details);
  const details = isTakeAnyCourses ? (requirementProgress.ruleProgress.details as TakeAnyCoursesProgressDetails) : null;
  const indent = 60 * nestingLevel;

  useEffect(() => {
    if (!isTakeAnyCourses || !details) {
      setLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      setLoading(true);

      // Determine which courses to fetch based on toggle state
      const courseIds = filterToggle
        ? details.matchingCourses.map(mc => mc.courseId)  // All matching courses
        : requirementProgress.fulfillingCourses.map(fc => fc.courseId);  // Only planned courses

      const coursePromises = courseIds.map(async (courseId: string) => {
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

    if (filterToggle ? details.matchingCourses.length > 0 : requirementProgress.fulfillingCourses.length > 0) {
      fetchCourseData();
    } else {
      setLoading(false);
    }
  }, [isTakeAnyCourses, details, academicYearId, requirementProgress.fulfillingCourses, filterToggle]);

  if (!isTakeAnyCourses || !details) {
    return null;
  }

  const transformCoursesForDisplay = () => {
    if (filterToggle) {
      // Toggle ON: Show only matching courses that haven't been taken yet
      if (!details.matchingCourses || details.matchingCourses.length === 0) {
        return [];
      }

      const coursesWithTakenStatus = details.matchingCourses
        .map((matchingCourse) => {
          const courseId = matchingCourse.courseId;
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
        })
        .filter(course => !course.isTaken); // Filter out courses that have been taken

      // Sort by subject code, then by course number
      return coursesWithTakenStatus.sort((a, b) => {
        // Sort by subject code
        const subjectCompare = a.subjectCode.localeCompare(b.subjectCode);
        if (subjectCompare !== 0) return subjectCompare;

        // Sort by course number (convert to number for proper numeric sorting)
        const aNum = parseInt(a.courseNumber.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(b.courseNumber.replace(/\D/g, ''), 10) || 0;
        return aNum - bNum;
      });
    } else {
      // Toggle OFF: Show only fulfilling courses
      if (requirementProgress.fulfillingCourses.length === 0) {
        return [];
      }

      return requirementProgress.fulfillingCourses.map((fulfillment) => {
        const courseId = fulfillment.courseId;
        const course = courseData.get(courseId);
        const [subjectCode, ...numberParts] = courseId.split(' ');

        return {
          courseId,
          subjectCode: subjectCode || courseId,
          courseNumber: numberParts.join(' ') || '',
          title: course?.title || (loading ? 'Loading...' : courseId),
          term: fulfillment.semesterNumber === 0 ? 'Transferred' : fulfillment.termLabel,
          credits: course?.creditsMin || 0,
          isTaken: true,
        };
      });
    }
  };

  const courses = transformCoursesForDisplay();

  return (
    <div className="take-any-courses-rule-component">
      {requirementProgress.description && (
        <RuleDescriptionField
          description={requirementProgress.description}
          nestingLevel={nestingLevel}
        />
      )}
      <div
        className="take-any-courses-header-wrapper"
        style={{ width: `calc(100% - ${60 * (nestingLevel + 1)}px)` }}
      >
        <div
          className={`take-any-courses-header${filterToggle ? ' take-any-courses-header-no-term' : ''}`}
          style={{
            gridTemplateColumns: filterToggle
              ? `${260 - indent}px 1fr auto`
              : `${260 - indent}px 1fr 507px auto`
          }}
        >
          <span className="take-any-courses-header-course">Course</span>
          <span className="take-any-courses-header-title">Title</span>
          {!filterToggle && <span className="take-any-courses-header-term">Term</span>}
          <span className="take-any-courses-header-credits">Credits</span>
        </div>
        <div className="take-any-courses-header-toggle-section">
          <Toggle
            isOn={filterToggle}
            onToggle={() => setFilterToggle(!filterToggle)}
          />
          <span className="take-any-courses-header-possible-courses">Possible courses</span>
        </div>
      </div>
      {courses.length === 0 ? (
        <div className="take-any-courses-empty-row">
          <span className="take-any-courses-empty-text">No courses planned</span>
        </div>
      ) : (
        <CourseList courses={courses} hideTerm={filterToggle} nestingLevel={nestingLevel} onCourseClick={onCourseClick} />
      )}
      <ConstraintField constraintValidation={requirementProgress.constraintValidation} />
    </div>
  );
};

export default TakeAnyCoursesRuleComponent;
