import React from 'react';
import NavBar from '../../components/NavBarComponent/NavBar';
import CourseSearch from '../../components/CourseSearchComponent/CourseSearch';
import './Planning.css';

const Planning: React.FC = () => {
  return (
    <div className="planning-page">
      <NavBar />
      <CourseSearch />
    </div>
  );
};

export default Planning;
