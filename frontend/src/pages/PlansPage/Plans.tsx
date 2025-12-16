import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import PlansTable from '../../components/PlansTableComponent/PlansTable';
import './Plans.css';

const Plans: React.FC = () => {
  return (
    <div className="plans-page">
      <NavBar />
      <div className="plans-content">
        <h1>Plans</h1>
        <PlansTable />
      </div>
    </div>
  );
};

export default Plans;
