import React from 'react';
import editIcon from '../../../assets/edit_icon.png';
import './EditProgramsButton.css';

interface EditProgramsButtonProps {
  onClick: () => void;
}

const EditProgramsButton: React.FC<EditProgramsButtonProps> = ({ onClick }) => {
  return (
    <div className="edit-programs-button" onClick={onClick}>
      <img src={editIcon} alt="Edit" className="edit-programs-icon" />
      <span className="edit-programs-text">Edit programs</span>
    </div>
  );
};

export default EditProgramsButton;
