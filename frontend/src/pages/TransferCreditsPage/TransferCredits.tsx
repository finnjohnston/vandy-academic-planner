import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import AddCreditsButton from '../../components/transfercredits/AddCreditsButtonComponent/AddCreditsButton';
import TransferSearchToggle from '../../components/transfercredits/TransferSearchToggleComponent/TransferSearchToggle';
import TransferCreditsTableHeader from '../../components/transfercredits/TransferCreditsTableHeaderComponent/TransferCreditsTableHeader';
import TransferCourseList from '../../components/transfercredits/TransferCourseListComponent/TransferCourseList';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import type { Plan } from '../../types/Plan';
import type { PlannedCourse } from '../../types/PlannedCourse';
import './TransferCredits.css';

const API_BASE_URL = 'http://localhost:3000';

const TransferCredits: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [transferCourses, setTransferCourses] = useState<PlannedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  // Fetch plan and transfer courses
  useEffect(() => {
    if (!planId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch plan and transfer courses in parallel
        const [planResponse, coursesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/plans/${planId}`),
          fetch(`${API_BASE_URL}/api/plans/${planId}/courses?semesterNumber=0`)
        ]);

        if (!planResponse.ok) throw new Error('Failed to fetch plan');
        if (!coursesResponse.ok) throw new Error('Failed to fetch transfer courses');

        const planData = await planResponse.json();
        const coursesData = await coursesResponse.json();

        setPlan(planData.data);
        setTransferCourses(coursesData.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  return (
    <div className="transfer-credits-page">
      <NavBar />
      {isSearchOpen && plan && (
        <CourseSearch
          hideFilters={true}
          fixedAcademicYearId={plan.academicYearId}
        />
      )}
      <div className={`transfer-credits-search-wrapper${isSearchOpen ? ' transfer-credits-search-wrapper-shifted' : ''}`}>
        <TransferSearchToggle onClick={toggleSearch} />
      </div>
      <div className={`transfer-credits-content${isSearchOpen ? ' transfer-credits-content-shifted' : ''}`}>
        <div className="transfer-credits-header">
          <h1>Transfer credits</h1>
          <div className="transfer-credits-header-buttons">
            <AddCreditsButton onClick={openSearch} />
            <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
          </div>
        </div>
        <TransferCreditsTableHeader />
        <TransferCourseList
          courses={transferCourses}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default TransferCredits;
