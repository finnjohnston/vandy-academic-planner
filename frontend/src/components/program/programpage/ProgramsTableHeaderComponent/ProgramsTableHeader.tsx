import React from 'react';
import './ProgramsTableHeader.css';

const ProgramsTableHeader: React.FC = () => {
  return (
    <div className="programs-table-header">
      <span className="programs-header-name">Name</span>
      <span className="programs-header-type">Type</span>
      <span className="programs-header-credits">Credits</span>
      <span className="programs-header-in-plan">In plan</span>
    </div>
  );
};

export default ProgramsTableHeader;
