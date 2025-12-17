import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactDOM from 'react-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import Plan from '../../components/plan/PlanComponent/Plan';
import CourseDetail from '../../components/course/CourseDetailComponent/CourseDetail';
import type { Course } from '../../types/Course';
import './Planning.css';

const API_BASE_URL = 'http://localhost:3000';

interface PlanData {
  id: number;
  name: string;
  academicYearId: number;
  academicYear: {
    id: number;
    year: string;
    start: number;
    end: number;
    isCurrent: boolean;
  };
  plannedCourses: Array<{
    id: number;
    courseId: string | null;
    semesterNumber: number;
    credits: number;
    course: Course | null;
  }>;
}

const Planning: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const id = planId || '1';
        const response = await fetch(`${API_BASE_URL}/api/plans/${id}`);
        if (!response.ok) throw new Error('Failed to fetch plan data');
        const result = await response.json();
        setPlanData(result.data);
      } catch (err) {
        console.error('Error fetching plan:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handlePlannedCourseClick = async (courseId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/by-course-id/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setSelectedCourse(data.data);
      setIsPopupOpen(true);
    } catch (err) {
      console.error('Error fetching course:', err);
    }
  };

  const handleClosePopup = () => {
    setSelectedCourse(null);
    setIsPopupOpen(false);
  };

  if (loading) {
    return (
      <div className="planning-page">
        <NavBar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading plan data...
        </div>
      </div>
    );
  }

  if (error || !planData) {
    return (
      <div className="planning-page">
        <NavBar />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          Error: {error || 'No plan data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="planning-page">
      <NavBar isBlurred={isPopupOpen} />
      <CourseSearch
        onPopupOpen={() => setIsPopupOpen(true)}
        onPopupClose={() => setIsPopupOpen(false)}
        isBlurred={isPopupOpen}
      />
      <Plan
        planId={planData.id}
        planName={planData.name}
        academicYear={planData.academicYear}
        plannedCourses={planData.plannedCourses}
        isBlurred={isPopupOpen}
        onCourseClick={handlePlannedCourseClick}
      />

      {selectedCourse && ReactDOM.createPortal(
        <CourseDetail course={selectedCourse} onClose={handleClosePopup} />,
        document.body
      )}
    </div>
  );
};

export default Planning;
