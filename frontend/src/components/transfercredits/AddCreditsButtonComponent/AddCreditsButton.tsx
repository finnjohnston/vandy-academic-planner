import React from 'react';
// import addIcon from '../../../assets/add_icon.png'; // TODO: Add add icon to assets folder
import './AddCreditsButton.css';

interface AddCreditsButtonProps {
  onClick: () => void;
}

const AddCreditsButton: React.FC<AddCreditsButtonProps> = ({ onClick }) => {
  return (
    <button className="add-credits-button" onClick={onClick}>
      {/* TODO: Replace with actual add icon once added to assets */}
      {/* <img src={addIcon} alt="Add" className="add-credits-icon" /> */}
      <div className="add-credits-icon-placeholder">+</div>
      <span className="add-credits-text">Add credits</span>
    </button>
  );
};

export default AddCreditsButton;
