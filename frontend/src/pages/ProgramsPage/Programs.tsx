import React, { useState } from 'react';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ProgramSearchBar from '../../components/program/programpage/ProgramSearchBarComponent/ProgramSearchBar';
import ProgramDropdown from '../../components/program/programpage/ProgramDropdownComponent/ProgramDropdown';
import Toggle from '../../components/common/ToggleComponent/Toggle';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import ProgramsTableHeader from '../../components/program/programpage/ProgramsTableHeaderComponent/ProgramsTableHeader';
import Program from '../../components/program/ProgramComponent/Program';
import './Programs.css';

const Programs: React.FC = () => {
  const [showAllCourses, setShowAllCourses] = useState(false);
  return (
    <div className="programs-page">
      <NavBar />
      <div className="programs-content">
        <div className="programs-header">
          <h1>Programs</h1>
          <ReturnToPlanButton />
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
