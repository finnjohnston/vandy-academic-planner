import React, { useState } from 'react';
import RuleDescriptionField from '../rule/RuleDescriptionFieldComponent/RuleDescriptionField';
import CourseTableHeader from '../rule/CourseTableHeaderComponent/CourseTableHeader';
import CourseRow from '../rule/CourseRowComponent/CourseRow';
import ConstraintField from '../rule/ConstraintFieldComponent/ConstraintField';
import './RequirementItem.css';

interface RequirementItemProps {
  name: string;
  creditsText: string;
  isLast?: boolean;
  description?: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({
  name,
  creditsText,
  isLast = false,
  description
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <div
        className={`requirement-item-container${isLast ? ' requirement-item-last' : ''}`}
        onClick={handleToggle}
      >
        <div className="requirement-item-info">
          <span className="requirement-item-name">{name}</span>
          <div className="requirement-item-progress-group">
            <span className="requirement-item-progress-spacer" aria-hidden />
            <span className="requirement-item-credits">{creditsText}</span>
          </div>
        </div>
        <svg className={`requirement-item-dropdown-icon${expanded ? ' expanded' : ''}`} width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1.5L5 5.5L9 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {expanded && description && (
        <RuleDescriptionField description={description} />
      )}
    </>
  );
};

export default RequirementItem;
