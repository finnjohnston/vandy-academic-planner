import React, { useEffect, useState } from 'react';
import './EditProgramsPopup.css';
import exitIcon from '../../../assets/exit_icon.png';
import searchIcon from '../../../assets/search_icon.svg';

interface EditProgramsPopupProps {
  onClose: () => void;
}

const EditProgramsPopup: React.FC<EditProgramsPopupProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="edit-programs-popup-backdrop" onClick={handleBackdropClick}>
      <div className="edit-programs-popup-content">
        <img
          src={exitIcon}
          alt="Close"
          className="edit-programs-popup-close-icon"
          onClick={onClose}
        />
        <h2 className="edit-programs-popup-header">
          Edit programs
        </h2>
        <div className="edit-programs-popup-body">
          <div className="program-search-bar-container">
            <img src={searchIcon} alt="Search" className="program-search-icon" />
            <input
              type="text"
              className="program-search-input"
              placeholder="Search for programs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* TODO: Add filtered program list */}
        </div>
      </div>
    </div>
  );
};

export default EditProgramsPopup;
