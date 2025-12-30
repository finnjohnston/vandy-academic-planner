import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import AddCreditsButton from '../../components/transfercredits/AddCreditsButtonComponent/AddCreditsButton';
import TransferSearchToggle from '../../components/transfercredits/TransferSearchToggleComponent/TransferSearchToggle';
import TransferCreditsTableHeader from '../../components/transfercredits/TransferCreditsTableHeaderComponent/TransferCreditsTableHeader';
import TransferCourseRow from '../../components/transfercredits/TransferCourseRowComponent/TransferCourseRow';
import CourseSearch from '../../components/course/CourseSearchComponent/CourseSearch';
import type { Plan } from '../../types/Plan';
import './TransferCredits.css';

const API_BASE_URL = 'http://localhost:3000';

const TransferCredits: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  // Fetch plan data to get academic year
  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`);
        if (!response.ok) throw new Error('Failed to fetch plan');
        const data = await response.json();
        setPlan(data.data);
      } catch (err) {
        console.error('Error fetching plan:', err);
      }
    };

    fetchPlan();
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
        <div className="transfer-credits-list">
          {/* Example transfer course rows */}
          <TransferCourseRow
            course="MATH 1300"
            title="Differential and Integral Calculus I"
            credits={3}
          />
          <TransferCourseRow
            course="CS 1101"
            title="Programming and Problem Solving"
            credits={3}
          />
          <TransferCourseRow
            course="PHYS 1601"
            title="Introductory Physics I"
            credits={4}
            isLast={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferCredits;
