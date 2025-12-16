import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import PlansTable from '../../components/PlansTableComponent/PlansTable';
import NewPlanButton from '../../components/NewPlanButtonComponent/NewPlanButton';
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
