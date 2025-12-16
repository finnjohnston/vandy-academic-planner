import React from 'react';
import './PlansTableHeader.css';

const PlansTableHeader: React.FC = () => {
  return (
    <div className="plans-table-header">
      <span className="header-name">Name</span>
      <span className="header-majors">Majors</span>
      <span className="header-minors">Minors</span>
      <span className="header-modified">Modified</span>
    </div>
  );
};

export default PlansTableHeader;
