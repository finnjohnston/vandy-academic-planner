import React, { useState } from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import CourseSearch from '../../components/CourseSearchComponent/CourseSearch';
import Plan from '../../components/PlanComponent/Plan';
import './Planning.css';

const Planning: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="planning-page">
      <NavBar isBlurred={isPopupOpen} />
      <CourseSearch
        onPopupOpen={() => setIsPopupOpen(true)}
        onPopupClose={() => setIsPopupOpen(false)}
        isBlurred={isPopupOpen}
      />
      <Plan planId={1} planName="My Plan" startingYear={2025} isBlurred={isPopupOpen} />
    </div>
  );
};

export default Planning;
