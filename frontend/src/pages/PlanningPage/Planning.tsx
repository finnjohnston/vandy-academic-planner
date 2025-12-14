import React, { useState } from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import CourseSearch from '../../components/CourseSearchComponent/CourseSearch';
import './Planning.css';

const Planning: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="planning-page">
      <NavBar isBlurred={isPopupOpen} />
      <CourseSearch
        onPopupOpen={() => setIsPopupOpen(true)}
        onPopupClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
};

export default Planning;
