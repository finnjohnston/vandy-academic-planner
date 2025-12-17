import React, { useRef, useEffect } from 'react';
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
}

const PlannedCourseOptionsMenu: React.FC<PlannedCourseOptionsMenuProps> = ({
  plannedCourseId,
  courseId,
  isOpen,
  onClose,
  onCourseDetailsClick,
  onDeleteCourseClick
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="planned-course-options-container" ref={menuRef}>
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
};

export default PlannedCourseOptionsMenu;
