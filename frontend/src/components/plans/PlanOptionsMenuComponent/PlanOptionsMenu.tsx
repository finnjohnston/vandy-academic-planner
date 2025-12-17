import React, { useState, useRef, useEffect } from 'react';
import threeDotsIcon from '../../../assets/three_dots_icon.svg';
import editIcon from '../../../assets/edit_icon.png';
import deleteIcon from '../../../assets/delete_icon.png';
import './PlanOptionsMenu.css';

interface PlanOptionsMenuProps {
  planId: number;
  onEditClick?: (planId: number) => void;
  onDeleteClick?: (planId: number) => void;
}

const PlanOptionsMenu: React.FC<PlanOptionsMenuProps> = ({
  planId,
  onEditClick,
  onDeleteClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEditClick) {
      onEditClick(planId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onDeleteClick) {
      onDeleteClick(planId);
    }
  };

  return (
    <div className="plan-options-container" ref={menuRef}>
      <img
        src={threeDotsIcon}
        alt="Options"
        className="plan-options-icon"
        onClick={handleOptionsClick}
      />

      {isMenuOpen && (
        <div className="plan-options-menu">
          <div className="plan-menu-item" onClick={handleEditClick}>
            <img src={editIcon} alt="" className="plan-menu-icon plan-edit-icon" />
            <span>Edit plan</span>
          </div>
          <div className="plan-menu-item plan-delete-menu-item" onClick={handleDeleteClick}>
            <img src={deleteIcon} alt="" className="plan-menu-icon plan-delete-icon" />
            <span className="plan-delete-text">Delete plan</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanOptionsMenu;
