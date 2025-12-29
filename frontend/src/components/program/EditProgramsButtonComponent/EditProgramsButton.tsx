import React from 'react';
import { useNavigate } from 'react-router-dom';
import editIcon from '../../../assets/edit_icon.png';
import './EditProgramsButton.css';

interface EditProgramsButtonProps {
  planId: number;
}

const EditProgramsButton: React.FC<EditProgramsButtonProps> = ({ planId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/programs/${planId}`);
  };

  return (
    <div className="edit-programs-button" onClick={handleClick}>
      <img src={editIcon} alt="Edit" className="edit-programs-icon" />
      <span className="edit-programs-text">Edit programs</span>
    </div>
  );
};

export default EditProgramsButton;
