import React from 'react';
import plusIcon from '../../../assets/plus_icon.webp';
import './NewPlanButton.css';

const NewPlanButton: React.FC = () => {
  return (
    <div className="new-plan-button">
      <img src={plusIcon} alt="Plus" className="new-plan-icon" />
      <span className="new-plan-text">New Plan</span>
    </div>
  );
};

export default NewPlanButton;
