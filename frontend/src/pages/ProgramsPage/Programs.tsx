import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ProgramSearchBar from '../../components/program/programpage/ProgramSearchBarComponent/ProgramSearchBar';
import ProgramDropdown from '../../components/program/programpage/ProgramDropdownComponent/ProgramDropdown';
import Toggle from '../../components/common/ToggleComponent/Toggle';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import ProgramsTableHeader from '../../components/program/programpage/ProgramsTableHeaderComponent/ProgramsTableHeader';
import Program from '../../components/program/ProgramComponent/Program';
import './Programs.css';

interface PlanData {
  id: number;
  name: string;
  academicYearId: number;
  schoolId: number | null;
  programs: Array<{
    id: number;
    program: {
      id: number;
      programId: string;
      name: string;
      type: string;
      totalCredits: number;
    };
  }>;
}

const Programs: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(!!planId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/plans/${planId}`);
        if (!response.ok) throw new Error('Failed to fetch plan data');
        const result = await response.json();
        setPlanData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  if (loading) {
    return (
      <div className="programs-page">
        <NavBar />
        <div className="programs-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading plan data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="programs-page">
        <NavBar />
        <div className="programs-content">
          <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="programs-page">
      <NavBar />
      <div className="programs-content">
        <div className="programs-header">
          <h1>Programs</h1>
          <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
        </div>
        <div className="programs-search-wrapper">
          <ProgramSearchBar />
          <ProgramDropdown />
          <div className="programs-toggle-section">
            <Toggle
              isOn={showAllCourses}
              onToggle={() => setShowAllCourses(!showAllCourses)}
            />
            <span className="programs-toggle-text">All programs</span>
          </div>
        </div>
        <ProgramsTableHeader />
        <Program
          name="Computer Science"
          type="Major"
          creditsText="45 / 51 credits"
          progressPercent={88}
          academicYearId={1}
          sections={[
            {
              sectionId: 'core',
              title: 'Core Requirements',
              creditsRequired: 30,
              creditsFulfilled: 24,
              percentage: 80,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Programs;
