import React from 'react';
import { useNavigate } from 'react-router-dom';
import backIcon from '../../../../assets/back_icon.png';
import './ReturnToPlanButton.css';

interface ReturnToPlanButtonProps {
  planId?: number;
}

const ReturnToPlanButton: React.FC<ReturnToPlanButtonProps> = ({ planId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (planId) {
      navigate(`/planning/${planId}`);
    } else {
      navigate('/plans');
    }
  };

  return (
    <div className="return-to-plan-button" onClick={handleClick}>
      <img src={backIcon} alt="Back" className="return-to-plan-icon" />
      <span className="return-to-plan-text">Return to plan</span>
    </div>
  );
};

export default ReturnToPlanButton;
