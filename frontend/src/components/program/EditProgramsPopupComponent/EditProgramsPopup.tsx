import React, { useEffect, useState } from 'react';
import './EditProgramsPopup.css';
import exitIcon from '../../../assets/exit_icon.png';
import searchIcon from '../../../assets/search_icon.svg';
import saveIcon from '../../../assets/save_icon.png';
import ProgramCardList from '../ProgramCardListComponent/ProgramCardList';

interface EditProgramsPopupProps {
  onClose: () => void;
  academicYearId: number;
  schoolId: number | null;
  currentProgramIds: number[];
  onSave: (programIds: number[]) => void;
}

const EditProgramsPopup: React.FC<EditProgramsPopupProps> = ({
  onClose,
  academicYearId,
  schoolId,
  currentProgramIds,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>(currentProgramIds);

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

  // Handle program selection toggle
  const handleProgramToggle = (programId: number) => {
    setSelectedProgramIds((prev) => {
      if (prev.includes(programId)) {
        return prev.filter((id) => id !== programId);
      } else {
        return [...prev, programId];
      }
    });
  };

  // Handle clear all selections
  const handleClear = () => {
    setSelectedProgramIds([]);
  };

  // Handle save
  const handleSave = () => {
    onSave(selectedProgramIds);
    onClose();
  };

  // Check if there are changes from the current programs
  const hasChanges =
    JSON.stringify([...currentProgramIds].sort()) !==
    JSON.stringify([...selectedProgramIds].sort());

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
        <div className="edit-programs-popup-controls">
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
          {hasChanges && (
            <div className="program-changes-container">
              <span className="program-changes-text">
                {selectedProgramIds.length} {selectedProgramIds.length === 1 ? 'program' : 'programs'} selected
              </span>
              <div className="program-save-button" onClick={handleSave}>
                <span className="program-save-text">Save</span>
                <img src={saveIcon} alt="Save" className="program-save-icon" />
              </div>
            </div>
          )}
          <div className="program-clear-container">
            <button className="program-clear-button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
        <div className="edit-programs-popup-body">
          <ProgramCardList
            academicYearId={academicYearId}
            schoolId={schoolId}
            searchQuery={searchQuery}
            selectedProgramIds={selectedProgramIds}
            onProgramToggle={handleProgramToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProgramsPopup;
