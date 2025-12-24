import React from 'react';
import './RequirementItem.css';

interface RequirementItemProps {
  name: string;
  creditsText: string;
  isLast?: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({
  name,
  creditsText,
  isLast = false
}) => {
  return (
    <div className={`requirement-item-container${isLast ? ' requirement-item-last' : ''}`}>
      <div className="requirement-item-info">
        <span className="requirement-item-name">{name}</span>
        <div className="requirement-item-progress-group">
          <span className="requirement-item-progress-spacer" aria-hidden />
          <span className="requirement-item-credits">{creditsText}</span>
        </div>
      </div>
      <svg className="requirement-item-dropdown-icon" width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1.5L5 5.5L9 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default RequirementItem;
