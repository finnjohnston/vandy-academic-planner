import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import './Plans.css';

const Plans: React.FC = () => {
  return (
    <div className="plans-page">
      <NavBar />
      <div className="plans-content">
        <h1>Plans</h1>
      </div>
    </div>
  );
};

export default Plans;
