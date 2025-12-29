import React from 'react';
import backIcon from '../../../../assets/back_icon.png';
import './ReturnToPlanButton.css';

const ReturnToPlanButton: React.FC = () => {
  return (
    <div className="return-to-plan-button">
      <img src={backIcon} alt="Back" className="return-to-plan-icon" />
      <span className="return-to-plan-text">Return to plan</span>
    </div>
  );
};

export default ReturnToPlanButton;
