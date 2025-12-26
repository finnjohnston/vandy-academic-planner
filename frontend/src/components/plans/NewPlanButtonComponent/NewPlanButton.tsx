import React, { useState } from 'react';
import plusIcon from '../../../assets/plus_icon.webp';
import NewPlanPopup from '../NewPlanPopupComponent/NewPlanPopup';
import './NewPlanButton.css';

const NewPlanButton: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <>
      <div className="new-plan-button" onClick={handleClick}>
        <img src={plusIcon} alt="Plus" className="new-plan-icon" />
        <span className="new-plan-text">New Plan</span>
      </div>
      {isPopupOpen && (
        <NewPlanPopup onClose={handleClosePopup} />
      )}
    </>
  );
};

export default NewPlanButton;
