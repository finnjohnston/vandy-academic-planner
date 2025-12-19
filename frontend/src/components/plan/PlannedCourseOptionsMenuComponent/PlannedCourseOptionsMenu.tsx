import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import detailsIcon from '../../../assets/details_icon.png';
import deleteIcon from '../../../assets/delete_icon.png';
import './PlannedCourseOptionsMenu.css';

interface PlannedCourseOptionsMenuProps {
  plannedCourseId: number;
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onCourseDetailsClick?: (courseId: string) => void;
  onDeleteCourseClick?: (plannedCourseId: number) => void;
  anchorElement?: HTMLElement | null;
}

const PlannedCourseOptionsMenu: React.FC<PlannedCourseOptionsMenuProps> = ({
  plannedCourseId,
  courseId,
  isOpen,
  onClose,
  onCourseDetailsClick,
  onDeleteCourseClick,
  anchorElement
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position when menu opens
  useEffect(() => {
    if (isOpen && anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen, anchorElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleCourseDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (onCourseDetailsClick) {
      onCourseDetailsClick(courseId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (onDeleteCourseClick) {
      onDeleteCourseClick(plannedCourseId);
    }
  };

  if (!isOpen) return null;

  const menu = (
    <div
      className="planned-course-options-container"
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        right: `${position.right}px`
      }}
    >
      <div className="planned-course-options-menu">
        <div className="planned-course-menu-item" onClick={handleCourseDetailsClick}>
          <img src={detailsIcon} alt="" className="planned-course-menu-icon planned-course-details-icon" />
          <span>Course details</span>
        </div>
        <div className="planned-course-menu-item planned-course-delete-menu-item" onClick={handleDeleteClick}>
          <img src={deleteIcon} alt="" className="planned-course-menu-icon planned-course-delete-icon" />
          <span>Delete course</span>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(menu, document.body);
};

export default PlannedCourseOptionsMenu;
