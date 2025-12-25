import React, { useEffect, useState } from 'react';
import RuleDescriptionField from '../RuleDescriptionFieldComponent/RuleDescriptionField';
import CourseTableHeader from '../CourseTableHeaderComponent/CourseTableHeader';
import CourseList from '../CourseListComponent/CourseList';
import ConstraintField from '../ConstraintFieldComponent/ConstraintField';
import FilterCoursesToggle from '../../../../components/program/rule/FilterCoursesToggleComponent/FilterCoursesToggle';
import type { RequirementProgress, TakeAnyCoursesProgressDetails } from '../../../../types/RequirementProgress';
import './TakeAnyCoursesRuleComponent.css';

const API_BASE_URL = 'http://localhost:3000';

interface TakeAnyCoursesRuleComponentProps {
  requirementProgress: RequirementProgress;
  academicYearId: number;
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
  academicYearId
}) => {
  const [courseData, setCourseData] = useState<Map<string, CourseData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterToggle, setFilterToggle] = useState(false);

  const isTakeAnyCourses = isTakeAnyCoursesRule(requirementProgress.ruleProgress.details);
  const details = isTakeAnyCourses ? (requirementProgress.ruleProgress.details as TakeAnyCoursesProgressDetails) : null;

  useEffect(() => {
    if (!isTakeAnyCourses || !details) {
      setLoading(false);
      return;
    }

    console.log('Toggle state:', filterToggle);
    console.log('Details:', details);
    console.log('Matching courses:', details.matchingCourses);
    console.log('Fulfilling courses:', requirementProgress.fulfillingCourses);

    const fetchCourseData = async () => {
      setLoading(true);

      // Determine which courses to fetch based on toggle state
      const courseIds = filterToggle
        ? details.matchingCourses.map(mc => mc.courseId)  // All matching courses
        : requirementProgress.fulfillingCourses.map(fc => fc.courseId);  // Only planned courses

      console.log('Course IDs to fetch:', courseIds);

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
      // Toggle ON: Show ALL matching courses, sorted with taken first
      if (!details.matchingCourses || details.matchingCourses.length === 0) {
        return [];
      }

      const coursesWithTakenStatus = details.matchingCourses.map((matchingCourse) => {
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
          term: fulfillment?.termLabel,
          credits: course?.creditsMin || 0,
          isTaken: !!fulfillment,
        };
      });

      // Sort: taken courses first, then by subject code, then by course number
      return coursesWithTakenStatus.sort((a, b) => {
        // First, sort by taken status (taken first)
        if (a.isTaken && !b.isTaken) return -1;
        if (!a.isTaken && b.isTaken) return 1;

        // Then sort by subject code
        const subjectCompare = a.subjectCode.localeCompare(b.subjectCode);
        if (subjectCompare !== 0) return subjectCompare;

        // Finally, sort by course number (convert to number for proper numeric sorting)
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
          term: fulfillment.termLabel,
          credits: course?.creditsMin || 0,
          isTaken: true,
        };
      });
    }
  };

  const courses = transformCoursesForDisplay();

  return (
    <div className="take-any-courses-rule-component">
      <RuleDescriptionField description={requirementProgress.description} />
      <div className="take-any-courses-header-wrapper">
        <div className={`take-any-courses-header${filterToggle ? ' take-any-courses-header-no-term' : ''}`}>
          <span className="take-any-courses-header-course">Course</span>
          <span className="take-any-courses-header-title">Title</span>
          {!filterToggle && <span className="take-any-courses-header-term">Term</span>}
          <span className="take-any-courses-header-credits">Credits</span>
        </div>
        <div className="take-any-courses-header-toggle-section">
          <FilterCoursesToggle
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
        <CourseList courses={courses} hideTerm={filterToggle} />
      )}
      <ConstraintField constraintValidation={requirementProgress.constraintValidation} />
    </div>
  );
};

export default TakeAnyCoursesRuleComponent;
