import React from 'react';
import './Requirement.css';

interface RequirementProps {
  isBlurred?: boolean;
}

const Requirement: React.FC<RequirementProps> = ({ isBlurred = false }) => {
  return (
    <div className={`requirement-container${isBlurred ? ' requirement-blurred' : ''}`}>
      <h1 className="requirement-header">Requirements</h1>
      <div className="requirement-content">
        {/* Requirement content will go here */}
      </div>
    </div>
  );
};

export default Requirement;
