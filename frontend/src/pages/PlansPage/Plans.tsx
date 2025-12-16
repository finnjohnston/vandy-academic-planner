import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import PlansTableHeader from '../../components/PlansTableHeaderComponent/PlansTableHeader';
import PlanListItem from '../../components/PlanListItemComponent/PlanListItem';
import type { Plan } from '../../types/Plan';
import './Plans.css';

const Plans: React.FC = () => {
  // Example plan data for testing
  const examplePlan: Plan = {
    id: 1,
    name: 'Computer Science Fall 2024',
    schoolId: 1,
    academicYearId: 1,
    academicYear: {
      id: 1,
      year: '2024-2025',
      start: 2024,
      end: 2025
    },
    currentSemester: 0,
    isActive: true,
    createdAt: '2024-08-15T10:00:00Z',
    updatedAt: '2024-12-16T14:30:00Z'
  };

  return (
    <div className="plans-page">
      <NavBar />
      <div className="plans-content">
        <h1>Plans</h1>
        <PlansTableHeader />
        <PlanListItem plan={examplePlan} />
      </div>
    </div>
  );
};

export default Plans;
