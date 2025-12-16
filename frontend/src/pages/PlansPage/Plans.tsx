import React from 'react';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import PlansTable from '../../components/plans/PlansTableComponent/PlansTable';
import NewPlanButton from '../../components/plans/NewPlanButtonComponent/NewPlanButton';
import './Plans.css';

const Plans: React.FC = () => {
  return (
    <div className="plans-page">
      <NavBar />
      <div className="plans-content">
        <div className="plans-header">
          <h1>Plans</h1>
          <NewPlanButton />
        </div>
        <PlansTable />
      </div>
    </div>
  );
};

export default Plans;
