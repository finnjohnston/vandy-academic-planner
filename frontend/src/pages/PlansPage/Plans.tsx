import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import PlansTableHeader from '../../components/PlansTableHeaderComponent/PlansTableHeader';
import './Plans.css';

const Plans: React.FC = () => {
  return (
    <div className="plans-page">
      <NavBar />
      <div className="plans-content">
        <h1>Plans</h1>
        <PlansTableHeader />
      </div>
    </div>
  );
};

export default Plans;
