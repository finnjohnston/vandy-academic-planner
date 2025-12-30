import React from 'react';
import './TransferCreditsTableHeader.css';

const TransferCreditsTableHeader: React.FC = () => {
  return (
    <div className="transfer-credits-table-header">
      <span className="transfer-credits-header-course">Course</span>
      <span className="transfer-credits-header-title">Title</span>
      <span className="transfer-credits-header-credits">Credits</span>
    </div>
  );
};

export default TransferCreditsTableHeader;
